// server/routes/ddf.js
import express from "express";
import axios from "axios";
import getAccessToken from "../utils/getAccessToken.js";

const router = express.Router();

// Coastal Realty office keys (exclude St. Stephen NB: 283215)
const COASTAL_OFFICE_KEYS = {
  ALL: ["61022", "278419", "290689", "299834"],
  BY_CITY: {
    Surrey: ["61022", "290689"],
    Abbotsford: ["278419"],
    Langley: ["299834"],
  },
};

const buildOfficeFilter = (keys) =>
  `(${keys.map((k) => `ListOfficeKey eq '${k}'`).join(" or ")})`;

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
      const url = `https://ddfapi.realtor.ca/odata/v1/Property?$filter=${buildOfficeFilter(
        COASTAL_OFFICE_KEYS.ALL
      )}&$count=true&$skip=${skip}&$top=${top}`;
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 15000,
      });
      allListings = Array.isArray(response.data.value) ? response.data.value : [];
      totalCount = response.data["@odata.count"] || allListings.length;
    } else {
      // Full fetch: page through all results
      do {
        const url = `https://ddfapi.realtor.ca/odata/v1/Property?$filter=${buildOfficeFilter(
          COASTAL_OFFICE_KEYS.ALL
        )}&$count=true&$skip=${skip}&$top=${top}`;
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
    const url = `https://ddfapi.realtor.ca/odata/v1/Property?$filter=${buildOfficeFilter(
      COASTAL_OFFICE_KEYS.ALL
    )}&$count=true&$top=0`;
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

// Unique list of available cities (for settings UI)
router.get("/cities", async (_req, res) => {
  try {
    const token = await getAccessToken();
    const top = 100;
    let skip = 0;
    let all = [];
    let total = 0;
  do {
      const url = `https://ddfapi.realtor.ca/odata/v1/Property?$filter=${buildOfficeFilter(
        COASTAL_OFFICE_KEYS.ALL
      )}&$count=true&$skip=${skip}&$top=${top}`;
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 15000,
      });
      const batch = Array.isArray(response.data.value) ? response.data.value : [];
      total = response.data["@odata.count"] || total;
      all = all.concat(batch);
      skip += top;
    } while (all.length < total);

    const set = new Set();
    for (const it of all) {
      const city = String(it.City || "").trim();
      if (city) set.add(city);
    }
    const list = Array.from(set).sort((a, b) => a.localeCompare(b));
    res.json(list);
  } catch (error) {
    console.error("DDF Cities Error:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to fetch cities" });
  }
});

// Get a single office by OfficeKey
router.get("/office/:officeKey", async (req, res) => {
  const officeKey = String(req.params.officeKey);
  if (!/^\d+$/.test(officeKey)) {
    return res.status(400).json({ error: "Invalid officeKey" });
  }
  try {
    const token = await getAccessToken();
    const url = `https://ddfapi.realtor.ca/odata/v1/Office('${officeKey}')`;
    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 15000,
    });
    res.json(response.data);
  } catch (error) {
    console.error("DDF Office Get Error:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to fetch office from DDF®" });
  }
});
// Offices search: find Coastal Realty office keys, optionally by city
router.get("/offices/coastal", async (req, res) => {
  try {
    const token = await getAccessToken();
    const name = String(req.query.name || "Coastal Realty").trim();
    const city = String(req.query.city || "").trim();

    // OData filter; escape single quotes per OData rules
    const esc = (s) => s.replace(/'/g, "''");
    const select = [
      "OfficeKey",
      "OfficeName",
      "OfficeCity",
      "OfficeStateOrProvince",
      "OfficePhone",
      "OfficePostalCode",
      "ModificationTimestamp",
      "OriginalEntryTimestamp",
    ].join(",");

    async function query(filter) {
      const top = 100;
      let skip = 0;
      let total = 0;
      let all = [];
      do {
        const url = `https://ddfapi.realtor.ca/odata/v1/Office?$select=${select}&$filter=${encodeURIComponent(
          filter
        )}&$count=true&$skip=${skip}&$top=${top}`;
        const response = await axios.get(url, {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 15000,
        });
        const batch = Array.isArray(response.data.value) ? response.data.value : [];
        total = Number(response.data["@odata.count"] || 0) || total;
        all = all.concat(batch);
        skip += top;
      } while (all.length < total && skip < 2000);
      return all;
    }

    // Primary filter: straightforward contains on OfficeName (+ optional exact city)
    const cond = [`contains(OfficeName,'${esc(name)}')`, `OfficeStatus eq 'Active'`];
    if (city) cond.push(`OfficeCity eq '${esc(city)}'`);
    let all = await query(cond.join(" and "));

    // Fallback: AND each token (e.g., "Coastal" and "Realty") if no results
    if (all.length === 0) {
      const tokens = name.split(/\s+/).filter(Boolean);
      if (tokens.length > 1) {
        const andCond = tokens.map((t) => `contains(OfficeName,'${esc(t)}')`);
        const f = [
          ...andCond,
          `OfficeStatus eq 'Active'`,
          ...(city ? [`OfficeCity eq '${esc(city)}'`] : []),
        ].join(" and ");
        all = await query(f);
      }
    }

    // Provide a concise shape back to the client
    const mapped = all.map((o) => ({
      OfficeKey: String(o.OfficeKey || ""),
      OfficeName: o.OfficeName,
      OfficeCity: o.OfficeCity,
      OfficeStateOrProvince: o.OfficeStateOrProvince,
      OfficePhone: o.OfficePhone,
      OfficePostalCode: o.OfficePostalCode,
    }));
    res.json(mapped);
  } catch (error) {
    console.error("DDF Offices Error:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to fetch offices from DDF®" });
  }
});

// Generic offices search by name/city
router.get("/offices/search", async (req, res) => {
  try {
    const token = await getAccessToken();
    const name = String(req.query.name || "").trim();
    const city = String(req.query.city || "").trim();
    const esc = (s) => s.replace(/'/g, "''");

    const select = [
      "OfficeKey",
      "OfficeName",
      "OfficeCity",
      "OfficeStateOrProvince",
      "OfficePhone",
      "OfficePostalCode",
    ].join(",");

    const base = ["OfficeStatus eq 'Active'"];
    if (name) base.push(`contains(OfficeName,'${esc(name)}')`);
    if (city) base.push(`OfficeCity eq '${esc(city)}'`);

    const url = `https://ddfapi.realtor.ca/odata/v1/Office?$select=${select}&$filter=${encodeURIComponent(
      base.join(" and ")
    )}&$count=true&$top=100`;
    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 15000,
    });
    const items = Array.isArray(response.data.value) ? response.data.value : [];
    res.json(items);
  } catch (error) {
    console.error("DDF Offices Search Error:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to search offices from DDF®" });
  }
});

export default router;
