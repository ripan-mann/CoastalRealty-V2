import express from "express";
import Holidays from "date-holidays";

const router = express.Router();

// Simple in-memory cache: key -> { ts, data }
const cache = new Map();
const TTL = 6 * 60 * 60 * 1000; // 6 hours

const normalizeRegion = (r) => (r || "").toString().trim();

router.get("/list", async (req, res) => {
  try {
    const year = Number(req.query.year) || new Date().getFullYear();
    // regions can be comma-separated like: CA,CA-BC
    const regionsParam = req.query.regions || "CA,CA-BC";
    const regions = regionsParam
      .toString()
      .split(",")
      .map((s) => normalizeRegion(s))
      .filter(Boolean);

    const cacheKey = `${year}|${regions.sort().join(";")}`;
    const now = Date.now();
    const cached = cache.get(cacheKey);
    if (cached && now - cached.ts < TTL) {
      return res.json(cached.data);
    }

    const results = [];
    const seen = new Set();
    for (const reg of regions) {
      const [country, state] = reg.split("-");
      const hd = new Holidays(country || "CA", state || undefined);
      const list = hd.getHolidays(year) || [];
      for (const h of list) {
        // Only include public and observed holidays
        const types = Array.isArray(h.type) ? h.type : [h.type].filter(Boolean);
        const include = types.some((t) => ["public", "bank", "observance", "optional"].includes(t));
        if (!include) continue;
        const key = `${h.date}|${h.name}`;
        if (seen.has(key)) continue;
        seen.add(key);
        results.push({
          date: h.date, // ISO string
          name: h.name,
          country: country || "CA",
          region: state || null,
          types,
        });
      }
    }

    // Sort by date
    results.sort((a, b) => new Date(a.date) - new Date(b.date));
    cache.set(cacheKey, { ts: now, data: results });
    res.json(results);
  } catch (e) {
    console.error("Holidays list error:", e?.message || e);
    res.status(500).json({ error: "Failed to get holidays" });
  }
});

export default router;
