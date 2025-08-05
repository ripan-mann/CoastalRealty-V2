import React, { useEffect, useState } from "react";
import { Paper, Typography, Box } from "@mui/material";

const FEED_ENDPOINT = "/api/news";
const SUMMARY_ENDPOINT = "/api/news-summary";

const removeSourceSuffix = (text, source) => {
  if (!text || !source) return text;
  const suffix = ` - ${source}`;
  return text.endsWith(suffix) ? text.slice(0, -suffix.length) : text;
};

const NewsFeed = () => {
  // const theme = useTheme();
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

        const parsedItems = await Promise.all(
          itemsArray.map(async (item) => {
            const title =
              item.querySelector("title")?.textContent || "No title";
            const link = item.querySelector("link")?.textContent || "#";
            const source = (
              item.querySelector("source")?.textContent || "Unknown"
            ).trim();
            const pubDate = item.querySelector("pubDate")?.textContent || "";
            const cleanTitle = removeSourceSuffix(title, source).trim();

            let description = "";
            try {
              const summaryRes = await fetch(SUMMARY_ENDPOINT, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ title }),
              });

              if (summaryRes.ok) {
                const data = await summaryRes.json();
                description = data.description || "";
              } else {
                description = "Summary unavailable.";
              }
            } catch (e) {
              description = "Summary unavailable.";
            }
            const cleanDescription = removeSourceSuffix(
              description.trim(),
              source
            );

            return {
              title: cleanTitle,
              link,
              description: cleanDescription,
              source,
              pubDate,
            };
          })
        );

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
        // backgroundColor: theme.palette.grey[100],
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
          {current.title}
        </a>
      </Typography>
      <Typography variant="body2" fontSize="1rem" gutterBottom>
        {current.description}
      </Typography>
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
