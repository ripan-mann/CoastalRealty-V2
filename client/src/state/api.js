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
  console.log("Total records after deduplication:", deduped);

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
