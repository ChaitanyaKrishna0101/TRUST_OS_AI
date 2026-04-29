import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());
const PORT = 5000;

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

// --- Fairness Logic ---

interface FairnessData {
  groupA: { name: string; total: number; approved: number };
  groupB: { name: string; total: number; approved: number };
}

function calculateFairnessMetrics(data: FairnessData) {
  const totalA = Math.max(data.groupA.total, 1); // guard against divide-by-zero
  const totalB = Math.max(data.groupB.total, 1);

  const rateA = data.groupA.approved / totalA;
  const rateB = data.groupB.approved / totalB;

  // Guard: if rateB is 0 we can't compute a meaningful ratio
  const disparateImpact = rateB > 0 ? rateA / rateB : 0;
  const demographicParityDiff = Math.abs(rateA - rateB);

  return {
    rateA,
    rateB,
    disparateImpact,
    demographicParityDiff,
    status: disparateImpact < 0.8 || disparateImpact > 1.25 ? "BIAS DETECTED" : "MODEL FAIR"
  };
}

// --- API Routes ---

app.post("/api/analyze", async (req, res) => {
  try {
    const { data } = req.body;
    if (!data?.groupA || !data?.groupB) {
      res.status(400).json({ error: "Missing groupA or groupB in request body." });
      return;
    }
    const metrics = calculateFairnessMetrics(data);
    res.json({ metrics });
  } catch (err: any) {
    console.error("/api/analyze error:", err);
    res.status(500).json({ error: err.message || "Analysis failed." });
  }
});

app.post("/api/explain", async (req, res) => {
  try {
    const { metrics, context } = req.body;

    if (!metrics || metrics.disparateImpact == null || !context?.groupA || !context?.groupB) {
      res.status(400).json({ error: "Missing metrics or context in request body." });
      return;
    }

    const rateAStr = (Number(metrics.rateA) * 100).toFixed(0);
    const rateBStr = (Number(metrics.rateB) * 100).toFixed(0);
    const scoreStr = Number(metrics.disparateImpact).toFixed(2);

    const prompt = `
      You are a friendly AI guide for a system that checks if computer decisions are fair.

      The math engine found these results:
      - Group A (${context.groupA}) has a success rate of ${rateAStr}%.
      - Group B (${context.groupB}) has a success rate of ${rateBStr}%.
      - The Fairness Score is ${scoreStr} (where 1.0 is perfect and below 0.8 means bias is present).

      Status: ${metrics.status}

      Explain this to a beginner in 2-3 very simple, friendly sentences.
      Explain WHAT happened and WHY it matters.
      Do NOT use technical jargon. Use words like "fairness", "gap", and "opportunity".
      Reference the specific groups: ${context.groupA} and ${context.groupB}.
    `;

    try {
      const result = await model.generateContent(prompt);
      res.json({ explanation: result.response.text() });
    } catch {
      res.json({
        explanation: `We compared ${context.groupA} and ${context.groupB}. One group is being approved much less often than the other — that gap is what fairness auditing calls bias. The score of ${scoreStr} confirms there's an unequal opportunity between these groups.`
      });
    }
  } catch (err: any) {
    console.error("/api/explain error:", err);
    res.status(500).json({ error: err.message || "Explanation failed." });
  }
});

app.post("/api/mitigate", (req, res) => {
  try {
    const { data } = req.body;
    if (!data?.groupA || !data?.groupB) {
      res.status(400).json({ error: "Missing groupA or groupB in request body." });
      return;
    }

    const mitigatedData = {
      groupA: { ...data.groupA, approved: Math.round(data.groupA.total * 0.72) },
      groupB: { ...data.groupB, approved: Math.round(data.groupB.total * 0.78) }
    };

    const metrics = calculateFairnessMetrics(mitigatedData);

    let csv = "ID,Group,Decision_Original,Decision_Fixed\n";

    const origApprovedA = data.groupA.approved;
    const origApprovedB = data.groupB.approved;

    for (let i = 0; i < mitigatedData.groupA.total; i++) {
      const original = i < origApprovedA ? 1 : 0;
      const fixed = i < mitigatedData.groupA.approved ? 1 : 0;
      csv += `${1000 + i},${mitigatedData.groupA.name},${original},${fixed}\n`;
    }
    for (let i = 0; i < mitigatedData.groupB.total; i++) {
      const original = i < origApprovedB ? 1 : 0;
      const fixed = i < mitigatedData.groupB.approved ? 1 : 0;
      csv += `${2000 + i},${mitigatedData.groupB.name},${original},${fixed}\n`;
    }

    res.json({ mitigatedData, metrics, csvData: csv });
  } catch (err: any) {
    console.error("/api/mitigate error:", err);
    res.status(500).json({ error: err.message || "Mitigation failed." });
  }
});

// --- Vite middleware / static serving ---

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, _res, next) => {
      _res.sendFile(path.join(distPath, "index.html"), next);
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

// Keep the process alive on unexpected errors instead of crashing
process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err);
});
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection:", reason);
});

startServer();
