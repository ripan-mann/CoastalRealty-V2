import express from "express";
import DisplaySettings from "../models/DisplaySettings.js";
import requireAdmin from "../middleware/requireAdmin.js";

const router = express.Router();

const getOrCreateSettings = async () => {
  let doc = await DisplaySettings.findOne();
  if (!doc) {
    doc = await DisplaySettings.create({});
  }
  return doc;
};

router.get("/display", async (_req, res) => {
  try {
    const doc = await getOrCreateSettings();
    res.json({
      listingSwitchMs: doc.listingSwitchMs,
      photoRotateMs: doc.photoRotateMs,
      uploadedRotateMs: doc.uploadedRotateMs,
      uploadedDisplayMs: doc.uploadedDisplayMs,
      openHouseDisplayMs: doc.openHouseDisplayMs,
      selectedCities: Array.isArray(doc.selectedCities) ? doc.selectedCities : [],
      newsRotateMs: doc.newsRotateMs,
      updatedAt: doc.updatedAt,
    });
  } catch (err) {
    console.error("Settings GET error:", err.message);
    res.status(500).json({ error: "Failed to get display settings" });
  }
});

router.put("/display", requireAdmin, async (req, res) => {
  try {
    let { listingSwitchMs, photoRotateMs, uploadedRotateMs, uploadedDisplayMs, openHouseDisplayMs, newsRotateMs, selectedCities } = req.body || {};

    const sanitize = (v, min) => {
      const n = Number(v);
      return Number.isFinite(n) && n >= min ? Math.floor(n) : undefined;
    };
    const update = {};
    const ls = sanitize(listingSwitchMs, 1000);
    const pr = sanitize(photoRotateMs, 500);
    const ur = sanitize(uploadedRotateMs, 500);
    const ud = sanitize(uploadedDisplayMs, 500);
    const oh = sanitize(openHouseDisplayMs, 500);
    const nr = sanitize(newsRotateMs, 1000);
    // Sanitize city list
    const cityList = Array.isArray(selectedCities)
      ? Array.from(
          new Set(
            selectedCities
              .map((s) => (typeof s === "string" ? s.trim() : ""))
              .filter(Boolean)
          )
        ).slice(0, 100)
      : undefined;
    if (ls !== undefined) update.listingSwitchMs = ls;
    if (pr !== undefined) update.photoRotateMs = pr;
    if (ur !== undefined) update.uploadedRotateMs = ur;
    if (ud !== undefined) update.uploadedDisplayMs = ud;
    if (oh !== undefined) update.openHouseDisplayMs = oh;
    if (nr !== undefined) update.newsRotateMs = nr;
    if (cityList !== undefined) update.selectedCities = cityList;

    const doc = await DisplaySettings.findOneAndUpdate({}, update, {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    });
    res.json({
      listingSwitchMs: doc.listingSwitchMs,
      photoRotateMs: doc.photoRotateMs,
      uploadedRotateMs: doc.uploadedRotateMs,
      uploadedDisplayMs: doc.uploadedDisplayMs,
      openHouseDisplayMs: doc.openHouseDisplayMs,
      selectedCities: Array.isArray(doc.selectedCities) ? doc.selectedCities : [],
      newsRotateMs: doc.newsRotateMs,
      updatedAt: doc.updatedAt,
    });
  } catch (err) {
    console.error("Settings PUT error:", err.message);
    res.status(500).json({ error: "Failed to update display settings" });
  }
});

export default router;
