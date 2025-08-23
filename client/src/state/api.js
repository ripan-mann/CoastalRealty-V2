import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import axios from "axios";

export const api = createApi({
  baseQuery: fetchBaseQuery({
    baseUrl: process.env.REACT_APP_BASE_URL,
  }),
  reducerPath: "adminApi",
  tagTypes: ["User"],
  endpoints: (build) => ({
    // getUser: build.query({
    //   query: (id) => `general/user/${id}`,
    //   providesTags: ["User"],
    // }),
  }),
});

// export const { useGetUserQuery } = api;

export const getProperties = async (excludeKeys = []) => {
  const query =
    Array.isArray(excludeKeys) && excludeKeys.length > 0
      ? `?exclude=${excludeKeys.join(",")}`
      : "";
  const response = await axios.get(`/api/ddf/properties${query}`);
  const allListings = response.data || [];

  // const excludedTypes = ["Industrial", "Retail", "Vacant Land"];
  const deduped = [];
  const seen = new Set();
  for (const listing of allListings) {
    const key = String(listing.ListingKey);
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(listing);
    }
  }

  const excludedSubTypes = ["Business", "Industrial", "Retail", "Vacant Land"];

  return deduped
    .filter((listing) => !excludedSubTypes.includes(listing.PropertySubType))
    .filter((listing) => Number(listing.PhotosCount ?? 0) >= 4)
    .sort(
      (a, b) =>
        new Date(b.OriginalEntryTimestamp) - new Date(a.OriginalEntryTimestamp)
    );
};

export const getMemberByAgentKey = async (agentKey) => {
  try {
    const response = await axios.get(`/api/ddf/member/${agentKey}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching member:", error);
    throw error;
  }
};
export const getOpenHouseByListingKey = async (listingKey) => {
  try {
    const response = await axios.get(`/api/ddf/openh/${listingKey}`);
    const data = response.data || [];
    return data.length > 0 ? data : "no open house available";
  } catch (error) {
    console.error("Error fetching Open. House Listing:", error);
    throw error;
  }
};

// Display settings API
export const getDisplaySettings = async () => {
  const res = await axios.get(`/api/settings/display`);
  return res.data;
};

export const updateDisplaySettings = async (payload) => {
  const res = await axios.put(`/api/settings/display`, payload);
  return res.data;
};

// Seasonal images + suggestions
export const listSeasonalImages = async (selectedOnly = false) => {
  // Add a timestamp to avoid any intermediary caching when navigating between routes
  const res = await axios.get(`/api/seasonal/images`, { params: { t: Date.now(), selected: selectedOnly ? 1 : undefined } });
  return res.data;
};

export const getAiGenRate = async (eventTitle) => {
  const res = await axios.get(`/api/seasonal/rate`, { params: { t: Date.now(), eventTitle } });
  return res.data; // { remaining, resetInSec }
};

export const uploadSeasonalImages = async (files) => {
  const form = new FormData();
  [...files].forEach((f) => form.append("files", f));
  const res = await axios.post(`/api/seasonal/images`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
};

export const deleteSeasonalImage = async (id) => {
  const res = await axios.delete(`/api/seasonal/images/${id}`);
  return res.data;
};

export const updateSeasonalSelection = async (selectedIds) => {
  const res = await axios.put(`/api/seasonal/images/selection`, { selectedIds });
  return res.data;
};

export const previewGenerateSeasonalImage = async (eventTitle) => {
  const res = await axios.post(`/api/seasonal/generate?preview=1`, { eventTitle });
  return res.data; // { b64, mimetype, title }
};

export const createCheckoutForGeneratedImage = async (eventTitle, b64) => {
  const res = await axios.post(`/api/seasonal/payments/checkout`, { eventTitle, b64 });
  return res.data; // { url, tmpId }
};

export const confirmGeneratedImage = async (tmpId, sessionId) => {
  const res = await axios.post(`/api/seasonal/generate/confirm`, { tmpId, sessionId });
  return res.data; // saved doc
};


export const getHolidays = async (year, regions = ["CA", "CA-BC"]) => {
  const res = await axios.get(`/api/holidays/list`, {
    params: { year, regions: Array.isArray(regions) ? regions.join(",") : String(regions) },
  });
  return res.data;
};
