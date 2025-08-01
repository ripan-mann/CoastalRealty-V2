import React, { useEffect, useState } from "react";
import { Paper, Typography, Box } from "@mui/material";
import GNews from "@gnews-io/gnews-io-js";

const GNEWS_API_KEY = process.env.REACT_APP_GNEWS_API_KEY;

const client = new GNews(GNEWS_API_KEY);

const ROTATE_INTERVAL = 10000;

const NewsFeed = () => {
  const [articles, setArticles] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    // Get top headlines
    client
      .topHeadlines({
        lang: "en",
        country: "ca",
        max: 100,
      })
      .then((response) => {
        if (Array.isArray(response.articles)) {
          setArticles(response.articles);
        }
      })
      .catch((error) => {
        console.error(error);
      });
  }, []);

  useEffect(() => {
    if (articles.length === 0) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % articles.length);
    }, ROTATE_INTERVAL);
    return () => clearInterval(interval);
  }, [articles]);

  return (
    <Paper
      sx={{ ml: "3%", p: 2, flexGrow: 1, overflowY: "auto", boxShadow: 0 }}
    >
      <Typography variant="h6" fontWeight="bold">
        Local News
      </Typography>

      {articles.length > 0 && (
        <Box key={articles[currentIndex].url} mb={1}>
          <Typography variant="body2" fontWeight="bold">
            <a
              href={articles[currentIndex].url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ textDecoration: "none", color: "inherit" }}
            >
              {articles[currentIndex].title}
            </a>
          </Typography>
          {articles[currentIndex].description && (
            <Typography variant="caption" color="textSecondary">
              {articles[currentIndex].description}
            </Typography>
          )}
        </Box>
      )}

      <Typography variant="caption" display="block">
        {new Date().toLocaleDateString("en-CA", {
          weekday: "short",
          month: "long",
          day: "numeric",
        })}
      </Typography>
      <Typography variant="caption">
        {new Date().toLocaleTimeString()}
      </Typography>
    </Paper>
  );
};

export default NewsFeed;
