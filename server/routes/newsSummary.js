import express from "express";
import OpenAI from "openai";

const router = express.Router();

// Very simple in-memory cache to avoid repeated calls for the same title
// Keyed by `${title}::${count}` with a TTL to keep memory bounded.
const summaryCache = new Map(); // key -> { text, ts }
const CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours
function getCachedSummary(title, count) {
  const key = `${title}::${count}`;
  const entry = summaryCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL_MS) {
    summaryCache.delete(key);
    return null;
  }
  return entry.text;
}
function setCachedSummary(title, count, text) {
  const key = `${title}::${count}`;
  summaryCache.set(key, { text, ts: Date.now() });
}

router.post("/", async (req, res) => {
  let { title, sentences } = req.body || {};
  if (!title) {
    return res.status(400).json({ error: "Title is required" });
  }
  // Sanitize and bound the input used in the prompt
  title = String(title)
    .replace(/[\r\n\t]+/g, " ")
    .slice(0, 200);
  let count = Number(sentences);
  if (!Number.isFinite(count)) count = 2;
  count = Math.max(1, Math.min(2, Math.floor(count)));

  try {
    // Short-circuit if we have it cached
    const cached = getCachedSummary(title, count);
    if (cached) return res.json({ description: cached });

    const openaiKey = (process.env.OPENAI_API_KEY || "").trim();
    const groqKey = (process.env.GROQ_API_KEY || "").trim();
    // Prefer Groq when available
    const usingGroq = !!groqKey;
    const apiKey = usingGroq ? groqKey : openaiKey;
    if (!apiKey) {
      return res.status(503).json({
        error: "No AI provider configured",
        hint: "Set GROQ_API_KEY (recommended) or OPENAI_API_KEY in server/.env",
      });
    }
    const envModel = usingGroq
      ? (process.env.GROQ_MODEL || "").trim()
      : (process.env.OPENAI_MODEL || "").trim();
    const models = usingGroq
      ? [
          envModel,
          "llama-3.1-8b-instant",
          "llama-3.1-70b-versatile",
          "llama3-8b-8192",
          "llama3-70b-8192",
        ].filter(Boolean)
      : [
          envModel,
          "gpt-4o-mini",
          "gpt-4o",
          "o3-mini",
          "gpt-4o-mini-2024-07-18",
        ].filter(Boolean);
    const openai = new OpenAI({
      apiKey,
      baseURL:
        (
          process.env.OPENAI_BASE_URL ||
          process.env.GROQ_BASE_URL ||
          ""
        ).trim() || (usingGroq ? "https://api.groq.com/openai/v1" : undefined),
      organization: process.env.OPENAI_ORG || undefined,
      project: process.env.OPENAI_PROJECT || undefined,
    });
    const prompt = `Write a concise ${count}-sentence summary for this news headline: "${title}"`;

    let description = "";
    let lastErr = null;
    for (const model of models) {
      try {
        const completion = await openai.chat.completions.create({
          model,
          messages: [{ role: "user", content: prompt }],
          max_tokens: 160,
          temperature: 0.7,
        });
        description = completion.choices?.[0]?.message?.content?.trim() || "";
        if (description) {
          setCachedSummary(title, count, description);
          break;
        }
      } catch (e) {
        lastErr = e;
        // If the model is unknown/retired or unauthorized, try next
        const msg = String(e?.message || "").toLowerCase();
        const status = e?.status || e?.code || 0;
        const isModelIssue =
          msg.includes("model") ||
          msg.includes("does not exist") ||
          msg.includes("unknown") ||
          status === 404;
        if (!isModelIssue) {
          // Non-model issue: break and report
          break;
        }
      }
    }
    if (!description) {
      // Graceful fallback on failure: return a simple readable line instead of 500
      const fallback =
        count > 1
          ? `Top story: ${title}. See the full article for details.`
          : `${title}.`;
      setCachedSummary(title, count, fallback);
      return res.json({ description: fallback });
    }

    res.json({ description });
  } catch (error) {
    console.error(
      "News summary generation error:",
      error?.response?.data || {
        status: error?.status,
        code: error?.code,
        message: error?.message,
      }
    );
    // Differentiate configuration vs API/service errors where possible
    const msg = String(error?.message || "").toLowerCase();
    const isQuota =
      error?.status === 429 ||
      msg.includes("quota") ||
      msg.includes("rate") ||
      msg.includes("limit");
    const status =
      msg.includes("api key") || msg.includes("unauthorized")
        ? 503
        : isQuota
        ? 429
        : 500;
    const payload = { error: "Failed to generate summary" };
    if ((process.env.NODE_ENV || "development") !== "production") {
      payload.details = error?.message || "";
    }
    res.status(status).json(payload);
  }
});

export default router;
// Simple health endpoint to surface AI config/connectivity issues
router.get("/health", async (_req, res) => {
  try {
    const openaiKey = (process.env.OPENAI_API_KEY || "").trim();
    const groqKey = (process.env.GROQ_API_KEY || "").trim();
    const usingGroq = !!groqKey;
    const apiKey = usingGroq ? groqKey : openaiKey;
    if (!apiKey)
      return res.status(503).json({ ok: false, reason: "missing_api_key" });
    const openai = new OpenAI({
      apiKey,
      baseURL:
        (
          process.env.OPENAI_BASE_URL ||
          process.env.GROQ_BASE_URL ||
          ""
        ).trim() || (usingGroq ? "https://api.groq.com/openai/v1" : undefined),
      organization: process.env.OPENAI_ORG || undefined,
      project: process.env.OPENAI_PROJECT || undefined,
    });
    const model = usingGroq
      ? (process.env.GROQ_MODEL || "llama-3.1-8b-instant").trim()
      : (process.env.OPENAI_MODEL || "gpt-4o-mini").trim();
    // Minimal ping: tiny completion to validate model access
    await openai.chat.completions.create({
      model,
      messages: [{ role: "user", content: "ping" }],
      max_tokens: 1,
      temperature: 0,
    });
    res.json({ ok: true, provider: usingGroq ? "groq" : "openai", model });
  } catch (e) {
    res.status(500).json({ ok: false, message: e?.message || String(e) });
  }
});
