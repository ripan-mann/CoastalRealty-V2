// Optional admin gate for mutating routes.
// If ADMIN_API_TOKEN_REQUIRED is not 'true', this middleware is a no-op.
// If required, it checks 'x-admin-token' or 'Authorization: Bearer <token>'
// against ADMIN_API_TOKEN and returns 401 on mismatch.
export default function requireAdmin(req, res, next) {
  const required = String(process.env.ADMIN_API_TOKEN_REQUIRED || '').toLowerCase() === 'true';
  if (!required) return next();

  const configured = process.env.ADMIN_API_TOKEN;
  if (!configured) {
    return res.status(500).json({ error: 'Admin token not configured' });
  }

  const headerToken = req.headers['x-admin-token'];
  const auth = (req.headers['authorization'] || '').toString();
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  const token = String(headerToken || bearer || '');

  if (token && token === configured) return next();
  return res.status(401).json({ error: 'Unauthorized' });
}

