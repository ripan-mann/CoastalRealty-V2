import { v2 as cloudinarySdk } from 'cloudinary';

function configureFromEnv() {
  // Prefer CLOUDINARY_URL if provided; else use individual vars
  const url = process.env.CLOUDINARY_URL;
  if (url) {
    try {
      const u = new URL(url.trim());
      const cloud_name = u.hostname;
      const api_key = decodeURIComponent(u.username || '');
      const api_secret = decodeURIComponent(u.password || '');
      if (cloud_name && api_key && api_secret) {
        cloudinarySdk.config({ cloud_name, api_key, api_secret, secure: true });
        return cloudinarySdk;
      }
    } catch (_) {
      // Fallback: rely on env var parsing inside SDK
      cloudinarySdk.config({ secure: true });
      return cloudinarySdk;
    }
  }
  const cloud_name = process.env.CLOUDINARY_CLOUD_NAME;
  const api_key = process.env.CLOUDINARY_API_KEY;
  const api_secret = process.env.CLOUDINARY_API_SECRET;
  if (cloud_name && api_key && api_secret) {
    cloudinarySdk.config({ cloud_name, api_key, api_secret });
    return cloudinarySdk;
  }
  return null;
}

export function getCloudinary() {
  try {
    const c = configureFromEnv();
    return c;
  } catch (e) {
    return null;
  }
}

export async function uploadBufferToCloudinary(buffer, filename) {
  const cl = getCloudinary();
  if (!cl) throw new Error('Cloudinary not configured');
  const folder = process.env.CLOUDINARY_FOLDER || 'coastalrealty/seasonal';
  return new Promise((resolve, reject) => {
    const stream = cl.uploader.upload_stream(
      { folder, resource_type: 'image', public_id: undefined, use_filename: true, unique_filename: true, overwrite: false },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    stream.end(buffer);
  });
}

export async function deleteFromCloudinary(publicId) {
  const cl = getCloudinary();
  if (!cl) throw new Error('Cloudinary not configured');
  return cl.uploader.destroy(publicId, { resource_type: 'image' });
}
