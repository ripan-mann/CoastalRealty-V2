import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useSelector } from "react-redux";
import { Paper, Typography, Box } from "@mui/material";
import { useTheme, alpha } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";

import { API_BASE } from "../config";
const FEED_ENDPOINT = `${API_BASE || ""}/api/news`;
const SUMMARY_ENDPOINT = `${API_BASE || ""}/api/news-summary`;

const removeSourceSuffix = (text, source) => {
  if (!text || !source) return text;
  const suffix = ` - ${source}`;
  return text.endsWith(suffix) ? text.slice(0, -suffix.length) : text;
};

const NewsFeed = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery("(max-width:900px)");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const itemsRef = useRef([]);
  const inFlightRef = useRef(new Set());
  const prefetchTimeoutRef = useRef(null);
  const rotateIntervalRef = useRef(null);
  const displaySettings = useSelector((s) => s.global.displaySettings);

  const rotationMs = useMemo(() => {
    const v = Number(displaySettings?.newsRotateMs);
    return Number.isFinite(v) && v > 0 ? v : 50000;
  }, [displaySettings?.newsRotateMs]);

  // Cap the number of feed items to keep memory stable
  const MAX_ITEMS = 200;
  // Prefetch the next summary shortly before rotation to reduce request rate
  const prefetchLeadMs = useMemo(() => {
    // About 20% of rotation time, capped at 10s
    return Math.min(10000, Math.max(1000, Math.floor(rotationMs * 0.2)));
  }, [rotationMs]);

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
          const source = (
            item.querySelector("source")?.textContent || "Unknown"
          ).trim();
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

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  // Fetch summary for a single index if not already present/in-flight
  const fetchSummary = useCallback(async (idx) => {
    const cur = itemsRef.current[idx];
    if (!cur) return;
    if (cur.description && cur.description !== "") return;
    const key = `${idx}:${cur.title}`;
    if (inFlightRef.current.has(key)) return;
    inFlightRef.current.add(key);
    try {
      const res = await fetch(SUMMARY_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: cur.title, sentences: isMobile ? 6 : 3 }),
      });
      if (!res.ok) throw new Error("bad response");
      const data = await res.json();
      const raw = (data?.description || "").trim();
      setItems((prev) => {
        const it = prev[idx];
        if (!it) return prev;
        const cleanDescription = removeSourceSuffix(raw, it.source);
        if (it.description === cleanDescription) return prev;
        const copy = [...prev];
        copy[idx] = { ...it, description: cleanDescription };
        return copy;
      });
    } catch (_) {
      setItems((prev) => {
        const it = prev[idx];
        if (!it) return prev;
        if (it.description && it.description !== "") return prev;
        const copy = [...prev];
        copy[idx] = { ...it, description: "Summary unavailable." };
        return copy;
      });
    } finally {
      inFlightRef.current.delete(key);
    }
  }, [isMobile]);

  // Rotation + just-in-time prefetch
  useEffect(() => {
    if (!items.length) return;
    // Ensure current item has a summary
    fetchSummary(currentIndex);

    // Schedule prefetch shortly before the next rotation
    if (prefetchTimeoutRef.current) {
      clearTimeout(prefetchTimeoutRef.current);
      prefetchTimeoutRef.current = null;
    }
    prefetchTimeoutRef.current = setTimeout(() => {
      const nextIdx = (currentIndex + 1) % items.length;
      fetchSummary(nextIdx);
    }, Math.max(0, rotationMs - prefetchLeadMs));

    return () => {
      if (prefetchTimeoutRef.current) {
        clearTimeout(prefetchTimeoutRef.current);
        prefetchTimeoutRef.current = null;
      }
    };
  }, [items.length, currentIndex, rotationMs, prefetchLeadMs, fetchSummary]);

  useEffect(() => {
    if (!items.length) return;
    if (rotateIntervalRef.current) {
      clearInterval(rotateIntervalRef.current);
      rotateIntervalRef.current = null;
    }
    rotateIntervalRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length);
    }, rotationMs);
    return () => {
      if (rotateIntervalRef.current) {
        clearInterval(rotateIntervalRef.current);
        rotateIntervalRef.current = null;
      }
    };
  }, [items.length, rotationMs]);

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

  const mobileCard = (
    <Paper
      sx={{
        p: { xs: 3, md: 4 },
        pt: { xs: 10, md: 15 },
        width: "100%",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-start",
        gap: 1.75,
        borderRadius: 0,
        boxShadow: "none",
        background: `linear-gradient(180deg, ${alpha(
          theme.palette.common.white,
          1
        )} 0%, ${alpha(theme.palette.primary.light, 0.1)} 100%)`,
        borderTop: `1px solid ${alpha(theme.palette.primary.main, 0.15)}`,
        borderBottom: `1px solid ${alpha(theme.palette.primary.main, 0.15)}`,
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Typography
          sx={{
            fontSize: { xs: "1.1rem", md: "1.2rem" },
            letterSpacing: "0.08em",
            fontWeight: 900,
            color: theme.palette.primary.dark,
            bgcolor: alpha(theme.palette.primary.dark, 0.18),
            border: `1px solid ${alpha(theme.palette.primary.dark, 0.35)}`,
            px: 1.5,
            py: 0.75,
            borderRadius: 2,
            textTransform: "uppercase",
          }}
        >
          Top News
        </Typography>
        <Typography
          sx={{
            fontSize: { xs: "1rem", md: "1.1rem" },
            color: theme.palette.text.secondary,
          }}
        >
          {current.source}
        </Typography>
      </Box>

      <Typography
        component="h3"
        sx={{
          pt: 5,
          fontSize: { xs: "2.2rem", md: "3rem" },
          fontWeight: 900,
          lineHeight: 1.2,
        }}
      >
        <a
          href={current.link}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: theme.palette.text.primary, textDecoration: "none" }}
        >
          {current.title}
        </a>
      </Typography>

      <Typography
        sx={{
          pt: 3,
          fontSize: { xs: "1.5rem", md: "2.5rem" },
          color: theme.palette.text.secondary,
          lineHeight: 1.65,
        }}
      >
        {current.description || "Generating summary…"}
      </Typography>

      <Box sx={{ flexGrow: 1 }} />

      <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
        <Typography
          sx={{
            fontSize: { xs: "0.85rem", md: "0.95rem" },
            color: theme.palette.text.disabled,
            zIndex: 1000000,
          }}
        >
          Swipe up for listings
        </Typography>
      </Box>
    </Paper>
  );

  const desktopCard = (
    <Paper
      sx={{
        p: 2,
        width: "70%",
        boxShadow: 0,
        backgroundColor: "transparent",
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
        <Typography
          variant="body2"
          fontSize="1rem"
          gutterBottom
          color="text.secondary"
        >
          Generating summary…
        </Typography>
      )}
      <Box sx={{ display: "flex", justifyContent: "space-between", mt: 1 }}>
        <Typography variant="caption" color="text.secondary">
          {current.source}
        </Typography>
      </Box>
    </Paper>
  );

  return isMobile ? mobileCard : desktopCard;
};

export default NewsFeed;
