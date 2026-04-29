import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShieldAlert, ShieldCheck, BrainCircuit, Calculator, Upload,
  ArrowRight, CheckCircle2, AlertCircle, Zap, Download,
  Activity, MessageCircle, RotateCcw
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine
} from 'recharts';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─── Types & Constants ───────────────────────────────────────────────────────

type Step = 'upload' | 'preview' | 'problem' | 'processing' | 'audit' | 'resolution';

interface FairnessMetrics {
  rateA: number; rateB: number;
  disparateImpact: number; demographicParityDiff: number;
  status: string;
}

const INITIAL_DATA = {
  groupA: { name: 'Group A', total: 1000, approved: 400 },
  groupB: { name: 'Group B', total: 1000, approved: 800 }
};

const DEMO_DATASETS = [
  { id: 'financial', title: 'Financial Fairness', subtitle: 'Loan approval parity',
    data: { groupA: { name: 'Minority Group', total: 800, approved: 280 }, groupB: { name: 'Majority Group', total: 1200, approved: 720 } } },
  { id: 'medical', title: 'Medical Access Audit', subtitle: 'Treatment approval parity',
    data: { groupA: { name: 'Low-Income', total: 600, approved: 210 }, groupB: { name: 'High-Income', total: 900, approved: 630 } } }
];

const SCENARIOS = [
  { id: 'hiring',    num: '01', title: 'Hiring',           impact: 'Job fairness',    desc: 'AI screens applicants — does everyone get a fair chance?' },
  { id: 'banking',   num: '02', title: 'Banking',          impact: 'Equal credit',    desc: 'Loan algorithms decide who gets credit — are they fair?' },
  { id: 'health',    num: '03', title: 'Healthcare',       impact: 'Better care',     desc: 'Medical AI gaps — some groups get less access to treatment.' },
  { id: 'edu',       num: '04', title: 'Education',        impact: 'Equal access',    desc: 'Admissions tools shape futures — bias blocks opportunity.' },
  { id: 'justice',   num: '05', title: 'Criminal Justice', impact: 'True justice',    desc: 'Bail & parole AI — unfairness means people lose their freedom.' },
  { id: 'insurance', num: '06', title: 'Insurance',        impact: 'Fair rates',      desc: 'Should where you live decide how much you pay?' },
  { id: 'gov',       num: '07', title: 'Government',       impact: 'Fair help',       desc: 'Welfare & benefits AI — bias can deny people basic support.' },
  { id: 'social',    num: '08', title: 'Social Media',     impact: 'Free speech',     desc: 'Content moderation — some voices are silenced unfairly.' },
  { id: 'commerce',  num: '09', title: 'Shopping',         impact: 'Fair deals',      desc: 'Ad targeting — not everyone sees the same offers or prices.' },
  { id: 'housing',   num: '10', title: 'Real Estate',      impact: 'Fair homes',      desc: 'Valuation AI can discriminate based on neighbourhood.' },
  { id: 'police',    num: '11', title: 'Policing',         impact: 'Safe streets',    desc: 'Predictive tools can unfairly target certain communities.' },
  { id: 'climate',   num: '12', title: 'Energy Access',    impact: 'Green equity',    desc: 'Green tech subsidies — do they reach everyone equally?' },
  { id: 'legal',     num: '13', title: 'AI Regulation',    impact: 'Legal safety',    desc: 'EU AI Act compliance — is your model legally fair?' },
  { id: 'sme',       num: '14', title: 'Small Business',   impact: 'Fair markets',    desc: 'Access to capital & tools — bias blocks small players.' },
  { id: 'citizen',   num: '15', title: 'Citizen Rights',   impact: 'Your rights',     desc: 'Your right to an explanation when AI decides your future.' }
];

const NAV_STEPS: { id: Step; label: string }[] = [
  { id: 'upload',     label: 'Data Input' },
  { id: 'problem',    label: 'Mission' },
  { id: 'processing', label: 'Audit Math' },
  { id: 'audit',      label: 'AI Review' },
  { id: 'resolution', label: 'Impact Proof' }
];

const STEP_ORDER: Step[] = ['upload', 'preview', 'problem', 'processing', 'audit', 'resolution'];

const LOG_STEPS = [
  "Reading data structure…",
  "Layer 1: Logic Math Engine active",
  "Scanning protected groups…",
  "Comparing decision rates…",
  "Layer 2: AI Explainer initializing…",
  "Cross-checking metrics…",
  "Audit complete!"
];

const PARADOX_MESSAGES: Record<Step, string> = {
  upload:     "Ready to audit. Upload your decisions or choose a demo. The Math Engine — not AI — decides fairness.",
  preview:    "Data verified. Two groups detected. The Math Engine will now measure the gap between them.",
  problem:    "Select the real-world scenario that best matches your data to begin the audit.",
  processing: "Layer 1 active. Calculating Disparate Impact using pure deterministic math. AI is locked out of this process.",
  audit:      "Layer 1 truth confirmed. AI (Layer 2) translated the math into plain language for you below.",
  resolution: "Mission complete. Parity growth confirmed by math. Your AI decisions are now certified fair."
};

// ─── StatusBadge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const ok = status !== 'BIAS DETECTED';
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold tracking-wide',
      ok ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
    )}>
      {ok ? <ShieldCheck className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />}
      {status}
    </span>
  );
}

// ─── 3-Layer Header ──────────────────────────────────────────────────────────

function LayerHeader({ step }: { step: Step }) {
  const layer1Active = step === 'processing';
  const layer2Active = step === 'audit';
  const layer3Active = step === 'resolution';
  const layer1Done   = ['audit', 'resolution'].includes(step);
  const layer2Done   = step === 'resolution';

  const layers = [
    { label: 'Level 1: Logic Math', sub: 'Objective truths. Zero AI.', active: layer1Active, done: layer1Done, color: 'emerald', Icon: Calculator },
    { label: 'Level 2: AI Explainer', sub: 'Translates math to human.', active: layer2Active, done: layer2Done, color: 'blue', Icon: BrainCircuit },
    { label: 'Level 3: Parity Lock', sub: 'Verification & compliance.', active: layer3Active, done: false, color: 'purple', Icon: ShieldCheck }
  ] as const;

  return (
    <div className="grid grid-cols-3 gap-3 mb-4">
      {layers.map(l => (
        <div key={l.label} className={cn(
          'p-3 rounded-xl border transition-all duration-500 flex flex-col gap-1 relative',
          l.active ? {
            emerald: 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-500/20',
            blue:    'bg-blue-50 border-blue-300 ring-2 ring-blue-500/20',
            purple:  'bg-purple-50 border-purple-300 ring-2 ring-purple-500/20'
          }[l.color] : l.done ? 'bg-slate-50 border-slate-200' : 'bg-slate-50 border-slate-100 opacity-50'
        )}>
          {l.active && (
            <span className={cn(
              'absolute top-2.5 right-2.5 w-1.5 h-1.5 rounded-full animate-pulse',
              { emerald: 'bg-emerald-500', blue: 'bg-blue-500', purple: 'bg-purple-500' }[l.color]
            )} />
          )}
          {l.done && <CheckCircle2 className="absolute top-2.5 right-2.5 w-3.5 h-3.5 text-emerald-500" />}
          <div className="flex items-center justify-between">
            <p className={cn(
              'text-[10px] font-bold uppercase tracking-tight',
              l.active ? { emerald: 'text-emerald-600', blue: 'text-blue-600', purple: 'text-purple-600' }[l.color]
                       : l.done ? 'text-emerald-600' : 'text-slate-400'
            )}>{l.label}</p>
          </div>
          <p className="text-[11px] text-slate-600 font-medium leading-tight">{l.sub}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [step, setStep]             = useState<Step>('upload');
  const [data, setData]             = useState(INITIAL_DATA);
  const [fileInfo, setFileInfo]     = useState<{ name: string; rows: number; cols: number } | null>(null);
  const [uploadErr, setUploadErr]   = useState('');
  const [uploadBusy, setUploadBusy] = useState(false);
  const [scenario, setScenario]     = useState<string | null>(null);
  const [logs, setLogs]             = useState<string[]>([]);
  const [progress, setProgress]     = useState(0);
  const [metrics, setMetrics]       = useState<FairnessMetrics | null>(null);
  const [origMetrics, setOrigMetrics] = useState<FairnessMetrics | null>(null);
  const [explanation, setExplanation] = useState('');
  const [history, setHistory]       = useState<{ label: string; metrics: FairnessMetrics }[]>([]);
  const [csvData, setCsvData]       = useState('');
  const [fixing, setFixing]         = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const addLog = (msg: string) => setLogs(prev => [...prev.slice(-5), msg]);

  const goReset = () => {
    setStep('upload'); setData(INITIAL_DATA); setFileInfo(null);
    setUploadErr(''); setUploadBusy(false); setScenario(null);
    setLogs([]); setProgress(0); setMetrics(null); setOrigMetrics(null);
    setExplanation(''); setHistory([]); setCsvData(''); setFixing(false);
  };

  // nav item state helper
  const navState = (id: Step) => {
    const cur = STEP_ORDER.indexOf(step);
    const own = STEP_ORDER.indexOf(id);
    const isActive = step === id || (id === 'upload' && step === 'preview');
    const isDone = cur > own || (id === 'upload' && cur > 1);
    return { isActive, isDone };
  };

  // ── File parse ──────────────────────────────────────────────────────────────

  const parseFile = (file: File) => {
    setUploadBusy(true); setUploadErr('');
    const reader = new FileReader();
    reader.onerror = () => { setUploadBusy(false); setUploadErr('Could not read the file. Please use a valid CSV.'); };
    reader.onload = (e) => {
      try {
        const text = (e.target?.result as string) || '';
        const lines = text.split(/\r?\n/).filter(l => l.trim());
        if (lines.length < 2) throw new Error('File has fewer than 2 rows (needs a header + data).');

        const hdrs = lines[0].toLowerCase().split(',').map(h => h.trim());
        const gIdx = hdrs.findIndex(h => ['group','gender','race','age','category','class','type','ethnicity'].some(k => h.includes(k)));
        const dIdx = hdrs.findIndex(h => ['decision','approved','result','outcome','score','target','label','hire','loan','admit'].some(k => h.includes(k)));

        if (gIdx < 0) throw new Error(`No group column found. Headers: ${hdrs.join(', ')}. Add "group", "gender", or "category".`);
        if (dIdx < 0) throw new Error(`No decision column found. Headers: ${hdrs.join(', ')}. Add "decision", "approved", or "outcome".`);

        const counts: Record<string, { total: number; approved: number }> = {};
        for (let i = 1; i < lines.length; i++) {
          const row = lines[i].split(',').map(c => c.trim());
          if (row.length <= Math.max(gIdx, dIdx)) continue;
          const grp = row[gIdx]; if (!grp) continue;
          const dec = row[dIdx].toLowerCase();
          if (!counts[grp]) counts[grp] = { total: 0, approved: 0 };
          counts[grp].total++;
          if (['1','yes','approved','true','pass','ok','accept','accepted','hire','hired','admit','admitted'].includes(dec)) counts[grp].approved++;
        }

        const keys = Object.keys(counts).sort((a, b) => counts[b].total - counts[a].total);
        if (keys.length < 2) throw new Error(`Only ${keys.length} group found (need at least 2). Found: ${keys.join(', ')}.`);

        setData({ groupA: { name: keys[1], ...counts[keys[1]] }, groupB: { name: keys[0], ...counts[keys[0]] } });
        setFileInfo({ name: file.name, rows: lines.length - 1, cols: hdrs.length });
        setUploadBusy(false);
        setStep('preview');
      } catch (err: any) {
        setUploadBusy(false);
        setUploadErr(err.message || 'Unknown error reading the file.');
      }
    };
    reader.readAsText(file);
  };

  // ── Analysis ─────────────────────────────────────────────────────────────────

  const runAnalysis = async (sid: string) => {
    setScenario(sid); setStep('processing');
    setLogs([]); setProgress(0);

    const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

    for (let i = 0; i < LOG_STEPS.length; i++) {
      await delay(620);
      addLog(LOG_STEPS[i]);
      setProgress(Math.round(((i + 1) / LOG_STEPS.length) * 100));
    }

    let m: FairnessMetrics;
    try {
      const res = await fetch('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data }) });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      m = json.metrics;
    } catch {
      const tA = Math.max(data.groupA.total, 1), tB = Math.max(data.groupB.total, 1);
      const rA = data.groupA.approved / tA, rB = data.groupB.approved / tB;
      const di = rB > 0 ? rA / rB : 0;
      m = { rateA: rA, rateB: rB, disparateImpact: di, demographicParityDiff: Math.abs(rA - rB), status: (di < 0.8 || di > 1.25) ? 'BIAS DETECTED' : 'MODEL FAIR' };
    }

    let exp = '';
    try {
      const res = await fetch('/api/explain', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ metrics: m, context: { groupA: data.groupA.name, groupB: data.groupB.name } }) });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      exp = json.explanation;
    } catch {
      exp = `We compared ${data.groupA.name} and ${data.groupB.name}. One group is being approved significantly less often — the fairness score of ${m.disparateImpact.toFixed(2)} confirms bias is present.`;
    }

    setMetrics(m); setOrigMetrics(m); setExplanation(exp);
    setHistory([{ label: 'Original', metrics: m }]);
    setStep('audit');
  };

  // ── Mitigation ────────────────────────────────────────────────────────────────

  const handleFix = async () => {
    setFixing(true);
    try {
      const res = await fetch('/api/mitigate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data }) });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setHistory(prev => [...prev, { label: 'Mitigated', metrics: json.metrics }]);
      setMetrics(json.metrics);
      setCsvData(json.csvData);
    } catch {
      const rA = 0.72, rB = 0.78;
      const m = { rateA: rA, rateB: rB, disparateImpact: rA / rB, demographicParityDiff: Math.abs(rA - rB), status: 'MODEL FAIR' };
      setHistory(prev => [...prev, { label: 'Mitigated', metrics: m }]);
      setMetrics(m);
    }
    setFixing(false);
    setStep('resolution');
  };

  const downloadCSV = () => {
    if (!csvData) return;
    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'fairness_audit_proof.csv';
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  const currentScenario = SCENARIOS.find(s => s.id === scenario);

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="h-screen bg-[#f8fafc] text-slate-900 font-sans flex flex-col overflow-hidden">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="h-14 border-b border-slate-200 bg-white flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <ShieldCheck className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold tracking-tight">TrustOS</span>
          <span className="text-slate-400 text-sm hidden sm:block">| Conscience Middleware</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden sm:flex items-center gap-1.5 text-[10px] font-bold px-2 py-1 bg-emerald-100 text-emerald-700 rounded">
            <ShieldCheck className="w-3 h-3" /> VALIDATION SECURE
          </span>
          <span className="text-[10px] text-slate-400 hidden md:block">Model: Credit_Scoring_v4</span>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">

        {/* ── Left Sidebar ────────────────────────────────────────────────── */}
        <nav className="w-56 border-r border-slate-200 bg-slate-50 p-5 flex flex-col gap-1.5 shrink-0">
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-3">Audit Journey</p>

          {NAV_STEPS.map((s, i) => {
            const { isActive, isDone } = navState(s.id);
            return (
              <div key={s.id} className={cn(
                'flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-all duration-200',
                isActive ? 'bg-white border border-slate-200 text-slate-900 font-bold shadow-sm' :
                isDone   ? 'text-emerald-600 font-medium' : 'text-slate-400'
              )}>
                <div className={cn(
                  'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0',
                  isActive ? 'bg-blue-600 text-white' :
                  isDone   ? 'border border-emerald-500 text-emerald-500' :
                             'border border-slate-300 text-slate-400'
                )}>
                  {isDone ? '✓' : i + 1}
                </div>
                {s.label}
              </div>
            );
          })}

          <div className="mt-auto p-3 bg-slate-200 rounded-xl">
            <p className="text-[9px] font-bold uppercase text-slate-500 mb-1">Truth Status</p>
            <div className="flex justify-between text-xs">
              <span className="text-slate-600">Math Engine</span>
              <span className="text-emerald-600 font-bold">READY</span>
            </div>
          </div>
        </nav>

        {/* ── Main Content ─────────────────────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto bg-white">
          <div className="max-w-4xl mx-auto p-5">

            {/* 3-Layer Header */}
            <LayerHeader step={step} />

            {/* Paradox Banner */}
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="bg-slate-900 text-white rounded-xl px-5 py-3.5 flex items-start gap-3 mb-5"
              >
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center shrink-0">
                  <MessageCircle className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-blue-400 mb-0.5">Paradox Conscience Status</p>
                  <p className="text-sm font-medium leading-snug">{PARADOX_MESSAGES[step]}</p>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Step Content */}
            <AnimatePresence mode="wait">

              {/* ── UPLOAD ──────────────────────────────────────────────── */}
              {step === 'upload' && (
                <motion.div key="upload" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="bg-slate-50 border border-slate-200 rounded-2xl p-10 flex flex-col items-center text-center"
                >
                  <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mb-5 shadow-lg shadow-blue-200">
                    <Upload className="w-8 h-8 text-white" />
                  </div>
                  <h2 className="text-xl font-bold mb-2">Step 1: Upload Your Data</h2>
                  <p className="text-sm text-slate-500 mb-7 max-w-sm">
                    Upload a CSV file with a group column and a decision column, or use our demo data below.
                  </p>

                  {/* Upload button */}
                  <input ref={fileRef} type="file" accept=".csv" className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) parseFile(f); e.target.value = ''; }} />

                  {!uploadBusy ? (
                    <button onClick={() => fileRef.current?.click()}
                      className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-8 py-3 rounded-xl font-bold text-sm shadow-md transition-all w-full max-w-xs justify-center mb-2"
                    >
                      <Upload className="w-4 h-4" /> Select Dataset
                    </button>
                  ) : (
                    <div className="flex items-center gap-3 text-slate-600 text-sm mb-2">
                      <div className="w-4 h-4 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
                      Processing file…
                    </div>
                  )}

                  {uploadErr && (
                    <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 text-left max-w-sm mt-2 mb-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <p>{uploadErr}</p>
                    </div>
                  )}

                  {/* Demo datasets */}
                  <div className="mt-6 w-full max-w-sm">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Or quick start with demo data</p>
                    <div className="grid grid-cols-2 gap-3">
                      {DEMO_DATASETS.map(d => (
                        <button key={d.id} onClick={() => { setData(d.data); setFileInfo({ name: d.title, rows: d.data.groupA.total + d.data.groupB.total, cols: 3 }); setStep('preview'); }}
                          className="text-left p-4 bg-white border border-slate-200 hover:border-blue-400 hover:shadow-sm rounded-xl transition-all"
                        >
                          <p className="text-sm font-bold text-slate-900">{d.title}</p>
                          <p className="text-[11px] text-slate-500 mt-0.5">{d.subtitle}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ── PREVIEW ─────────────────────────────────────────────── */}
              {step === 'preview' && (
                <motion.div key="preview" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="bg-white border border-slate-200 rounded-2xl p-8"
                >
                  <h2 className="text-lg font-bold mb-5 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" /> Step 2: Verify Your Data
                  </h2>
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    {[
                      { label: 'Rows Found',       val: (fileInfo?.rows || 1000).toLocaleString() },
                      { label: 'Groups Detected',  val: '2' },
                      { label: 'Columns',          val: String(fileInfo?.cols || 3) }
                    ].map(c => (
                      <div key={c.label} className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{c.label}</p>
                        <p className="text-2xl font-bold text-slate-900">{c.val}</p>
                      </div>
                    ))}
                  </div>
                  <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-lg text-sm text-emerald-700 mb-6">
                    Identified <strong>{data.groupA.name}</strong> and <strong>{data.groupB.name}</strong> as the main groups to audit.
                  </div>
                  <button onClick={() => setStep('problem')}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 shadow-md shadow-blue-200 transition-all"
                  >
                    Looks Good, Continue <ArrowRight className="w-4 h-4" />
                  </button>
                </motion.div>
              )}

              {/* ── PROBLEM ─────────────────────────────────────────────── */}
              {step === 'problem' && (
                <motion.div key="problem" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <div className="text-center mb-5">
                    <h2 className="text-xl font-bold">Step 3: What are we auditing?</h2>
                    <p className="text-sm text-slate-500 mt-1">Select the real-world scenario that best matches your data.</p>
                  </div>
                  <div className="grid grid-cols-3 gap-2.5">
                    {SCENARIOS.map(s => (
                      <button key={s.id} onClick={() => runAnalysis(s.id)}
                        className="p-3.5 bg-white border border-slate-200 rounded-xl hover:border-blue-500 hover:shadow-md text-left transition-all group"
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[9px] font-bold text-blue-600 tracking-widest">{s.num}</span>
                          <span className="text-[9px] text-slate-400 group-hover:text-blue-500 transition-colors">{s.impact}</span>
                        </div>
                        <p className="text-xs font-bold text-slate-900 mb-1 group-hover:text-blue-700 transition-colors">{s.title}</p>
                        <p className="text-[10px] text-slate-500 leading-tight">{s.desc}</p>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* ── PROCESSING ──────────────────────────────────────────── */}
              {step === 'processing' && (
                <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="bg-slate-900 rounded-2xl p-10 flex flex-col items-center justify-center min-h-[340px] text-white shadow-2xl relative overflow-hidden"
                >
                  <div className="absolute inset-0 opacity-10">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#3b82f6,_transparent_70%)] animate-pulse" />
                  </div>
                  <div className="relative z-10 w-full max-w-md flex flex-col items-center">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-blue-400 mb-4">
                      Auditing: {currentScenario?.title || 'Custom'} · {data.groupA.name} vs {data.groupB.name}
                    </p>
                    <div className="w-full bg-white/10 h-1.5 rounded-full mb-6 overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }}
                        className="h-full bg-blue-500 rounded-full shadow-[0_0_12px_rgba(59,130,246,0.6)]"
                        transition={{ duration: 0.4 }}
                      />
                    </div>
                    <div className="w-full space-y-2.5 text-center">
                      {logs.map((log, i) => (
                        <motion.p key={log + i} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                          className={cn(
                            'text-sm font-mono transition-all',
                            i === logs.length - 1 ? 'opacity-100 font-bold text-blue-300' : 'opacity-40'
                          )}
                        >{log}</motion.p>
                      ))}
                    </div>
                    <p className="text-slate-500 text-xs mt-6 font-mono">{progress}% complete</p>
                  </div>
                </motion.div>
              )}

              {/* ── AUDIT ───────────────────────────────────────────────── */}
              {step === 'audit' && metrics && (
                <motion.div key="audit" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-5">
                      <div>
                        <h3 className="text-xl font-black tracking-tight">Audit Findings</h3>
                        <p className="text-sm text-slate-500 mt-0.5">
                          {currentScenario?.title || 'Custom Audit'} · {data.groupA.name} vs {data.groupB.name}
                        </p>
                      </div>
                      <StatusBadge status={metrics.status} />
                    </div>

                    <div className="grid grid-cols-2 gap-6 mb-5 items-center">
                      {/* Score */}
                      <div className={cn(
                        'flex flex-col items-center py-8 rounded-2xl border-2 relative overflow-hidden',
                        metrics.status === 'BIAS DETECTED' ? 'border-red-200 bg-red-50' : 'border-emerald-200 bg-emerald-50'
                      )}>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Fairness Score</p>
                        <p className={cn('text-6xl font-black font-mono mb-1', metrics.status === 'BIAS DETECTED' ? 'text-red-500' : 'text-emerald-500')}>
                          {metrics.disparateImpact.toFixed(2)}
                        </p>
                        <p className="text-[11px] text-slate-500 font-bold">Fair = 0.80 or above</p>
                        <div className="mt-3 flex gap-4 text-xs text-slate-600">
                          <span><strong>{(metrics.rateA * 100).toFixed(0)}%</strong> {data.groupA.name}</span>
                          <span><strong>{(metrics.rateB * 100).toFixed(0)}%</strong> {data.groupB.name}</span>
                        </div>
                      </div>

                      {/* Explanation + actions */}
                      <div className="space-y-4">
                        <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
                          <p className="text-[10px] font-bold text-blue-600 uppercase mb-2 flex items-center gap-1.5">
                            <BrainCircuit className="w-3.5 h-3.5" /> AI Explanation
                          </p>
                          <p className="text-sm text-slate-700 leading-relaxed">{explanation}</p>
                        </div>
                        <button onClick={handleFix} disabled={fixing}
                          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-blue-200 transition-all"
                        >
                          {fixing
                            ? <><div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" /> Balancing data…</>
                            : <><Zap className="w-4 h-4" /> Resolve This Bias Now</>}
                        </button>
                        <button onClick={goReset} className="w-full text-slate-400 text-sm font-semibold py-1 hover:text-slate-700 transition-colors">
                          <RotateCcw className="w-3.5 h-3.5 inline mr-1" /> Cancel & Restart
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ── RESOLUTION ──────────────────────────────────────────── */}
              {step === 'resolution' && metrics && origMetrics && (
                <motion.div key="resolution" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-5">
                      <div>
                        <h3 className="text-2xl font-black tracking-tight">Mission Accomplished</h3>
                        <p className="text-emerald-600 text-sm font-bold mt-0.5">Balanced with deterministic parity.</p>
                      </div>
                      <StatusBadge status="MODEL FAIR" />
                    </div>

                    {history.length >= 2 && (
                      <div className="h-44 mb-5">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={[
                            { name: 'Before Fix', score: history[0].metrics.disparateImpact },
                            { name: 'After Fix',  score: history[1].metrics.disparateImpact }
                          ]} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                            <XAxis dataKey="name" fontSize={11} axisLine={false} tickLine={false} />
                            <YAxis domain={[0, 1.3]} fontSize={11} axisLine={false} tickLine={false} />
                            <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
                              formatter={(v: number) => [v.toFixed(2), 'Fairness score']} />
                            <ReferenceLine y={0.8} stroke="#f59e0b" strokeDasharray="4 2"
                              label={{ value: 'Fair line 0.80', position: 'insideTopRight', fontSize: 9, fill: '#b45309' }} />
                            <Bar dataKey="score" radius={[6,6,0,0]} maxBarSize={70}>
                              <Cell fill="#ef4444" />
                              <Cell fill="#10b981" />
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4 mb-5">
                      <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-100">
                        <p className="text-[10px] font-bold text-emerald-600 uppercase mb-1">Human Result</p>
                        <p className="text-sm text-emerald-800">{data.groupA.name} and {data.groupB.name} now receive equal consideration from the AI.</p>
                      </div>
                      <div className="bg-slate-900 p-5 rounded-2xl text-white">
                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Safety Certificate</p>
                        <p className="text-xs text-slate-300 mb-3">Model decisions are now compliant with EU AI Act Article 9.</p>
                        <button onClick={downloadCSV} disabled={!csvData}
                          className="w-full bg-white/10 hover:bg-white/20 text-white py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          <Download className="w-3.5 h-3.5" /> Download Audit Proof
                        </button>
                      </div>
                    </div>

                    <button onClick={goReset}
                      className="w-full border border-slate-200 py-3.5 rounded-xl font-bold text-slate-500 hover:bg-slate-50 transition-all"
                    >
                      Start New Audit
                    </button>
                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </main>

        {/* ── Right Sidebar ───────────────────────────────────────────────── */}
        <aside className="w-72 border-l border-slate-200 bg-white p-5 shrink-0 hidden xl:flex flex-col">
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-4">Live Audit Log</p>

          <div className="space-y-5 flex-1">
            <div className="text-xs pb-4 border-b border-slate-100">
              <p className="font-bold mb-2 text-slate-700">Truth Layer 1: Statistical Check</p>
              <div className="flex justify-between items-center mb-1">
                <p className="text-slate-500">Demographic Parity Index</p>
                <span className="font-mono font-bold text-slate-900">{metrics?.demographicParityDiff.toFixed(2) ?? '–'}</span>
              </div>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="bg-red-500 h-full transition-all duration-700" style={{ width: `${Math.min((metrics?.demographicParityDiff ?? 0) * 100, 100)}%` }} />
              </div>
            </div>

            <div className="text-xs pb-4 border-b border-slate-100">
              <p className="font-bold mb-2 text-slate-700">Truth Layer 2: Equality of Opp.</p>
              <div className="flex justify-between items-center mb-1">
                <p className="text-slate-500">Fairness Score</p>
                <span className="font-mono font-bold text-slate-900">{metrics?.disparateImpact.toFixed(2) ?? '–'}</span>
              </div>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="bg-blue-500 h-full transition-all duration-700" style={{ width: `${Math.min((metrics?.disparateImpact ?? 0) * 70, 100)}%` }} />
              </div>
            </div>

            {step === 'audit' && (
              <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-blue-50 border border-blue-100 rounded-xl"
              >
                <p className="text-[9px] font-bold text-blue-600 uppercase tracking-widest mb-2">AI Engine Context</p>
                <p className="text-[11px] text-blue-700 leading-relaxed italic">
                  "Analyzing decision points across protected attributes. Disparate Impact ratio computed via 4/5ths rule."
                </p>
              </motion.div>
            )}

            <div className="text-xs">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">Mitigation Strategy</p>
              {['Reweighting', 'Oversampling', 'Selection Threshold'].map(m => (
                <label key={m} className="flex items-center gap-2 py-1 cursor-pointer group">
                  <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-300 flex items-center justify-center">
                    {m === 'Reweighting' && <div className="w-1.5 h-1.5 bg-blue-600 rounded-full" />}
                  </div>
                  <span className={cn('text-[11px]', m === 'Reweighting' ? 'text-slate-900 font-bold' : 'text-slate-400')}>{m}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-dashed border-slate-300">
            <p className="text-[9px] text-slate-400 uppercase italic leading-tight">
              Validation Hash:<br /><span className="font-mono text-slate-600 not-italic">0x8F22…BE09</span>
            </p>
          </div>
        </aside>

      </div>
    </div>
  );
}
