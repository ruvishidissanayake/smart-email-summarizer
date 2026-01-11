import express from "express";
import cors from "cors";
import multer from "multer";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());
app.use(express.json());

/* =========================
   HEALTH CHECK
========================= */
app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

/* =========================
   UTILS
========================= */
function extractJson(content) {
  if (!content) throw new Error("No model output returned.");

  // Try direct JSON parse
  try {
    return JSON.parse(content);
  } catch (_) {
    // Fallback: extract JSON between { ... }
    const start = content.indexOf("{");
    const end = content.lastIndexOf("}");
    if (start >= 0 && end > start) {
      const sliced = content.slice(start, end + 1);
      return JSON.parse(sliced);
    }
    throw new Error("Model returned non-JSON output.");
  }
}

function wordCount(text = "") {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/* =========================
   OLLAMA LLM CALL
========================= */
async function callLLM(emailText) {
  const ollamaUrl = (process.env.OLLAMA_URL || "http://localhost:11434").replace(/\/$/, "");
  const model = process.env.OLLAMA_MODEL || "llama3.1:8b";

  const systemPrompt = `
Return STRICT JSON ONLY (no markdown, no explanation).

Schema:
{
  "category": "Urgent" | "Important" | "FYI",
  "summary": "3-5 sentences",
  "key_points": ["...", "..."],
  "action_items": ["...", "..."]
}

Rules:
- Urgent: deadlines within 48h, incidents, outages, immediate actions.
- Important: action required but not immediate.
- FYI: informational only.
- If no action items, return [].
  `.trim();

  const payload = {
    model,
    stream: false,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Email:\n${emailText}` }
    ]
  };

  const resp = await fetch(`${ollamaUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Ollama error ${resp.status}: ${text}`);
  }

  const data = await resp.json();
  const content = data?.message?.content;

  const parsed = extractJson(content);

  return {
    category: parsed.category || "FYI",
    summary: parsed.summary || "",
    key_points: Array.isArray(parsed.key_points) ? parsed.key_points : [],
    action_items: Array.isArray(parsed.action_items) ? parsed.action_items : []
  };
}

/* =========================
   SINGLE EMAIL SUMMARY
========================= */
app.post("/api/summarize-text", async (req, res) => {
  try {
    const { emailText } = req.body;
    if (!emailText) {
      return res.status(400).json({ error: "emailText is required" });
    }

    const beforeWords = wordCount(emailText);
    const ai = await callLLM(emailText);
    const afterWords = wordCount(ai.summary);

    res.json({
      ...ai,
      beforeWords,
      afterWords
    });
  } catch (err) {
    console.error("❌ LLM Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

/* =========================
   BATCH EMAIL SUMMARY
========================= */
app.post("/api/summarize-batch", upload.array("files"), async (req, res) => {
  try {
    if (!req.files || !req.files.length) {
      return res.status(400).json({ error: "No files uploaded" });
    }

    const results = [];
    const totals = { categories: { Urgent: 0, Important: 0, FYI: 0 } };

    for (const file of req.files) {
      const text = file.buffer.toString("utf-8");
      const beforeWords = wordCount(text);
      const ai = await callLLM(text);
      const afterWords = wordCount(ai.summary);

      totals.categories[ai.category] =
        (totals.categories[ai.category] || 0) + 1;

      results.push({
        filename: file.originalname,
        ...ai,
        beforeWords,
        afterWords
      });
    }

    res.json({ results, totals });
  } catch (err) {
    console.error("❌ Batch LLM Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

/* =========================
   START SERVER
========================= */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Backend running: http://localhost:${PORT}`);
});
