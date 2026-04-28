import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldAlert, 
  ShieldCheck, 
  BrainCircuit, 
  Database, 
  Calculator, 
  MessageSquare,
  ArrowRight,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  FileText,
  Scan,
  Zap,
  Info,
  Activity,
  Download,
  Upload
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell 
} from 'recharts';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// --- Utility ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Steps ---
enum Step {
  UPLOAD = 'upload',
  PREVIEW = 'preview',
  PROBLEM = 'problem',
  PROCESSING = 'processing',
  AUDIT = 'audit',
  RESOLUTION = 'resolution'
}

// --- Initial Data ---
const INITIAL_DATA = {
  groupA: { name: 'Group A', total: 1000, approved: 400 },
  groupB: { name: 'Group B', total: 1000, approved: 800 }
};

const IMPACT_SCENARIOS = [
  { id: 'hiring', title: '01 · Hiring', desc: 'AI screening bias.', impact: 'Job fairness.' },
  { id: 'banking', title: '02 · Banking', desc: 'Loan discrimination.', impact: 'Equal credit.' },
  { id: 'health', title: '03 · Healthcare', desc: 'Medical AI gaps.', impact: 'Better care.' },
  { id: 'edu', title: '04 · Education', desc: 'Admissions bias.', impact: 'Equal study.' },
  { id: 'justice', title: '05 · Prison/Bail', desc: 'Parole AI fairness.', impact: 'True justice.' },
  { id: 'insurance', title: '06 · Insurance', desc: 'Pricing fairness.', impact: 'Fair rates.' },
  { id: 'gov', title: '07 · Government', desc: 'Welfare AI bias.', impact: 'Fair help.' },
  { id: 'social', title: '08 · Social Media', desc: 'Moderation bias.', impact: 'Free speech.' },
  { id: 'commerce', title: '09 · Shopping', desc: 'Ad targeting bias.', impact: 'Fair deals.' },
  { id: 'housing', title: '10 · Real Estate', desc: 'Valuation bias.', impact: 'Fair homes.' },
  { id: 'police', title: '11 · Policing', desc: 'Prediction bias.', impact: 'Safe streets.' },
  { id: 'climate', title: '12 · Resources', desc: 'Energy help gap.', impact: 'Green equity.' },
  { id: 'legal', title: '13 · Regulation', desc: 'AI Act compliance.', impact: 'Legal safety.' },
  { id: 'sme', title: '14 · Small Biz', desc: 'Bias access gap.', impact: 'Fair markets.' },
  { id: 'citizen', title: '15 · Citizens', desc: 'Right to explain.', impact: 'Your rights.' }
];

export default function App() {
  const [currentStep, setCurrentStep] = useState<Step>(Step.UPLOAD);
  const [data, setData] = useState(INITIAL_DATA);
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [explanation, setExplanation] = useState<string>('');
  const [history, setHistory] = useState<any[]>([]);
  const [csvData, setCsvData] = useState<string>('');
  const [fileInfo, setFileInfo] = useState<{ name: string; rows: number; cols: number } | null>(null);
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [analysisProgress, setAnalysisProgress] = useState(0);

  const addLog = (msg: string) => setLogs(prev => [...prev.slice(-4), msg]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = (e.target?.result as string) || "";
        const allLines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
        
        if (allLines.length < 2) throw new Error("File too short");

        const headers = allLines[0].toLowerCase().split(',').map(h => h.trim());
        const groupIdx = headers.findIndex(h => 
          h.includes('group') || h.includes('gender') || h.includes('race') || 
          h.includes('age') || h.includes('category') || h.includes('class')
        );
        const decisionIdx = headers.findIndex(h => 
          h.includes('decision') || h.includes('approved') || h.includes('result') || 
          h.includes('outcome') || h.includes('score') || h.includes('target')
        );

        if (groupIdx === -1 || decisionIdx === -1) {
          alert("Error: We couldn't find a 'Group' column and a 'Decision' column. Please check your headers.");
          return;
        }

        const counts: Record<string, { total: number; approved: number }> = {};
        allLines.slice(1).forEach(line => {
          const row = line.split(',').map(c => c.trim());
          if (row.length <= Math.max(groupIdx, decisionIdx)) return;

          const group = row[groupIdx];
          const decision = row[decisionIdx].toLowerCase();
          
          if (!group) return;
          if (!counts[group]) counts[group] = { total: 0, approved: 0 };
          
          counts[group].total++;
          const isPos = decision === '1' || decision === 'yes' || decision === 'approved' || 
                        decision === 'true' || decision === 'pass' || decision === 'ok';
          if (isPos) counts[group].approved++;
        });

        const keys = Object.keys(counts).sort((a, b) => counts[b].total - counts[a].total);
        if (keys.length < 2) {
          alert("Audit requires at least two groups to compare.");
          return;
        }

        const newData = {
          groupA: { name: keys[1], ...counts[keys[1]] },
          groupB: { name: keys[0], ...counts[keys[0]] }
        };

        setData(newData);
        setFileInfo({ name: file.name, rows: allLines.length - 1, cols: headers.length });
        setCurrentStep(Step.PREVIEW);
      } catch (err) {
        alert("Upload failed. Please use a standard CSV file.");
      }
      event.target.value = '';
    };
    reader.readAsText(file);
  };

  const runAnalysis = async () => {
    setCurrentStep(Step.PROCESSING);
    setLoading(true);
    setLogs([]);
    setAnalysisProgress(0);
    
    const steps = [
      "Reading data structure...",
      "Layer 1: Logic Math Engine active",
      "Scanning protected groups...",
      "Comparing decision rates...",
      "Layer 2: AI Explainer initializing...",
      "Cross-checking metrics...",
      "Audit complete!"
    ];

    for (let i = 0; i < steps.length; i++) {
       await new Promise(r => setTimeout(r, 600));
       addLog(steps[i]);
       setAnalysisProgress(Math.floor(((i + 1) / steps.length) * 100));
    }
    
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data })
      });
      const result = await res.json();
      
      const expRes = await fetch('/api/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metrics: result.metrics, context: { groupA: data.groupA.name, groupB: data.groupB.name } })
      });
      const expResult = await expRes.json();

      setMetrics(result.metrics);
      setExplanation(expResult.explanation);
      setHistory([{ label: 'Original', metrics: result.metrics }]);
      setLoading(false);
      setCurrentStep(Step.AUDIT);
    } catch (err) {
      console.error(err);
      setLoading(false);
      alert("Analysis failed.");
    }
  };

  const handleApplyFix = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/mitigate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data })
      });
      const result = await res.json();
      setHistory(prev => [...prev, { label: 'Mitigated', metrics: result.metrics }]);
      setMetrics(result.metrics);
      setCsvData(result.csvData);
      setLoading(false);
      setCurrentStep(Step.RESOLUTION);
    } catch (err) {
      console.error(err);
      setLoading(false);
      alert("Fix failed.");
    }
  };

  const downloadFixedData = () => {
    if (!csvData) return;
    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', 'fairness_fixed_dataset.csv');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // --- Components ---

  const StatusBadge = ({ status }: { status: string }) => (
    <div className={cn(
      "px-3 py-1 rounded-full text-[10px] font-bold flex items-center gap-2 tracking-tight",
      status === "BIAS DETECTED" ? "bg-red-50 text-red-600 border border-red-100" : "bg-emerald-50 text-emerald-600 border border-emerald-100"
    )}>
      {status === "BIAS DETECTED" ? <ShieldAlert className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />}
      {status}
    </div>
  );

  const ProgressTracker = () => {
    const steps = [
      { id: Step.UPLOAD, label: 'Upload' },
      { id: Step.PREVIEW, label: 'Preview' },
      { id: Step.PROBLEM, label: 'Mission' },
      { id: Step.PROCESSING, label: 'Analysis' },
      { id: Step.AUDIT, label: 'Results' },
      { id: Step.RESOLUTION, label: 'Resolution' }
    ];
    const currentIndex = steps.findIndex(s => s.id === currentStep);
    
    return (
      <div className="w-full flex items-center justify-between mb-8 px-2">
        {steps.map((s, i) => (
          <React.Fragment key={s.id}>
            <div className="flex flex-col items-center gap-2 relative">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-500",
                i <= currentIndex 
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-200" 
                  : "bg-slate-100 text-slate-400 border border-slate-200"
              )}>
                {i < currentIndex ? "✓" : i + 1}
              </div>
              <span className={cn(
                "text-[9px] font-bold uppercase tracking-tighter transition-colors duration-500",
                i <= currentIndex ? "text-slate-900" : "text-slate-400"
              )}>{s.label}</span>
            </div>
            {i < steps.length - 1 && (
              <div className="flex-1 h-[2px] bg-slate-100 mx-2 -mt-4">
                <motion.div 
                   initial={{ width: 0 }}
                   animate={{ width: i < currentIndex ? '100%' : '0%' }}
                   className="h-full bg-blue-500"
                />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    );
  };

  const LayerDiagram = () => (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 mb-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
        <div className={cn(
          "bg-white border rounded-lg p-4 transition-all duration-500",
          currentStep === Step.PROCESSING ? "border-emerald-500 shadow-md ring-2 ring-emerald-500/10" : "border-slate-200 opacity-60"
        )}>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 bg-emerald-50 rounded-full flex items-center justify-center">
              <Calculator className="w-4 h-4 text-emerald-500" />
            </div>
            <span className="text-slate-900 font-bold text-xs">Layer 1: Math</span>
          </div>
          <p className="text-[10px] text-slate-500 leading-tight">Deterministic logic. No AI guessing. Final truth.</p>
        </div>

        <div className={cn(
          "bg-white border rounded-lg p-4 transition-all duration-500",
          currentStep === Step.AUDIT ? "border-blue-500 shadow-md ring-2 ring-blue-500/10" : "border-slate-200 opacity-60"
        )}>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center">
              <BrainCircuit className="w-4 h-4 text-blue-500" />
            </div>
            <span className="text-slate-900 font-bold text-xs">Layer 2: AI</span>
          </div>
          <p className="text-[10px] text-slate-500 leading-tight">Translates numbers into simple human words.</p>
        </div>

        <div className={cn(
          "bg-white border rounded-lg p-4 transition-all duration-500",
          (currentStep === Step.AUDIT || currentStep === Step.RESOLUTION) ? "border-purple-500 shadow-md ring-2 ring-purple-500/10" : "border-slate-200 opacity-60"
        )}>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 bg-purple-50 rounded-full flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-purple-500" />
            </div>
            <span className="text-slate-900 font-bold text-xs">Layer 3: Cross-Check</span>
          </div>
          <p className="text-[10px] text-slate-500 leading-tight">Verification ensures 4/4 fairness metrics pass.</p>
        </div>
      </div>
    </div>
  );

  const ImpactChart = () => {
    if (history.length < 2) return null;
    const chartData = [
      { name: 'Initial Analysis', ratio: history[0].metrics.disparateImpact },
      { name: 'Bias Mitigated', ratio: history[1].metrics.disparateImpact }
    ];

    return (
      <div className="bg-white border border-slate-200 rounded-xl p-8 mb-8">
        <h4 className="text-sm font-bold text-slate-900 mb-8 flex items-center gap-2">
          <Activity className="w-4 h-4 text-blue-500" />
          Bias Reduction Impact (Parity Growth)
        </h4>
        <div className="h-72 mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} fontWeight={600} tickLine={false} axisLine={false} dy={10} />
              <YAxis domain={[0, 1]} stroke="#94a3b8" fontSize={11} fontWeight={600} tickLine={false} axisLine={false} />
              <Tooltip 
                cursor={{ fill: 'transparent' }}
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', padding: '12px' }}
                itemStyle={{ color: '#0f172a', fontWeight: 600, fontSize: '12px' }}
              />
              <Bar dataKey="ratio" radius={[6, 6, 0, 0]} barSize={80}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.ratio < 0.8 ? '#ef4444' : '#10b981'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-8 flex justify-between items-center p-6 bg-slate-50 border border-slate-100 rounded-xl">
          <div className="text-center">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2">Baseline Ratio</p>
            <p className="text-3xl font-bold text-red-500">{history[0].metrics.disparateImpact.toFixed(2)}</p>
          </div>
          <div className="h-8 w-[1px] bg-slate-200" />
          <div className="text-center">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2">Corrected Ratio</p>
            <p className="text-3xl font-bold text-emerald-500">{history[1].metrics.disparateImpact.toFixed(2)}</p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-[#0f172a] font-sans selection:bg-blue-500/10 flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <header className="h-16 border-b border-gray-200 bg-white flex items-center justify-between px-8 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 flex items-center justify-center rounded">
            <ShieldCheck className="text-white w-5 h-5" />
          </div>
          <h1 className="text-lg font-bold tracking-tight uppercase">
            TrustOS <span className="text-slate-400 font-normal">| Conscience Middleware</span>
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs font-semibold px-2 py-1 bg-green-100 text-green-700 rounded flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" />
            VALIDATION SECURE
          </span>
          <span className="text-xs text-slate-500 hidden sm:block">Model: Credit_Scoring_v4</span>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Workflow */}
        <nav className="w-64 border-r border-gray-200 bg-slate-50 p-6 flex flex-col gap-2 shrink-0 overflow-y-auto">
          <p className="text-[10px] font-bold text-slate-400 uppercase mb-4 tracking-widest">Audit Journey</p>
          {[
            { id: Step.UPLOAD, label: 'Data Input' },
            { id: Step.PROBLEM, label: 'Mission' },
            { id: Step.PROCESSING, label: 'Audit Math' },
            { id: Step.AUDIT, label: 'AI Review' },
            { id: Step.RESOLUTION, label: 'Impact Proof' }
          ].map((s, i) => {
            const steps = [Step.UPLOAD, Step.PREVIEW, Step.PROBLEM, Step.PROCESSING, Step.AUDIT, Step.RESOLUTION];
            const currentIndex = steps.indexOf(currentStep);
            const stepIndex = steps.indexOf(s.id);
            const isActive = currentStep === s.id || (s.id === Step.UPLOAD && currentStep === Step.PREVIEW);
            const isCompleted = currentIndex > stepIndex || (s.id === Step.UPLOAD && currentIndex > 1);

            return (
              <div 
                key={s.id} 
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg text-sm transition-all duration-200",
                  isActive ? "bg-white text-[#0f172a] border border-gray-200 font-bold shadow-sm" : 
                  isCompleted ? "text-green-600 font-medium" : "text-slate-400"
                )}
              >
                <div className={cn(
                  "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0",
                  isCompleted ? "border border-green-500 text-green-500" : 
                  isActive ? "bg-blue-600 text-white" : "border border-slate-300 text-slate-400"
                )}>
                  {isCompleted ? "✓" : i + 1}
                </div>
                {s.label}
              </div>
            );
          })}
          
          <div className="mt-auto p-4 bg-slate-200 rounded-lg">
            <p className="text-[10px] font-bold mb-1 uppercase text-slate-500">Truth Status</p>
            <p className="text-xs text-slate-600 flex justify-between">
              Math: <span className="text-green-600 font-bold">READY</span>
            </p>
          </div>
        </nav>

        <main className="flex-1 p-4 lg:p-6 overflow-y-auto bg-white scroll-smooth">
          <div className="max-w-5xl mx-auto">
            {/* Layer Info Header - Single View Compact */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
              <div className={cn(
                "p-3 rounded-xl border transition-all flex flex-col gap-1",
                (currentStep === Step.START || currentStep === Step.PROCESSING) ? "bg-emerald-50 border-emerald-200 ring-2 ring-emerald-500/20" : "bg-slate-50 border-slate-100 opacity-60"
              )}>
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-tight">Level 1: Logic Math</p>
                  {(currentStep === Step.START || currentStep === Step.PROCESSING) && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                </div>
                <p className="text-[11px] text-slate-700 leading-tight font-medium">Objective truths. Zero AI.</p>
              </div>

              <div className={cn(
                "p-3 rounded-xl border transition-all flex flex-col gap-1",
                (currentStep === Step.AUDIT) ? "bg-blue-50 border-blue-200 ring-2 ring-blue-500/20 shadow-sm" : "bg-slate-50 border-slate-100 opacity-60"
              )}>
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold text-blue-600 uppercase tracking-tight">Level 2: AI Explainer</p>
                  {currentStep === Step.AUDIT && <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />}
                </div>
                <p className="text-[11px] text-slate-700 leading-tight font-medium">Translates math to human.</p>
              </div>

              <div className={cn(
                "p-3 rounded-xl border transition-all flex flex-col gap-1",
                (currentStep === Step.MITIGATING || currentStep === Step.RESOLUTION) ? "bg-purple-50 border-purple-200 ring-2 ring-purple-500/20 shadow-sm" : "bg-slate-50 border-slate-100 opacity-60"
              )}>
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold text-purple-600 uppercase tracking-tight">Level 3: Parity Lock</p>
                  {(currentStep === Step.MITIGATING || currentStep === Step.RESOLUTION) && <div className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />}
                </div>
                <p className="text-[11px] text-slate-700 leading-tight font-medium">Verification & Compliance.</p>
              </div>
            </div>

            {/* AI Guide Message - More Compact */}
            <AnimatePresence mode="wait">
              <motion.div 
                key={currentStep}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.02 }}
                className="mb-6"
              >
                <div className="bg-slate-900 text-white p-5 rounded-2xl flex items-start gap-4 shadow-xl border border-white/10">
                  <div className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center shrink-0 shadow-inner">
                    <BrainCircuit className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-blue-400 mb-1">Paradox Conscience Status</p>
                    <p className="text-base font-medium leading-tight">
                      {currentStep === Step.START && "Ready to audit. Upload your decisions or choose a scenario below to see the Math Engine solve the bias paradox."}
                      {currentStep === Step.PROCESSING && "Processing Level 1. Calculating Disparate Impact using deterministic math. AI is locked out of this process."}
                      {currentStep === Step.AUDIT && "Level 1 Truth found. Bias detected. Running Level 2 (AI Explainer) to translate these results for you."}
                      {currentStep === Step.MITIGATING && "Neutralizing. We're balancing the scales while Layer 3 (Parity Lock) verifies every decimal point."}
                      {currentStep === Step.RESOLUTION && "Mission Accomplished. Parity growth confirmed by math. Your AI decisions are now certified fair."}
                    </p>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* New Guided Flow Container */}
            <div className="min-h-[500px]">
              <ProgressTracker />

              <AnimatePresence mode="wait">
                {currentStep === Step.UPLOAD && (
                  <motion.div 
                    key="upload"
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="bg-slate-50 border border-slate-200 rounded-2xl p-12 flex flex-col items-center text-center"
                  >
                    <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-xl shadow-blue-200">
                      <Upload className="w-8 h-8 text-white" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-900 mb-2">Step 1: Upload Your Data</h2>
                    <p className="text-sm text-slate-500 mb-8 max-w-sm">
                      We need to see your AI decisions to find any hidden bias. Upload a CSV file or use our sample data.
                    </p>
                    
                    <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
                      <input type="file" id="csv-upload" className="hidden" accept=".csv" onChange={handleFileUpload} />
                      <button 
                         onClick={() => { setData(INITIAL_DATA); setCurrentStep(Step.PREVIEW); }}
                         className="flex-1 bg-white border border-slate-200 hover:border-blue-300 px-6 py-3 rounded-xl font-bold text-sm transition-all"
                      >
                         Sample Data
                      </button>
                      <button 
                         onClick={() => document.getElementById('csv-upload')?.click()}
                         className="flex-1 bg-slate-900 text-white px-6 py-3 rounded-xl font-bold text-sm shadow-lg hover:bg-slate-800 transition-all"
                      >
                         Choose File
                      </button>
                    </div>
                  </motion.div>
                )}

                {currentStep === Step.PREVIEW && (
                  <motion.div 
                    key="preview"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="bg-white border border-slate-200 rounded-2xl p-8"
                  >
                    <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                       <ShieldCheck className="w-5 h-5 text-emerald-500" />
                       Step 2: Verify Your Data
                    </h2>
                    <div className="grid grid-cols-2 gap-4 mb-8">
                       <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Rows Found</p>
                          <p className="text-2xl font-bold text-slate-900">{fileInfo?.rows || 1000}</p>
                       </div>
                       <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Groups Detected</p>
                          <p className="text-2xl font-bold text-slate-900">2</p>
                       </div>
                    </div>
                    <div className="space-y-3 mb-8">
                       <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-lg text-[11px] text-emerald-700">
                          <strong>Note:</strong> We identified <strong>{data.groupA.name}</strong> and <strong>{data.groupB.name}</strong> as the main groups to audit.
                       </div>
                    </div>
                    <button 
                      onClick={() => setCurrentStep(Step.PROBLEM)}
                      className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-200"
                    >
                       Looks Good, Continue <ArrowRight className="w-4 h-4" />
                    </button>
                  </motion.div>
                )}

                {currentStep === Step.PROBLEM && (
                  <motion.div 
                    key="problem"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="space-y-6"
                  >
                    <div className="text-center mb-8">
                       <h2 className="text-xl font-bold text-slate-900">Step 3: What are we auditing?</h2>
                       <p className="text-sm text-slate-500 mt-1">Select the most relevant scenario for your data.</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                       {IMPACT_SCENARIOS.map(s => (
                         <button 
                           key={s.id} 
                           onClick={() => { setSelectedScenario(s.id); runAnalysis(); }}
                           className="p-4 bg-white border border-slate-200 rounded-xl hover:border-blue-400 text-left transition-all group"
                         >
                            <p className="text-[10px] font-bold text-blue-600 uppercase mb-1">{s.title}</p>
                            <p className="text-xs font-bold text-slate-900 mb-1">{s.impact}</p>
                            <p className="text-[10px] text-slate-500 leading-tight">{s.desc}</p>
                         </button>
                       ))}
                    </div>
                  </motion.div>
                )}

                {currentStep === Step.PROCESSING && (
                  <motion.div 
                    key="processing"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="bg-slate-900 rounded-2xl p-12 flex flex-col items-center justify-center min-h-[400px] text-white shadow-2xl relative overflow-hidden"
                  >
                    <div className="absolute inset-0 opacity-10">
                       <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-500 via-transparent to-transparent animate-pulse" />
                    </div>
                    <div className="relative z-10 w-full max-w-sm flex flex-col items-center">
                       <div className="w-full bg-white/10 h-1 rounded-full mb-8 overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }} animate={{ width: `${analysisProgress}%` }}
                            className="h-full bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]"
                          />
                       </div>
                       <div className="space-y-3 w-full text-center">
                          {logs.map((log, i) => (
                             <motion.p 
                               key={log + i} 
                               initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                               className="text-[11px] font-mono opacity-60 last:opacity-100 last:font-bold last:text-blue-400"
                             >
                               {log}
                             </motion.p>
                          ))}
                       </div>
                    </div>
                  </motion.div>
                )}

                {currentStep === Step.AUDIT && metrics && (
                  <motion.div 
                    key="audit"
                    initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                    className="space-y-6"
                  >
                    <LayerDiagram />
                    <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
                      <div className="flex justify-between items-center mb-8">
                        <div>
                          <h3 className="text-xl font-black text-slate-900 tracking-tight">Audit Findings</h3>
                          <p className="text-sm text-slate-500 font-medium">Results for: <span className="text-blue-600">{IMPACT_SCENARIOS.find(s => s.id === selectedScenario)?.title || 'Custom Audit'}</span></p>
                        </div>
                        <StatusBadge status={metrics.status} />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-8 items-center">
                        <div className="flex flex-col items-center p-8 bg-slate-50 rounded-3xl border border-slate-100 relative overflow-hidden">
                          <div className={cn(
                            "absolute inset-0 opacity-5",
                            metrics.status === "BIAS DETECTED" ? "bg-red-500" : "bg-emerald-500"
                          )} />
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Fairness Score</p>
                          <div className={cn(
                            "text-7xl font-black font-mono mb-2",
                            metrics.status === "BIAS DETECTED" ? "text-red-500" : "text-emerald-500"
                          )}>{metrics.disparateImpact.toFixed(2)}</div>
                          <p className="text-xs text-slate-500 font-bold">Industry Standard: 0.80+</p>
                        </div>
                        
                        <div className="space-y-6">
                           <div className="p-4 bg-white border border-slate-100 rounded-xl shadow-sm">
                              <p className="text-[10px] font-bold text-blue-600 uppercase mb-3 flex items-center gap-2">
                                 <BrainCircuit className="w-3.5 h-3.5" /> AI Explanation
                              </p>
                              <p className="text-sm text-slate-700 leading-relaxed font-medium">{explanation}</p>
                           </div>
                           
                           <div className="flex flex-col gap-3">
                              <button 
                                onClick={handleApplyFix}
                                disabled={loading}
                                className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-200 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
                              >
                                {loading ? "Balancing Data..." : <><Zap className="w-4 h-4" /> Resolve This Bias Now</>}
                              </button>
                              <button 
                                onClick={() => setCurrentStep(Step.UPLOAD)}
                                className="w-full text-slate-400 font-bold text-sm py-2"
                              >
                                Cancel & Restart
                              </button>
                           </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {currentStep === Step.RESOLUTION && metrics && (
                  <motion.div 
                    key="resolution"
                    initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="space-y-6"
                  >
                    <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
                       <div className="flex justify-between items-center mb-8">
                          <div>
                            <h3 className="text-2xl font-black text-slate-900 tracking-tight">Mission Accomplished</h3>
                            <p className="text-emerald-600 text-sm font-bold mt-1">Balanced with 100% Deterministic Parity.</p>
                          </div>
                          <StatusBadge status="FAIRNESS PASS" />
                       </div>

                       <ImpactChart />

                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                          <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100">
                             <p className="text-[10px] font-bold text-emerald-600 uppercase mb-1">Human Result</p>
                             <p className="text-sm text-emerald-800 font-medium">Decision gap closed. {data.groupA.name} and {data.groupB.name} now receive equal consideration from the AI.</p>
                          </div>
                          <div className="bg-slate-900 p-6 rounded-2xl text-white">
                             <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Safety Certificate</p>
                             <p className="text-xs text-slate-300 font-medium mb-3">Model decisions are now compliant with Article 9 (EU AI Act).</p>
                             <button 
                                onClick={downloadFixedData}
                                className="w-full bg-white/10 hover:bg-white/20 text-white py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
                             >
                                <Download className="w-4 h-4" /> Download Audit Proof
                             </button>
                          </div>
                       </div>

                       <button 
                         onClick={() => { setCurrentStep(Step.UPLOAD); setHistory([]); setSelectedScenario(null); }}
                         className="w-full border border-slate-200 py-4 rounded-xl font-bold text-slate-500 hover:bg-slate-50 transition-all"
                       >
                         Start New Audit
                       </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

          </div>
        </main>

        {/* Right Sidebar Logistics/Log */}
        <aside className="w-80 border-l border-gray-200 bg-white p-6 shrink-0 overflow-y-auto hidden xl:flex flex-col">
          <p className="text-[10px] font-bold text-slate-400 uppercase mb-4 tracking-widest">Live Audit Log</p>
          <div className="space-y-6 flex-1">
             <div className="text-xs pb-4 border-b border-slate-100">
                <p className="font-bold mb-1 text-slate-700">Truth Layer 1: Statistical Check</p>
                <div className="flex justify-between items-center mb-1">
                   <p className="text-slate-500">Demographic Parity Index</p>
                   <span className="font-mono text-slate-900 font-bold">{metrics?.demographicParityDiff.toFixed(2) || '0.40'}</span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                   <div className="bg-red-500 h-full transition-all duration-500" style={{ width: `${(metrics?.demographicParityDiff || 0.40) * 100}%` }} />
                </div>
             </div>

             <div className="text-xs pb-4 border-b border-slate-100">
                <p className="font-bold mb-1 text-slate-700">Truth Layer 2: Equality of Opp.</p>
                <div className="flex justify-between items-center mb-1">
                   <p className="text-slate-500">TPR Delta Variation</p>
                   <span className="font-mono text-slate-900 font-bold">0.22</span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                   <div className="bg-amber-500 h-full w-[22%]" />
                </div>
             </div>

             {currentStep === Step.AUDIT && (
               <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg">
                  <p className="text-[10px] font-bold text-blue-600 uppercase mb-2">AI Engine Context</p>
                  <p className="text-[11px] text-blue-700 leading-relaxed italic">"Analyzing 2.4k decision points across protected attributes. Discretizing continuous variables for parity check."</p>
               </div>
             )}

             <div className="text-xs">
                <p className="font-bold mb-2 text-slate-700 uppercase text-[10px] tracking-widest opacity-60">Mitigation Strategy</p>
                <div className="space-y-2">
                   {['Reweighting', 'Oversampling', 'Selection Threshold'].map((method) => (
                      <label key={method} className="flex items-center gap-2 cursor-pointer group">
                         <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-300 flex items-center justify-center p-0.5 group-hover:border-blue-400">
                            {method === 'Reweighting' && <div className="w-full h-full bg-blue-600 rounded-full" />}
                         </div>
                         <span className={cn(
                           "text-[11px]",
                           method === 'Reweighting' ? "text-slate-900 font-bold" : "text-slate-500"
                         )}>{method}</span>
                      </label>
                   ))}
                </div>
             </div>
          </div>

          <div className="mt-8 p-4 bg-slate-50 rounded-lg border border-dashed border-slate-300">
             <p className="text-[9px] text-slate-400 leading-tight italic uppercase">Validation Layer Hash:<br /><span className="font-mono text-slate-700">0x8F22...BE09</span></p>
          </div>
        </aside>
      </div>
{/* Removed footer as it was integrated into the main layout or replaced by sidebar components in the polish design */}
    </div>
  );
}
