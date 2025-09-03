export const normalizeUrl = (url) => {
  if (!url) return '';
  return url.startsWith('http') ? url : `https://${url}`;
};

export const isResolvableUrl = (url) => {
  if (!url) return false;
  try {
    const { hostname } = new URL(normalizeUrl(url));
    return hostname !== 'listings.a5realestate.ca';
  } catch {
    return false;
  }
};
