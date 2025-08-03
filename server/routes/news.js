import express from "express";
import axios from "axios";

const router = express.Router();

const RSS_URL =
  "https://news.google.com/rss/search?q=British+Columbia&hl=en-CA&gl=CA&ceid=CA:en";

router.get("/", async (req, res) => {
  try {
    const response = await axios.get(RSS_URL, { responseType: "text" });
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

export default router;
