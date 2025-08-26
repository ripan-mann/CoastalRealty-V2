import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { Paper, Typography, Box } from "@mui/material";

import { API_BASE } from "../config";
const FEED_ENDPOINT = `${API_BASE || ''}/api/news`;
const SUMMARY_ENDPOINT = `${API_BASE || ''}/api/news-summary`;

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
  const summariesStartedRef = useRef(false);
  const displaySettings = useSelector((s) => s.global.displaySettings);

  const rotationMs = useMemo(() => {
    const v = Number(displaySettings?.newsRotateMs);
    return Number.isFinite(v) && v > 0 ? v : 50000;
  }, [displaySettings?.newsRotateMs]);

  // tune how much work we do up front vs. background
  const INITIAL_SUMMARY_COUNT = 10; // fetch summaries for first N quickly
  const MAX_CONCURRENCY = 5; // limit parallel summary calls to avoid slowdowns/rate limits
  const MAX_ITEMS = 200; // safety cap so huge feeds don't stall the UI

  useEffect(() => {
    const fetchFeed = async () => {
      try {
        const response = await fetch(FEED_ENDPOINT);
        if (!response.ok) throw new Error("Failed to fetch news feed");
        const xml = await response.text();

        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xml, "application/xml");
        const itemsArray = Array.from(xmlDoc.querySelectorAll("item"));

        // Parse quickly without summaries so UI can render immediately
        const baseItems = itemsArray.slice(0, MAX_ITEMS).map((item) => {
          const title = item.querySelector("title")?.textContent || "No title";
          const link = item.querySelector("link")?.textContent || "#";
          const source = (item.querySelector("source")?.textContent || "Unknown").trim();
          const pubDate = item.querySelector("pubDate")?.textContent || "";
          const cleanTitle = removeSourceSuffix(title, source).trim();
          return {
            title: cleanTitle,
            link,
            description: "", // filled in asynchronously
            source,
            pubDate,
          };
        });

        setItems(baseItems);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchFeed();
  }, []);

  // fetch summaries in the background with small concurrency
  useEffect(() => {
    if (!items.length) return;
    if (summariesStartedRef.current) return;
    summariesStartedRef.current = true;

    let cancelled = false;

    const runWithConcurrency = async (indices) => {
      const queue = [...indices];
      let active = 0;
      return new Promise((resolve) => {
        const next = () => {
          if (cancelled) return resolve();
          if (queue.length === 0 && active === 0) return resolve();
          while (active < MAX_CONCURRENCY && queue.length > 0) {
            const idx = queue.shift();
            if (idx == null) break;
            active++;
            const title = items[idx]?.title || "";
            fetch(SUMMARY_ENDPOINT, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ title }),
            })
              .then((res) => (res.ok ? res.json() : null))
              .then((data) => {
                if (cancelled || !data) return;
                const raw = data.description || "";
                setItems((prev) => {
                  const it = prev[idx];
                  if (!it) return prev;
                  const cleanDescription = removeSourceSuffix(raw.trim(), it.source);
                  if (it.description === cleanDescription) return prev; // no change
                  const copy = [...prev];
                  copy[idx] = { ...it, description: cleanDescription };
                  return copy;
                });
              })
              .catch(() => {
                // mark as unavailable so UI doesn't keep showing a loader
                setItems((prev) => {
                  const it = prev[idx];
                  if (!it) return prev;
                  if (it.description && it.description !== "") return prev;
                  const copy = [...prev];
                  copy[idx] = { ...it, description: "Summary unavailable." };
                  return copy;
                });
              })
              .finally(() => {
                active--;
                next();
              });
          }
        };
        next();
      });
    };

    // Prioritize first N for faster initial experience, then the rest
    const first = Array.from({ length: Math.min(INITIAL_SUMMARY_COUNT, items.length) }, (_, i) => i);
    const rest = Array.from({ length: Math.max(items.length - first.length, 0) }, (_, i) => i + first.length);

    (async () => {
      await runWithConcurrency(first);
      // background the rest with a tiny delay to yield to rendering
      setTimeout(() => runWithConcurrency(rest), 0);
    })();

    return () => {
      cancelled = true;
    };
  }, [items.length]);

  useEffect(() => {
    if (!items.length) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length);
    }, rotationMs);
    return () => clearInterval(interval);
  }, [items, rotationMs]);

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
            fontSize: "1.3rem",
          }}
        >
          {current.title}
        </a>
      </Typography>
      {current.description ? (
        <Typography variant="body2" fontSize="1rem" gutterBottom>
          {current.description}
        </Typography>
      ) : (
        <Typography variant="body2" fontSize="1rem" gutterBottom color="text.secondary">
          Generating summary…
        </Typography>
      )}
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
