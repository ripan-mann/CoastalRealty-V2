import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import ddfRoutes from "./routes/ddf.js";
import newsRoutes from "./routes/news.js";
import newsSummaryRoutes from "./routes/newsSummary.js";
import settingsRoutes from "./routes/settings.js";
import holidaysRoutes from "./routes/holidays.js";
import path from "path";
import { fileURLToPath } from "url";
import rateLimit from "express-rate-limit";
import requireAdmin from "./middleware/requireAdmin.js";

// CONFIGURATION
dotenv.config();
const app = express();
// Trust proxy if deployed behind one (configurable)
if (String(process.env.TRUST_PROXY || "").toLowerCase() === "true") {
  app.set("trust proxy", 1);
}

// Replace default parsers with higher limits to handle base64 payloads
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: false, limit: "50mb" }));
app.use(compression());
// Basic rate limit to protect server from abuse
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 300, standardHeaders: true, legacyHeaders: false });
app.use(limiter);
app.use(helmet());
// Enable HSTS in production behind HTTPS
if ((process.env.NODE_ENV || "development").toLowerCase() === "production") {
  app.use(
    helmet.hsts({
      maxAge: 15552000, // 180 days
      includeSubDomains: true,
      preload: false,
    })
  );
}
app.use(helmet.crossOriginResourcePolicy({ policy: "cross-origin" }));
app.use(morgan("common"));
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',').map((s) => s.trim()).filter(Boolean);
const isDev = (process.env.NODE_ENV || 'development') !== 'production';
app.use(cors({
  origin: function (origin, callback) {
    try {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      if (isDev) {
        try {
          const u = new URL(origin);
          const host = (u.hostname || '').toLowerCase();
          if (host === 'localhost' || host === '127.0.0.1' || host === '[::1]') {
            return callback(null, true);
          }
        } catch (_) {}
      }
      return callback(new Error('CORS not allowed for this origin.'));
    } catch (e) {
      return callback(new Error('CORS check failed.'));
    }
  },
  credentials: true,
}));

/*Routes*/
app.use("/api/ddf", ddfRoutes); /*ddf*/
app.use("/api/news", newsRoutes); /*news*/
app.use("/api/news-summary", newsSummaryRoutes); /*news summary*/
app.use("/api/settings", settingsRoutes); /*display settings*/
app.use("/api/holidays", holidaysRoutes); /*holidays*/
/* seasonal uploads */
try {
  const { default: seasonalRoutes } = await import("./routes/seasonal.js");
  app.use("/api/seasonal", seasonalRoutes);
} catch (e) {
  console.warn(
    "Seasonal routes disabled (missing dependency?):",
    e?.message || e
  );
  // Fallback stub routes so client doesn't 404
  const fallback = express.Router();
  fallback.get("/images", (_req, res) => res.json([]));
  fallback.post("/images", (_req, res) =>
    res
      .status(503)
      .json({ error: "Uploads disabled. Install 'multer' on the server." })
  );
  fallback.delete("/images/:id", (_req, res) =>
    res
      .status(503)
      .json({ error: "Uploads disabled. Install 'multer' on the server." })
  );
  app.use("/api/seasonal", fallback);
}
// Serve uploaded files from server/uploads irrespective of CWD
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads"), {
    dotfiles: "deny",
    fallthrough: true,
    immutable: true,
    maxAge: "1h",
  })
);

/*Mongoose Setup*/
const PORT = process.env.PORT || 5501; // Uses port from .env, defaults to 5501
if (!process.env.MONGO_URL) {
  console.warn(
    "MONGO_URL is not set. Set it in server/.env to enable database features."
  );
}
// Only warn if admin protection is explicitly required
if (
  String(process.env.ADMIN_API_TOKEN_REQUIRED || "").toLowerCase() === "true" &&
  !process.env.ADMIN_API_TOKEN
) {
  console.warn("ADMIN_API_TOKEN_REQUIRED is true but ADMIN_API_TOKEN is not set.");
}
mongoose
  .connect(process.env.MONGO_URL)
  .then(() => {
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
    // ONLY ADD DATA ONE TIME
    // User.insertMany(dataUser);
  })
  .catch((error) => {
    console.error("Mongo connection error:", error?.message || error);
    console.error(
      "If using Atlas, ensure your current IP is whitelisted or use 0.0.0.0/0 for testing. Also verify MONGO_URL in server/.env."
    );
  });
