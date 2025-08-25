import express from "express";
import axios from "axios";

const router = express.Router();

const RSS_URL =
  "https://news.google.com/rss/search?q=British+Columbia&hl=en-CA&gl=CA&ceid=CA:en";

router.get("/", async (req, res) => {
  try {
    const response = await axios.get(RSS_URL, { responseType: "text", timeout: 8000 });
    res.set("Content-Type", "application/rss+xml");
    res.send(response.data);
  } catch (error) {
    console.error(
      "News RSS Fetch Error:",
      error.response?.data || error.message
    );
    res.status(500).json({ error: "Failed to fetch news feed" });
  }
});

// Return a simple count of headlines without client parsing
router.get("/count", async (_req, res) => {
  try {
    const response = await axios.get(RSS_URL, { responseType: "text", timeout: 8000 });
    const xml = String(response.data || "");
    // Rough count by matching opening <item> tags
    const matches = xml.match(/<item\b/gi);
    const count = matches ? matches.length : 0;
    res.json({ count });
  } catch (error) {
    console.error("News RSS Count Error:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to fetch news count" });
  }
});

export default router;
