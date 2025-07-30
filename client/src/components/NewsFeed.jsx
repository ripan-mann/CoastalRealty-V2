import React, { useEffect, useState } from "react";
import { Paper, Typography, Box } from "@mui/material";

const NEWS_URL = encodeURIComponent("https://globalnews.ca/bc/feed/");

const NewsFeed = () => {
  const [articles, setArticles] = useState([]);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const res = await fetch(
          `https://feed2json.org/convert?url=${NEWS_URL}`
        );
        const data = await res.json();
        if (data.items) {
          setArticles(data.items.slice(0, 5));
        }
      } catch (err) {
        console.error("Failed to fetch news", err);
      }
    };
    fetchNews();
  }, []);

  return (
    <Paper sx={{ p: 2, flexGrow: 1, overflowY: "auto" }}>
      <Typography variant="h6" fontWeight="bold" gutterBottom>
        Local News
      </Typography>
      {articles.map((item) => (
        <Box key={item.guid} mb={1}>
          <Typography variant="body2">
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ textDecoration: "none", color: "inherit" }}
            >
              {item.title}
            </a>
          </Typography>
        </Box>
      ))}
    </Paper>
  );
};

export default NewsFeed;
