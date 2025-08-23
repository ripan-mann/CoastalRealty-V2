import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import SeasonalImage from "../models/SeasonalImage.js";
import AiGenAttempt from "../models/AiGenAttempt.js";
import OpenAI from "openai";
import requireAdmin from "../middleware/requireAdmin.js";

const router = express.Router();

// Resolve to server/uploads/seasonal regardless of process CWD
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// __dirname here is server/routes, so go up one to server/, then into uploads/seasonal
const uploadDir = path.join(__dirname, "..", "uploads", "seasonal");
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname) || "";
    cb(null, unique + ext);
  },
});

const fileFilter = (_req, file, cb) => {
  const mt = (file.mimetype || "").toLowerCase();
  if (!mt.startsWith("image/")) return cb(new Error("Only image uploads are allowed"));
  // Disallow SVG to avoid embedded script risk
  if (mt === "image/svg+xml") return cb(new Error("SVG images are not allowed"));
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { files: 10, fileSize: 10 * 1024 * 1024 },
});

// Stripe config (lazy-loaded to avoid hard dependency when not used)
const CLIENT_BASE = process.env.CLIENT_BASE_URL || "http://localhost:3000";

// Temporary store for generated previews awaiting payment
const previewStore = new Map(); // key -> { b64, title, createdAt }
const rateCache = new Map(); // key -> { remaining, resetInSec, ts }

// Simple in-memory rate limit: max 3 previews per 24 hours per client key
const DAY_MS = 24 * 60 * 60 * 1000;
const getClientKey = (req) => {
  const fwd = (req.headers["x-forwarded-for"] || "").toString();
  if (fwd) return fwd.split(",")[0].trim();
  return req.ip || req.connection?.remoteAddress || "unknown";
};
const toEventKey = (title) => (title || "").toString().trim().toLowerCase();
const memRateMap = new Map(); // fallback in-memory { key -> [timestamps] }
const checkAndConsumeRateMem = (clientKey, eventKey) => {
  const key = `${clientKey}|${eventKey}`;
  const now = Date.now();
  let arr = memRateMap.get(key) || [];
  arr = arr.filter((ts) => now - ts < DAY_MS);
  if (arr.length >= 3) {
    const oldest = Math.min(...arr);
    const resetInSec = Math.max(1, Math.ceil((DAY_MS - (now - oldest)) / 1000));
    return { allowed: false, remaining: 0, resetInSec };
  }
  arr.push(now);
  memRateMap.set(key, arr);
  return { allowed: true, remaining: 3 - arr.length, resetInSec: Math.ceil(DAY_MS / 1000) };
};
const checkAndConsumeRateDb = async (clientKey, eventKey) => {
  try {
    const since = new Date(Date.now() - DAY_MS);
    const count = await AiGenAttempt.countDocuments({ clientKey, eventKey, createdAt: { $gte: since } });
    if (count >= 3) {
      const oldest = await AiGenAttempt.findOne({ clientKey, eventKey, createdAt: { $gte: since } })
        .sort({ createdAt: 1 })
        .lean();
      const resetIn = oldest ? DAY_MS - (Date.now() - new Date(oldest.createdAt).getTime()) : DAY_MS;
      return { allowed: false, remaining: 0, resetInSec: Math.max(1, Math.ceil(resetIn / 1000)) };
    }
    await AiGenAttempt.create({ clientKey, eventKey });
    const remaining = Math.max(0, 3 - (count + 1));
    return { allowed: true, remaining, resetInSec: Math.ceil(DAY_MS / 1000) };
  } catch (err) {
    // Fallback to in-memory if DB unavailable
    console.warn("Rate DB error, using in-memory fallback:", err?.message || err);
    return checkAndConsumeRateMem(clientKey, eventKey);
  }
};

// List images
router.get("/images", async (req, res) => {
  try {
    // Prevent any intermediary caching of the images listing
    res.set({
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      Pragma: "no-cache",
      Expires: "0",
      "Surrogate-Control": "no-store",
    });
    const onlySelected = ["1", "true", "yes"].includes(String(req.query.selected || "").toLowerCase());
    const query = onlySelected ? { selected: true } : {};
    const items = await SeasonalImage.find(query).sort({ createdAt: -1 }).lean();
    const normalized = items.map((it) => ({ ...it, _id: String(it._id) }));
    res.json(normalized);
  } catch (err) {
    res.status(500).json({ error: "Failed to list images" });
  }
});

// Upload images (single or multiple)
router.post("/images", requireAdmin, upload.array("files", 10), async (req, res) => {
  try {
    const files = req.files || [];
    const saved = await Promise.all(
      files.map(async (f) => {
        const relPath = ["uploads", "seasonal", f.filename].join("/");
        const url = `/${relPath}`;
        return SeasonalImage.create({
          originalName: f.originalname,
          filename: f.filename,
          path: relPath,
          size: f.size,
          mimetype: f.mimetype,
          url,
          selected: false,
        });
      })
    );
    res.status(201).json(saved);
  } catch (err) {
    console.error("Upload error:", err.message);
    res.status(500).json({ error: "Failed to upload images" });
  }
});

// Delete image
router.delete("/images/:id", requireAdmin, async (req, res) => {
  try {
    const doc = await SeasonalImage.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: "Not found" });
    // Validate DB path and ensure it is under the seasonal uploads directory
    if (!doc.path || typeof doc.path !== "string" || !doc.path.startsWith("uploads/seasonal/")) {
      return res.status(400).json({ error: "Invalid path" });
    }
    const uploadsRoot = path.resolve(path.join(__dirname, "..", "uploads", "seasonal"));
    const abs = path.resolve(path.join(__dirname, "..", doc.path));
    // Ensure the resolved path lives under the seasonal uploads directory
    if (!abs.startsWith(uploadsRoot)) {
      return res.status(400).json({ error: "Invalid path" });
    }
    try {
      fs.unlinkSync(abs);
    } catch (e) {
      // ignore missing file
    }
    await SeasonalImage.deleteOne({ _id: doc._id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete image" });
  }
});

// Bulk update selection: set selected true for provided IDs, false for others
router.put("/images/selection", requireAdmin, async (req, res) => {
  try {
    const { selectedIds } = req.body || {};
    if (!Array.isArray(selectedIds)) {
      return res.status(400).json({ error: "selectedIds must be an array" });
    }
    // Normalize to strings
    const ids = selectedIds
      .map((x) => String(x))
      .filter((x) => /^[a-f\d]{24}$/.test(x)) // only ObjectId-like values
      .slice(0, 200); // hard cap batch size

    // Set all to false first
    await SeasonalImage.updateMany({}, { $set: { selected: false } });
    if (ids.length > 0) {
      await SeasonalImage.updateMany(
        { _id: { $in: ids } },
        { $set: { selected: true } }
      );
    }
    const items = await SeasonalImage.find().sort({ createdAt: -1 });
    res.json(items);
  } catch (err) {
    console.error("Selection update error:", err.message);
    res.status(500).json({ error: "Failed to update selection" });
  }
});

export default router;

// AI image generation (admin-only in production)
router.post("/generate", requireAdmin, async (req, res) => {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res
        .status(503)
        .json({ error: "Image generation disabled. Missing OPENAI_API_KEY." });
    }
    const { eventTitle } = req.body || {};
    const title =
      typeof eventTitle === "string" && eventTitle.trim().length > 0
        ? eventTitle.trim()
        : "Seasonal Event";

    const client = new OpenAI({
      apiKey,
      baseURL: process.env.OPENAI_BASE_URL || undefined,
    });
    const basePrompt =
      "Generate a high-resolution landscape image (1920x1080) for a realtor’s office lobby TV display. The image should visually represent the specified holiday or seasonal event in a professional, welcoming style. Do not include any extra text, logos, or branding. The only text allowed in the image is the name of the holiday or event.";
    const prompt = `${basePrompt}\nHoliday or Event Title: ${title}`;

    // If preview mode requested, enforce DB-backed rate limit BEFORE generating
    const isPreview = String(req.query.preview || "").toLowerCase() === "1";
    if (isPreview) {
      const clientKey = getClientKey(req);
      const rate = await checkAndConsumeRateDb(clientKey, toEventKey(title));
      if (!rate.allowed) {
        res.set({
          "X-RateLimit-Limit": "3",
          "X-RateLimit-Remaining": String(rate.remaining),
          "Retry-After": String(rate.resetInSec),
        });
        return res.status(429).json({ error: "Daily AI generation limit reached for this event.", resetInSec: rate.resetInSec });
      }

      let imageB64 = null;
      try {
        const result = await client.images.generate({
          model: process.env.OPENAI_IMAGE_MODEL || "gpt-image-1",
          prompt,
          size: "1920x1080",
          response_format: "b64_json",
        });
        imageB64 = result?.data?.[0]?.b64_json;
      } catch (primaryErr) {
        try {
          const alt = await client.images.generate({
            model: "dall-e-3",
            prompt,
            size: "1792x1024",
            response_format: "b64_json",
          });
          imageB64 = alt?.data?.[0]?.b64_json;
        } catch (fallbackErr) {
          console.error("OpenAI image error:", primaryErr?.message || primaryErr, fallbackErr?.message || fallbackErr);
          return res.status(502).json({ error: primaryErr?.response?.data?.error?.message || fallbackErr?.response?.data?.error?.message || "Failed to generate image" });
        }
      }
      if (!imageB64) return res.status(502).json({ error: "Failed to generate image" });
      return res.json({ b64: imageB64, mimetype: "image/png", title, rate: { remaining: rate.remaining, resetInSec: rate.resetInSec } });
    }

    // Otherwise, persist to disk and DB immediately
    // Generate a fresh image for persistence
    let imageB64 = null;
    try {
      const result = await client.images.generate({
        model: process.env.OPENAI_IMAGE_MODEL || "gpt-image-1",
        prompt,
        size: "1920x1080",
        response_format: "b64_json",
      });
      imageB64 = result?.data?.[0]?.b64_json;
    } catch (primaryErr) {
      try {
        const alt = await client.images.generate({
          model: "dall-e-3",
          prompt,
          size: "1792x1024",
          response_format: "b64_json",
        });
        imageB64 = alt?.data?.[0]?.b64_json;
      } catch (fallbackErr) {
        console.error("OpenAI image error (persist):", primaryErr?.message || primaryErr, fallbackErr?.message || fallbackErr);
        return res.status(502).json({ error: primaryErr?.response?.data?.error?.message || fallbackErr?.response?.data?.error?.message || "Failed to generate image" });
      }
    }
    if (!imageB64) return res.status(502).json({ error: "Failed to generate image" });
    const buf = Buffer.from(imageB64, "base64");
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const filename = `ai-${unique}.png`;
    const filePath = path.join(uploadDir, filename);
    fs.writeFileSync(filePath, buf);

    const relPath = ["uploads", "seasonal", filename].join("/");
    const url = `/${relPath}`;
    const doc = await SeasonalImage.create({
      originalName: `${title} (AI)`,
      filename,
      path: relPath,
      size: buf.length,
      mimetype: "image/png",
      url,
      selected: false,
    });

    res.status(201).json(doc);
  } catch (err) {
    console.error("AI generate error:", err?.message || err);
    res.status(500).json({ error: "Failed to generate image" });
  }
});

// Persist a preview image to disk and DB
router.post("/generate/use", requireAdmin, async (req, res) => {
  try {
    const { eventTitle, b64 } = req.body || {};
    if (!b64 || typeof b64 !== "string") {
      return res.status(400).json({ error: "Missing image data" });
    }
    const title =
      typeof eventTitle === "string" && eventTitle.trim().length > 0
        ? eventTitle.trim()
        : "Seasonal Event";
    const buf = Buffer.from(b64, "base64");
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const filename = `ai-${unique}.png`;
    const filePath = path.join(uploadDir, filename);
    fs.writeFileSync(filePath, buf);

    const relPath = ["uploads", "seasonal", filename].join("/");
    const url = `/${relPath}`;
    const doc = await SeasonalImage.create({
      originalName: `${title} (AI)`,
      filename,
      path: relPath,
      size: buf.length,
      mimetype: "image/png",
      url,
      selected: false,
    });
    res.status(201).json(doc);
  } catch (err) {
    console.error("AI use save error:", err?.message || err);
    res.status(500).json({ error: "Failed to save generated image" });
  }
});

// Create a Stripe Checkout session for a generated image preview
router.post("/payments/checkout", requireAdmin, async (req, res) => {
  try {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      return res.status(503).json({ error: "Payments disabled. Missing STRIPE_SECRET_KEY." });
    }
    const { eventTitle, b64 } = req.body || {};
    if (!b64 || typeof b64 !== "string") {
      return res.status(400).json({ error: "Missing image data" });
    }
    const title =
      typeof eventTitle === "string" && eventTitle.trim() ? eventTitle.trim() : "Seasonal Event";

    // Stash preview in memory and refer to it via tmpId
    const tmpId = Date.now() + "-" + Math.round(Math.random() * 1e9);
    previewStore.set(String(tmpId), { b64, title, createdAt: Date.now() });

    // Lazy import stripe to avoid module load failure when not installed
    const { default: Stripe } = await import("stripe");
    const stripe = new Stripe(key);
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: 500, // $5.00
            product_data: {
              name: `${title} — AI Image`,
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${CLIENT_BASE}/admin/display-settings?checkout=success&tmpId=${tmpId}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${CLIENT_BASE}/admin/display-settings?checkout=cancel`,
    });
    return res.json({ url: session.url, tmpId });
  } catch (err) {
    console.error("Stripe checkout error:", err?.message || err);
    res.status(500).json({ error: "Failed to create checkout session" });
  }
});

// Confirm payment and persist the previewed image
router.post("/generate/confirm", requireAdmin, async (req, res) => {
  try {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      return res.status(503).json({ error: "Payments disabled. Missing STRIPE_SECRET_KEY." });
    }
    const { tmpId, sessionId } = req.body || {};
    if (!tmpId || !sessionId) {
      return res.status(400).json({ error: "Missing tmpId or sessionId" });
    }
    const { default: Stripe } = await import("stripe");
    const stripe = new Stripe(key);
    const session = await stripe.checkout.sessions.retrieve(String(sessionId));
    if (!session || session.payment_status !== "paid") {
      return res.status(402).json({ error: "Payment not completed" });
    }
    const item = previewStore.get(String(tmpId));
    if (!item) return res.status(410).json({ error: "Preview expired" });
    // Prevent duplicate saves from double-calls (e.g., React StrictMode)
    previewStore.delete(String(tmpId));

    const { b64, title } = item;
    const buf = Buffer.from(b64, "base64");
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const filename = `ai-${unique}.png`;
    const filePath = path.join(uploadDir, filename);
    fs.writeFileSync(filePath, buf);

    const relPath = ["uploads", "seasonal", filename].join("/");
    const url = `/${relPath}`;
    const doc = await SeasonalImage.create({
      originalName: `${title} (AI)`,
      filename,
      path: relPath,
      size: buf.length,
      mimetype: "image/png",
      url,
      selected: false,
    });

    previewStore.delete(String(tmpId));
    res.status(201).json(doc);
  } catch (err) {
    console.error("Generate confirm error:", err?.message || err);
    res.status(500).json({ error: "Failed to confirm and save image" });
  }
});

// Query remaining generation attempts for current client
router.get("/rate", async (req, res) => {
  try {
    const clientKey = getClientKey(req);
    const title = (req.query.eventTitle || "").toString();
    const eventKey = toEventKey(title);
    const cacheKey = `${clientKey}|${eventKey}`;
    const now = Date.now();
    const cached = rateCache.get(cacheKey);
    if (cached && now - cached.ts < 60 * 1000) {
      return res.json({ remaining: cached.remaining, resetInSec: cached.resetInSec });
    }
    // Try DB first; if it fails, compute from in-memory
    let remaining = 3;
    let resetInSec = Math.ceil(DAY_MS / 1000);
    try {
      const since = new Date(Date.now() - DAY_MS);
      const attempts = await AiGenAttempt.find({ clientKey, eventKey, createdAt: { $gte: since } })
        .sort({ createdAt: 1 })
        .lean();
      const count = attempts.length;
      remaining = Math.max(0, 3 - count);
      if (attempts[0]) {
        resetInSec = Math.max(1, Math.ceil((DAY_MS - (Date.now() - new Date(attempts[0].createdAt).getTime())) / 1000));
      }
    } catch (err) {
      const key = `${clientKey}|${eventKey}`;
      const arr = (memRateMap.get(key) || []).filter((ts) => Date.now() - ts < DAY_MS);
      remaining = Math.max(0, 3 - arr.length);
      if (arr.length > 0) {
        const oldest = Math.min(...arr);
        resetInSec = Math.max(1, Math.ceil((DAY_MS - (Date.now() - oldest)) / 1000));
      }
    }
    rateCache.set(cacheKey, { remaining, resetInSec, ts: now });
    res.json({ remaining, resetInSec });
  } catch (e) {
    console.error("Rate query error:", e?.message || e);
    res.status(500).json({ error: "Failed to get rate info" });
  }
});
