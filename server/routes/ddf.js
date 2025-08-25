// server/routes/ddf.js
import express from "express";
import axios from "axios";
import getAccessToken from "../utils/getAccessToken.js";

const router = express.Router();

router.get("/member/:agentKey", async (req, res) => {
  const agentKey = String(req.params.agentKey);

  if (!/^\d+$/.test(agentKey)) {
    return res.status(400).json({ error: "Invalid agentKey" });
  }

  try {
    const token = await getAccessToken();

    const response = await axios.get(
      `https://ddfapi.realtor.ca/odata/v1/Member?$filter=MemberKey eq '${agentKey}'`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        timeout: 10000,
      }
    );

    res.json(response.data.value); // Return only listing array
  } catch (error) {
    console.error("DDF Fetch Error:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to fetch properties from DDF®" });
  }
});

router.get("/openh/:listingKey", async (req, res) => {
  const listingKey = String(req.params.listingKey);

  if (!/^\d+$/.test(listingKey)) {
    return res.status(400).json({ error: "Invalid listingKey" });
  }

  try {
    const token = await getAccessToken();

    const response = await axios.get(
      `https://ddfapi.realtor.ca/odata/v1/OpenHouse?$filter=ListingKey eq '${listingKey}'`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        timeout: 10000,
      }
    );

    res.json(response.data.value); // Return only listing array
  } catch (error) {
    console.error("DDF Fetch Error:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to fetch properties from DDF®" });
  }
});
router.get("/openh", async (req, res) => {
  try {
    const token = await getAccessToken();

    const response = await axios.get(
      `https://ddfapi.realtor.ca/odata/v1/OpenHouse`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        timeout: 10000,
      }
    );

    res.json(response.data.value); // Return only listing array
  } catch (error) {
    console.error("DDF Fetch Error:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to fetch properties from DDF®" });
  }
});

router.get("/properties", async (req, res) => {
  try {
    const exclude = String(req.query.exclude || "")
      .split(",")
      .map((k) => k.trim())
      .filter((k) => /^\d+$/.test(k));
    const quick = String(req.query.quick || "").trim();
    const isQuick = quick === "1" || quick.toLowerCase() === "true";
    const token = await getAccessToken();

    const top = 100;
    let skip = 0;
    let allListings = [];
    let totalCount = 0;
    if (isQuick) {
      // Fast path: only fetch first page so UI can render immediately
      const url = `https://ddfapi.realtor.ca/odata/v1/Property?$filter=ListOfficeKey eq '61022'&$count=true&$skip=${skip}&$top=${top}`;
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 15000,
      });
      allListings = Array.isArray(response.data.value) ? response.data.value : [];
      totalCount = response.data["@odata.count"] || allListings.length;
    } else {
      // Full fetch: page through all results
      do {
        const url = `https://ddfapi.realtor.ca/odata/v1/Property?$filter=ListOfficeKey eq '61022'&$count=true&$skip=${skip}&$top=${top}`;
        const response = await axios.get(url, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          timeout: 15000,
        });
        const batch = Array.isArray(response.data.value)
          ? response.data.value
          : [];
        totalCount = response.data["@odata.count"] || totalCount;
        allListings = allListings.concat(batch);
        skip += top;
      } while (allListings.length < totalCount);
    }

    const filtered = allListings.filter(
      (item) =>
        !exclude.includes(String(item.ListingKey)) &&
        Number(item.PhotosCount ?? 0) >= 4
    );

    // const totalCount = response.data["@odata.count"];
    console.log(`Total records: ${totalCount} (returned ${filtered.length}${isQuick ? " QUICK" : ""})`);
    res.json(filtered);
  } catch (error) {
    console.error("DDF Fetch Error:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to fetch properties from DDF®" });
  }
});

// Lightweight stats endpoint to avoid paging through all listings client-side
router.get("/stats", async (_req, res) => {
  try {
    const token = await getAccessToken();
    const url = `https://ddfapi.realtor.ca/odata/v1/Property?$filter=ListOfficeKey eq '61022'&$count=true&$top=0`;
    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 10000,
    });
    const count = Number(response.data["@odata.count"] || 0);
    res.json({ propertyCount: Number.isFinite(count) ? count : 0 });
  } catch (error) {
    console.error("DDF Stats Error:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to fetch listing stats" });
  }
});

export default router;
