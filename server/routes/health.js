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

  res.json({
    status: 'ok',
    now: new Date().toISOString(),
    uptimeSec: Math.round((process.uptime && process.uptime()) || 0),
    startedAt: startedAt ? new Date(startedAt).toISOString() : null,
    env: (process.env.NODE_ENV || 'development'),
    db: { connected: dbConnected, state: dbState },
    cloudinary: { configured: cl, ping: clPing },
    seasonal: { count: seasonalCount },
  });
});

export default router;
