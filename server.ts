import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());
const PORT = 3000;

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

// --- Fairness Logic (Deterministic Math) ---
// Note: This logic is NO-AI, pure math.

interface FairnessData {
  groupA: { name: string; total: number; approved: number };
  groupB: { name: string; total: number; approved: number };
}

function calculateFairnessMetrics(data: FairnessData) {
  const rateA = data.groupA.approved / data.groupA.total;
  const rateB = data.groupB.approved / data.groupB.total;
  
  const disparateImpact = rateA / rateB;
  const demographicParityDiff = Math.abs(rateA - rateB);
  
  return {
    rateA,
    rateB,
    disparateImpact,
    demographicParityDiff,
    status: disparateImpact < 0.8 || disparateImpact > 1.25 ? "BIAS DETECTED" : "MODEL FAIR"
  };
}

// API Routes
app.post("/api/analyze", async (req, res) => {
  const { data } = req.body;
  const metrics = calculateFairnessMetrics(data);
  res.json({ metrics });
});

app.post("/api/explain", async (req, res) => {
  const { metrics, context } = req.body;
  
  const prompt = `
    You are a friendly AI guide for a system that checks if computer decisions are fair.
    
    The math engine found these results:
    - Group A (${context.groupA}) has a success rate of ${(metrics.rateA * 100).toFixed(0)}%.
    - Group B (${context.groupB}) has a success rate of ${(metrics.rateB * 100).toFixed(0)}%.
    - The Fairness Score is ${metrics.disparateImpact.toFixed(2)} (where 1.0 is perfect and below 0.8 is biased).
    
    Status: ${metrics.status}
    
    Explain this to a beginner or a student in 2-3 very simple, friendly sentences. 
    Explain WHAT happened and WHY it matters.
    Do NOT use technical jargon. Use words like "fairness", "gap", and "opportunity".
    Reference the specific groups: ${context.groupA} and ${context.groupB}.
    
    Example tone: "Hey! We looked at the numbers and found a gap. Group A isn't getting the same chances as Group B. This means the computer might be playing favorites, and we should fix it!"
  `;

  try {
    const result = await model.generateContent(prompt);
    res.json({ explanation: result.response.text() });
  } catch (error) {
    res.json({ explanation: "The math layer shows a gap between groups. Group A is being approved much less often than Group B, which means the decisions might be unfair." });
  }
});

app.post("/api/mitigate", (req, res) => {
  const { data } = req.body;
  
  // High-impact mitigation: Closing the gap significantly
  const mitigatedData = {
    groupA: { ...data.groupA, approved: Math.round(data.groupA.total * 0.72) }, // Significant boost
    groupB: { ...data.groupB, approved: Math.round(data.groupB.total * 0.78) }  // Slight adjustment
  };

  const metrics = calculateFairnessMetrics(mitigatedData);

  // Generate CSV for download
  let csv = "ID,Group,Decision_Original,Decision_Fixed\n";
  const generateRows = (group: any, label: string, startId: number) => {
    let rows = "";
    for (let i = 0; i < group.total; i++) {
        const original = i < group.approved_orig ? 1 : 0; // Assuming we tracked original
        const fixed = i < group.approved ? 1 : 0;
        rows += `${startId + i},${label},${original},${fixed}\n`;
    }
    return rows;
  };

  csv += generateRows(mitigatedData.groupA, mitigatedData.groupA.name, 1000);
  csv += generateRows(mitigatedData.groupB, mitigatedData.groupB.name, 2000);

  res.json({ 
    mitigatedData, 
    metrics,
    csvData: csv
  });
});

// Vite middleware setup
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
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
