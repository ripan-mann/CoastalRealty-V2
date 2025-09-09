import express from "express";
import multer from "multer";
import SeasonalImage from "../models/SeasonalImage.js";
import {
  getCloudinary,
  uploadBufferToCloudinary,
  deleteFromCloudinary,
} from "../utils/cloudinary.js";
import requireAdmin from "../middleware/requireAdmin.js";

const router = express.Router();

// Use memory storage because files are uploaded to Cloudinary
const storage = multer.memoryStorage();

const fileFilter = (_req, file, cb) => {
  const mt = (file.mimetype || "").toLowerCase();
  if (!mt.startsWith("image/"))
    return cb(new Error("Only image uploads are allowed"));
  // Disallow SVG to avoid embedded script risk
  if (mt === "image/svg+xml")
    return cb(new Error("SVG images are not allowed"));
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { files: 10, fileSize: 10 * 1024 * 1024 },
});

// AI generation and payment functionality removed — only uploads remain.

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
    const onlySelected = ["1", "true", "yes"].includes(
      String(req.query.selected || "").toLowerCase()
    );
    const query = onlySelected ? { selected: true } : {};
    const items = await SeasonalImage.find(query)
      .sort({ createdAt: -1 })
      .lean();
    const normalized = items.map((it) => ({ ...it, _id: String(it._id) }));
    res.json(normalized);
  } catch (err) {
    res.status(500).json({ error: "Failed to list images" });
  }
});

// Upload images (single or multiple) to Cloudinary
router.post(
  "/images",
  requireAdmin,
  upload.array("files", 10),
  async (req, res) => {
    try {
      const files = req.files || [];
      const cl = getCloudinary();
      if (!cl) {
        return res
          .status(503)
          .json({ error: "Cloudinary not configured on server" });
      }
      const saved = [];
      for (const f of files) {
        const buf = f.buffer;
        const up = await uploadBufferToCloudinary(
          buf,
          f.originalname || undefined
        );
        const doc = await SeasonalImage.create({
          originalName: f.originalname,
          filename: up.public_id,
          path: up.public_id,
          size: f.size,
          mimetype: f.mimetype,
          url: up.secure_url,
          selected: false,
          provider: "cloudinary",
          cloudinaryPublicId: up.public_id,
        });
        saved.push(doc);
      }
      res.status(201).json(saved);
    } catch (err) {
      const msg = err?.message || String(err);
      console.error("Upload error:", msg);
      const body =
        (process.env.NODE_ENV || "development") === "production"
          ? { error: "Failed to upload images" }
          : { error: `Failed to upload images: ${msg}` };
      res.status(500).json(body);
    }
  }
);

// Delete image (Cloudinary only)
router.delete("/images/:id", requireAdmin, async (req, res) => {
  try {
    const doc = await SeasonalImage.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: "Not found" });
    if (doc.cloudinaryPublicId) {
      try {
        await deleteFromCloudinary(doc.cloudinaryPublicId);
      } catch (_) {}
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

// AI generation endpoints removed

// Create a Stripe Checkout session for a generated image preview
// Payments endpoint removed

// Payment confirmation endpoint removed

// Query remaining generation attempts for current client
// Rate endpoint removed

// Utility: check if a Cloudinary resource exists
async function cloudinaryExists(publicId) {
  try {
    const c = getCloudinary();
    if (!c || !c.api) return false;
    await c.api.resource(publicId);
    return true;
  } catch (_) {
    return false;
  }
}

// Admin: verify existence of seasonal images on Cloudinary
router.get("/images/verify", requireAdmin, async (req, res) => {
  try {
    const limit = Math.max(1, Math.min(500, Number(req.query.limit) || 100));
    const items = await SeasonalImage.find({})
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    const out = [];
    let present = 0;
    let missing = 0;
    for (const it of items) {
      const pub = it.cloudinaryPublicId;
      if (pub) {
        const ok = await cloudinaryExists(pub);
        if (ok) present++; else missing++;
        out.push({ _id: String(it._id), cloudinaryPublicId: pub, exists: ok, url: it.url });
      } else {
        out.push({ _id: String(it._id), cloudinaryPublicId: null, exists: null, url: it.url });
      }
    }
    res.json({ checked: items.length, present, missing, items: out });
  } catch (e) {
    res.status(500).json({ error: "Failed to verify images" });
  }
});

// Admin: prune DB records whose Cloudinary asset is missing
router.post("/images/prune-missing", requireAdmin, async (req, res) => {
  try {
    const limit = Math.max(1, Math.min(500, Number(req.body?.limit) || 200));
    const items = await SeasonalImage.find({})
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    let deleted = 0;
    let missing = 0;
    let present = 0;
    for (const it of items) {
      if (it.cloudinaryPublicId) {
        const ok = await cloudinaryExists(it.cloudinaryPublicId);
        if (ok) {
          present++;
        } else {
          missing++;
          await SeasonalImage.deleteOne({ _id: it._id });
          deleted++;
        }
      }
    }
    res.json({ checked: items.length, present, missing, deleted });
  } catch (e) {
    res.status(500).json({ error: "Failed to prune images" });
  }
});
