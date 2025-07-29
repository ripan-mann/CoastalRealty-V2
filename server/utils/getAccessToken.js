import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

let cachedToken = null;
let tokenExpiry = null;

const getAccessToken = async () => {
  // Use cached token if still valid
  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken;
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
    }
  );

  const { access_token, expires_in } = response.data;
  cachedToken = access_token;
  tokenExpiry = Date.now() + expires_in * 1000;

  return access_token;
};

export default getAccessToken;
