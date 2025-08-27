import express from "express";
import OpenAI from "openai";

const router = express.Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

router.post("/", async (req, res) => {
  let { title, sentences } = req.body || {};
  if (!title) {
    return res.status(400).json({ error: "Title is required" });
  }
  // Sanitize and bound the input used in the prompt
  title = String(title).replace(/[\r\n\t]+/g, " ").slice(0, 200);
  let count = Number(sentences);
  if (!Number.isFinite(count)) count = 3;
  count = Math.max(1, Math.min(6, Math.floor(count)));

  try {
    const prompt = `Write a concise ${count}-sentence summary for this news headline: "${title}"`;
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 120,
      temperature: 0.7,
    });

    const description = completion.choices?.[0]?.message?.content?.trim() || "";

    res.json({ description });
  } catch (error) {
    console.error(
      "News summary generation error:",
      error.response?.data || error.message
    );
    res.status(500).json({ error: "Failed to generate summary" });
  }
});

export default router;
