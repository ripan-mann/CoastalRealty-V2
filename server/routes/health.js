import express from 'express';
import mongoose from 'mongoose';
import SeasonalImage from '../models/SeasonalImage.js';
import { getCloudinary } from '../utils/cloudinary.js';

const router = express.Router();

router.get('/', async (req, res) => {
  const startedAt = process.uptime ? (Date.now() - Math.floor(process.uptime() * 1000)) : null;
  const dbState = mongoose.connection?.readyState;
  const dbConnected = dbState === 1; // 1 = connected
  let seasonalCount = null;
  try {
    seasonalCount = await SeasonalImage.estimatedDocumentCount();
  } catch (_) {}
  const cl = !!getCloudinary();
  let clPing = null;
  try {
    const c = getCloudinary();
    if (c && c.api && typeof c.api.ping === 'function') {
      const resp = await c.api.ping();
      clPing = resp?.status === 'ok';
    }
  } catch (_) {
    clPing = false;
  }

  // Optional: verify a small sample of Cloudinary resources exist
  let seasonalVerify = null;
  const doVerify = String(req.query.verify || '').toLowerCase() === '1';
  if (doVerify) {
    try {
      const limit = Math.max(1, Math.min(50, Number(req.query.limit) || 10));
      const list = await SeasonalImage.find({ cloudinaryPublicId: { $exists: true, $ne: null } })
        .sort({ createdAt: -1 })
        .limit(limit)
        .select({ cloudinaryPublicId: 1 })
        .lean();
      const c = getCloudinary();
      let present = 0;
      let missing = 0;
      if (c && c.api && list.length > 0) {
        for (const it of list) {
          try {
            await c.api.resource(it.cloudinaryPublicId);
            present++;
          } catch (_) {
            missing++;
          }
        }
      }
      seasonalVerify = { checked: list.length, present, missing };
    } catch (e) {
      seasonalVerify = { error: 'verification_failed' };
    }
  }

  res.json({
    status: 'ok',
    now: new Date().toISOString(),
    uptimeSec: Math.round((process.uptime && process.uptime()) || 0),
    startedAt: startedAt ? new Date(startedAt).toISOString() : null,
    env: (process.env.NODE_ENV || 'development'),
    db: { connected: dbConnected, state: dbState },
    cloudinary: { configured: cl, ping: clPing },
    seasonal: { count: seasonalCount },
    seasonalVerify,
  });
});

export default router;
