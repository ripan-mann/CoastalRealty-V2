// Central API base URL for production builds served from a different origin.
// Prefer REACT_APP_API_BASE_URL, fall back to REACT_APP_BASE_URL, else empty (relative).
const API_BASE = (process.env.REACT_APP_API_BASE_URL || process.env.REACT_APP_BASE_URL || '').replace(/\/$/, '');

export { API_BASE };

