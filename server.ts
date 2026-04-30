import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());
const PORT = Number(process.env.PORT) || 3000;

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

// --- Fairness Logic ---

interface FairnessData {
  groupA: { name: string; total: number; approved: number };
  groupB: { name: string; total: number; approved: number };
}

function calculateFairnessMetrics(data: FairnessData) {
  const totalA = Math.max(data.groupA.total, 1);
  const totalB = Math.max(data.groupB.total, 1);

  const rateA = data.groupA.approved / totalA;
  const rateB = data.groupB.approved / totalB;

  // Disparate Impact Ratio
  const disparateImpact = rateB > 0 ? rateA / rateB : 0;
  const demographicParityDiff = Math.abs(rateA - rateB);

  // 4/5ths Rule: Bias is usually flagged if ratio is outside 0.8 - 1.25
  return {
    rateA,
    rateB,
    disparateImpact,
    demographicParityDiff,
    status: disparateImpact < 0.8 || disparateImpact > 1.25 ? "BIAS DETECTED" : "MODEL FAIR"
  };
}

// --- API Routes (MUST come before Vite middleware) ---

app.post("/api/analyze", (req, res) => {
  try {
    const { data } = req.body;
    if (!data?.groupA || !data?.groupB) {
      return res.status(400).json({ error: "Missing groupA or groupB in request body." });
    }
    const metrics = calculateFairnessMetrics(data);
    return res.json({ metrics });
  } catch (err: any) {
    console.error("/api/analyze error:", err);
    return res.status(500).json({ error: "Analysis failed." });
  }
});

app.post("/api/explain", async (req, res) => {
  try {
    const { metrics, context } = req.body;

    if (!metrics || metrics.disparateImpact == null || !context?.groupA || !context?.groupB) {
      return res.status(400).json({ error: "Missing metrics or context." });
    }

    const rateAStr = (Number(metrics.rateA) * 100).toFixed(0);
    const rateBStr = (Number(metrics.rateB) * 100).toFixed(0);
    const scoreStr = Number(metrics.disparateImpact).toFixed(2);

    const prompt = `
      Explain the following fairness audit to a beginner in 2-3 simple, friendly sentences:
      - Group A (${context.groupA}) success rate: ${rateAStr}%.
      - Group B (${context.groupB}) success rate: ${rateBStr}%.
      - Fairness Score: ${scoreStr}.
      - Status: ${metrics.status}.
      Use words like "fairness", "gap", and "opportunity". Reference the specific groups.
    `;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    
    return res.json({ explanation: text || "Could not generate explanation." });
  } catch (err: any) {
    console.error("/api/explain error:", err);
    // Fallback explanation if AI fails
    return res.json({
      explanation: `We compared ${req.body.context?.groupA} and ${req.body.context?.groupB}. There is a gap in approval rates that indicates an unequal opportunity between these groups.`
    });
  }
});

app.post("/api/mitigate", (req, res) => {
  try {
    const { data } = req.body;
    if (!data?.groupA || !data?.groupB) {
      return res.status(400).json({ error: "Missing groupA or groupB." });
    }

    // Example mitigation: Adjusting approval rates to be closer
    const mitigatedData = {
      groupA: { ...data.groupA, approved: Math.round(data.groupA.total * 0.75) },
      groupB: { ...data.groupB, approved: Math.round(data.groupB.total * 0.75) }
    };

    const metrics = calculateFairnessMetrics(mitigatedData);

    let csv = "ID,Group,Decision_Original,Decision_Fixed\n";
    const origApprovedA = data.groupA.approved;
    const origApprovedB = data.groupB.approved;

    // Generate synthetic CSV data
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

    return res.json({ mitigatedData, metrics, csvData: csv });
  } catch (err: any) {
    console.error("/api/mitigate error:", err);
    return res.status(500).json({ error: "Mitigation failed." });
  }
});

// --- Vite / Static Files ---

async function startServer() {
  try {
    if (process.env.NODE_ENV !== "production") {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } else {
      const distPath = path.join(process.cwd(), "dist");
      app.use(express.static(distPath));
      app.get("*", (_req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    }

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`\x1b[32m%s\x1b[0m`, `✔ Server running on http://localhost:${PORT}`);
    });
  } catch (e) {
    console.error("Failed to start server:", e);
  }
}

// Global Handlers
process.on("uncaughtException", (err) => console.error("Uncaught:", err));
process.on("unhandledRejection", (reason) => console.error("Rejection:", reason));

startServer();