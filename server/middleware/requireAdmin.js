import crypto from "crypto";

/**
 * Enforces an admin API token via the `x-admin-token` header.
 * - When NODE_ENV=production, the token is required if ADMIN_API_TOKEN is set.
 * - In non-production, it is a no-op to not block local dev.
 */
export default function requireAdmin(req, res, next) {
  const isProd = String(process.env.NODE_ENV || "development").toLowerCase() === "production";
  const expected = process.env.ADMIN_API_TOKEN || "";

  if (!isProd || !expected) return next();

  const provided = (req.headers["x-admin-token"] || req.get?.("x-admin-token") || "").toString();
  try {
    const a = Buffer.from(expected);
    const b = Buffer.from(provided);
    if (a.length !== b.length) return res.status(401).json({ error: "Unauthorized" });
    if (!crypto.timingSafeEqual(a, b)) return res.status(401).json({ error: "Unauthorized" });
    return next();
  } catch {
    return res.status(401).json({ error: "Unauthorized" });
  }
}

