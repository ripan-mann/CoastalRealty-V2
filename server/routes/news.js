const express = require("express");
const axios = require("axios");
const xml2js = require("xml2js");
const router = express.Router();

router.get("/news", async (req, res) => {
  try {
    const rssUrl =
      "https://news.google.com/rss/search?q=British+Columbia&hl=en-CA&gl=CA&ceid=CA:en";
    const { data: xml } = await axios.get(rssUrl);

    xml2js.parseString(xml, (err, result) => {
      if (err) return res.status(500).json({ error: "Failed to parse RSS" });

      const items = result.rss.channel[0].item.slice(0, 5).map((item) => {
        const rawDesc = item.description?.[0] || "";
        const match = rawDesc.match(/<a.*?>(.*?)<\/a>/);
        const text = match
          ? match[1]
          : rawDesc.replace(/<[^>]*>?/gm, "").trim();

        const sourceMatch = rawDesc.match(/<font[^>]*>(.*?)<\/font>/);
        return {
          title: item.title?.[0] || "No title",
          link: item.link?.[0] || "#",
          description: text.slice(0, 150),
          source: sourceMatch ? sourceMatch[1] : "Unknown",
          pubDate: item.pubDate?.[0] || "",
        };
      });

      res.json({ items });
    });
  } catch (err) {
    res.status(500).json({ error: "RSS fetch failed" });
  }
});
