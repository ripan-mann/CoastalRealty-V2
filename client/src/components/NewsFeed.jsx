import React, { useEffect, useState } from "react";
import { Paper, Typography, Box, useTheme } from "@mui/material";

const RSS_URL =
  "https://news.google.com/rss/search?q=British+Columbia&hl=en-CA&gl=CA&ceid=CA:en";

const stripHTML = (html) => {
  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = html;
  return tempDiv.textContent || tempDiv.innerText || "";
};

const NewsFeed = () => {
  const theme = useTheme();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  useEffect(() => {
    const fetchFeed = async () => {
      try {
        const response = await fetch(RSS_URL);
        if (!response.ok) throw new Error("Failed to fetch news feed");
        const xml = await response.text();

        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xml, "application/xml");
        const itemsArray = Array.from(xmlDoc.querySelectorAll("item")).slice(
          0,
          5
        );

        const parsedItems = itemsArray.map((item) => {
          const rawDescription =
            item.querySelector("description")?.textContent || "";
          const cleanedDescription = stripHTML(rawDescription)
            .replace(/\s+/g, " ")
            .trim();

          const matchSource = rawDescription.match(/<font[^>]*>(.*?)<\/font>/i);
          const source =
            item.querySelector("source")?.textContent ||
            (matchSource ? matchSource[1] : "Unknown");

          return {
            title: item.querySelector("title")?.textContent || "No title",
            description: cleanedDescription.slice(0, 150),
            author: source,
          };
        });

        setItems(parsedItems);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchFeed();
  }, []);
};

export default NewsFeed;
