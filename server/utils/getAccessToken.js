import axios from "axios";

let cachedToken = null;
let tokenExpiry = null;

const getAccessToken = async () => {
  // Use cached token if still valid
  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  if (!process.env.CREA_CLIENT_ID || !process.env.CREA_CLIENT_SECRET || !process.env.CREA_GRANT_TYPE || !process.env.CREA_SCOPE) {
    throw new Error("Missing CREA API credentials in environment");
  }

  const response = await axios.post(
    "https://identity.crea.ca/connect/token",
    new URLSearchParams({
      client_id: process.env.CREA_CLIENT_ID,
      client_secret: process.env.CREA_CLIENT_SECRET,
      grant_type: process.env.CREA_GRANT_TYPE,
      scope: process.env.CREA_SCOPE,
    }),
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      timeout: 10000,
    }
  );

  const { access_token, expires_in } = response.data;
  cachedToken = access_token;
  tokenExpiry = Date.now() + expires_in * 1000;

  return access_token;
};

export default getAccessToken;
