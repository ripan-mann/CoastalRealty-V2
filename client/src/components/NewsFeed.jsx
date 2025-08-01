import React, { useEffect, useState } from "react";
import { Paper, Typography, Box } from "@mui/material";
import GNews from "@gnews-io/gnews-io-js";

const GNEWS_API_KEY = process.env.REACT_APP_GNEWS_API_KEY;

const client = new GNews(GNEWS_API_KEY);

const NewsFeed = () => {
  const [articles, setArticles] = useState([]);

  useEffect(() => {
    // Get top headlines
    client
      .topHeadlines({
        lang: "en",
        country: "ca",
        max: 10,
        category: "general",
      })
      .then((response) => {
        console.log(`Found ${response.totalArticles} articles`);
        console.log(response.articles);
      })
      .catch((error) => {
        console.error(error);
      });
  }, []);

  return (
    <Paper
      sx={{ ml: "3%", p: 2, flexGrow: 1, overflowY: "auto", boxShadow: 0 }}
    >
      <Typography variant="h6" fontWeight="bold">
        Local News
      </Typography>
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

      {articles.map((item) => (
        <Box key={item.url} mb={1}>
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
