import React, { useEffect, useState } from "react";
import { Paper, Typography, Box, useTheme } from "@mui/material";

const FEED_ENDPOINT = "/api/news";

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
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const fetchFeed = async () => {
      try {
        const response = await fetch(FEED_ENDPOINT);
        if (!response.ok) throw new Error("Failed to fetch news feed");
        const xml = await response.text();

        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xml, "application/xml");
        const itemsArray = Array.from(xmlDoc.querySelectorAll("item")).slice(
          0,
          5
        );

        const parsedItems = itemsArray.map((item) => {
          const title = item.querySelector("title")?.textContent || "No title";
          const link = item.querySelector("link")?.textContent || "#";
          const rawDescription =
            item.querySelector("description")?.textContent || "";
          const tempDiv = document.createElement("div");
          tempDiv.innerHTML = rawDescription;
          const description =
            tempDiv.querySelector("a")?.textContent ||
            stripHTML(rawDescription);

          const source =
            item.querySelector("source")?.textContent ||
            tempDiv.querySelector("font")?.textContent ||
            "Unknown";

          const pubDate = item.querySelector("pubDate")?.textContent || "";

          return {
            title,
            link,
            description: description.trim(),
            source,
            pubDate,
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

  useEffect(() => {
    if (!items.length) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length);
    }, 50000);
    return () => clearInterval(interval);
  }, [items]);

  if (loading) {
    return <Typography>Loading news...</Typography>;
  }

  if (error) {
    return <Typography color="error">Error loading news: {error}</Typography>;
  }

  if (!items.length) {
    return <Typography>No news available.</Typography>;
  }

  const current = items[currentIndex];

  return (
    <Paper
      sx={{
        p: 2,
        backgroundColor: theme.palette.grey[100],
        width: "70%",
        boxShadow: 0,
      }}
    >
      <Typography variant="h6" gutterBottom>
        <a
          href={current.link}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: "inherit",
            textDecoration: "none",
            fontSize: "1.5rem",
          }}
        >
          {current.description}
        </a>
      </Typography>
      {/* <Typography variant="body2" gutterBottom>
        {current.description}
      </Typography> */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          mt: 1,
        }}
      >
        <Typography variant="caption" color="text.secondary">
          {current.source}
        </Typography>
        {/* <Typography variant="caption" color="text.secondary">
          {current.pubDate}
        </Typography> */}
      </Box>
    </Paper>
  );
};

export default NewsFeed;
