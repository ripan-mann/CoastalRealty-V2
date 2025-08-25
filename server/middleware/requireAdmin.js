import crypto from "crypto";

/**
 * Optional admin protection via `x-admin-token` header.
 * - Only enforced when ADMIN_API_TOKEN_REQUIRED=true.
 * - Otherwise, it's a no-op so routes stay open.
 */
export default function requireAdmin(req, res, next) {
  const required = String(process.env.ADMIN_API_TOKEN_REQUIRED || "").toLowerCase() === "true";
  if (!required) return next();

  const expected = process.env.ADMIN_API_TOKEN || "";
  if (!expected) {
    return res.status(503).json({ error: "Admin token required but not configured" });
  }

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
