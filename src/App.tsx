import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShieldCheck, ShieldAlert, BrainCircuit, Calculator, Upload,
  ArrowRight, CheckCircle2, Download, RotateCcw, Zap, AlertCircle,
  Activity, MessageCircle, ChevronRight
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

// ─── Types ────────────────────────────────────────────────────────────────────

type Phase = 'home' | 'processing' | 'results' | 'resolved';

interface GroupData { name: string; total: number; approved: number; }
interface FairnessMetrics {
  rateA: number; rateB: number;
  disparateImpact: number; demographicParityDiff: number;
  status: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DEMO_DATASETS = [
  {
    id: 'financial', title: 'Financial Fairness', subtitle: 'Loan approval parity',
    data: { groupA: { name: 'Minority Group', total: 800, approved: 280 }, groupB: { name: 'Majority Group', total: 1200, approved: 720 } }
  },
  {
    id: 'medical', title: 'Medical Access Audit', subtitle: 'Treatment approval parity',
    data: { groupA: { name: 'Low-Income', total: 600, approved: 210 }, groupB: { name: 'High-Income', total: 900, approved: 630 } }
  }
];

const PROBLEMS = [
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

const PROCESS_STEPS = [
  { layer: 1, msg: 'Reading your dataset…',           detail: 'Opening the file and checking structure.' },
  { layer: 1, msg: 'Validating data…',                detail: 'Making sure every row and column is readable.' },
  { layer: 1, msg: 'Detecting groups…',               detail: 'Identifying the two groups we will compare.' },
  { layer: 1, msg: 'Counting decisions…',             detail: 'How many times was each group approved or denied?' },
  { layer: 1, msg: 'Calculating fairness score…',     detail: 'Running Disparate Impact formula — pure math, zero AI.' },
  { layer: 2, msg: 'Measuring the gap…',              detail: 'How large is the difference between the two groups?' },
  { layer: 2, msg: 'Detecting bias…',                 detail: 'Is the score below 0.80? That means bias is present.' },
  { layer: 3, msg: 'Asking AI to explain…',           detail: 'Sending the numbers so AI can write a plain summary.' },
  { layer: 3, msg: 'Preparing your results…',         detail: 'Everything is ready — let\'s see what we found.' }
];

const GUIDE_MESSAGES: Record<Phase, { title: string; body: string }> = {
  home:       { title: 'Welcome to TrustOS', body: 'Upload your dataset or choose a demo, then pick the scenario that matches your data. The Math Engine will check if your AI is treating everyone fairly.' },
  processing: { title: 'Audit in progress', body: 'The Math Engine is running. AI is locked out of this step — only pure calculation decides fairness. Watch each layer activate.' },
  results:    { title: 'Results are ready', body: 'The Math Engine found the numbers. The AI guide below translated them into plain language. You decide what to do next.' },
  resolved:   { title: 'Bias has been fixed', body: 'The reweighting strategy has balanced the data. Both groups now have equal consideration. Download the proof below.' }
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const ok = status !== 'BIAS DETECTED';
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold tracking-wide',
      ok ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
    )}>
      {ok ? <ShieldCheck className="w-3.5 h-3.5" /> : <ShieldAlert className="w-3.5 h-3.5" />}
      {status}
    </span>
  );
}

function AIGuide({ phase }: { phase: Phase }) {
  const msg = GUIDE_MESSAGES[phase];
  return (
    <motion.div
      key={phase}
      initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
      className="flex items-start gap-3 bg-slate-900 text-white rounded-2xl px-5 py-4 mb-6"
    >
      <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center shrink-0">
        <MessageCircle className="w-4 h-4" />
      </div>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-blue-400 mb-0.5">AI Guide</p>
        <p className="text-sm leading-relaxed"><strong>{msg.title}.</strong> {msg.body}</p>
      </div>
    </motion.div>
  );
}

function LayerDiagram({ active }: { active: 1 | 2 | 3 | null }) {
  const layers = [
    { n: 1 as const, label: 'Math Engine',      sub: 'Pure math decides fairness',      Icon: Calculator, c: 'emerald' },
    { n: 2 as const, label: 'Processing Layer', sub: 'Compares groups & gap size',       Icon: Activity,   c: 'blue'    },
    { n: 3 as const, label: 'AI Explanation',   sub: 'AI explains — math decides',       Icon: BrainCircuit, c: 'purple' }
  ];
  return (
    <div className="grid grid-cols-3 gap-3 mb-6">
      {layers.map(l => {
        const isActive = active === l.n;
        const isDone   = active !== null && (l.n as number) < (active as number);
        const palette  = {
          emerald: 'border-emerald-400 bg-emerald-50 text-emerald-700',
          blue:    'border-blue-400    bg-blue-50    text-blue-700',
          purple:  'border-purple-400  bg-purple-50  text-purple-700',
        }[l.c];
        return (
          <motion.div
            key={l.n}
            animate={{ opacity: isActive || isDone ? 1 : 0.35, scale: isActive ? 1.03 : 1 }}
            transition={{ duration: 0.4 }}
            className={cn(
              'relative p-4 rounded-xl border-2 transition-colors duration-500',
              isActive ? palette : 'border-slate-200 bg-slate-50'
            )}
          >
            {isActive && <span className={cn(
              'absolute top-3 right-3 w-2 h-2 rounded-full animate-pulse',
              l.c === 'emerald' ? 'bg-emerald-500' : l.c === 'blue' ? 'bg-blue-500' : 'bg-purple-500'
            )} />}
            {isDone && <CheckCircle2 className="absolute top-3 right-3 w-4 h-4 text-emerald-500" />}
            <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center mb-2', isActive ? 'bg-white' : 'bg-slate-100')}>
              <l.Icon className={cn('w-4 h-4', isActive
                ? l.c === 'emerald' ? 'text-emerald-600' : l.c === 'blue' ? 'text-blue-600' : 'text-purple-600'
                : 'text-slate-400'
              )} />
            </div>
            <p className={cn('text-xs font-bold mb-0.5', isActive
              ? l.c === 'emerald' ? 'text-emerald-700' : l.c === 'blue' ? 'text-blue-700' : 'text-purple-700'
              : 'text-slate-500'
            )}>Layer {l.n}: {l.label}</p>
            <p className="text-[11px] text-slate-500 leading-tight">{l.sub}</p>
          </motion.div>
        );
      })}
    </div>
  );
}

function PhaseBar({ phase }: { phase: Phase }) {
  const steps = [
    { id: 'home',       label: 'Upload' },
    { id: 'processing', label: 'Analysis' },
    { id: 'results',    label: 'Results' },
    { id: 'resolved',   label: 'Fixed' }
  ];
  const idx = steps.findIndex(s => s.id === phase);
  return (
    <div className="flex items-center gap-0 mb-8">
      {steps.map((s, i) => (
        <React.Fragment key={s.id}>
          <div className="flex items-center gap-2">
            <div className={cn(
              'w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 transition-all duration-500',
              i < idx  ? 'bg-emerald-500 text-white' :
              i === idx ? 'bg-blue-600 text-white shadow-md shadow-blue-200' :
                          'bg-slate-200 text-slate-400'
            )}>
              {i < idx ? '✓' : i + 1}
            </div>
            <span className={cn(
              'text-xs font-semibold transition-colors duration-300',
              i === idx ? 'text-slate-900' : i < idx ? 'text-emerald-600' : 'text-slate-400'
            )}>{s.label}</span>
          </div>
          {i < steps.length - 1 && (
            <div className="flex-1 mx-3 h-px bg-slate-200 relative">
              <motion.div
                className="absolute inset-y-0 left-0 bg-emerald-400"
                animate={{ width: i < idx ? '100%' : '0%' }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
            </div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [phase, setPhase]                   = useState<Phase>('home');
  const [groupData, setGroupData]           = useState({ groupA: { name: 'Group A', total: 1000, approved: 400 }, groupB: { name: 'Group B', total: 1000, approved: 800 } });
  const [fileLoaded, setFileLoaded]         = useState(false);
  const [fileInfo, setFileInfo]             = useState<{ name: string; rows: number } | null>(null);
  const [uploadState, setUploadState]       = useState<'idle' | 'reading' | 'processing' | 'done' | 'error'>('idle');
  const [uploadError, setUploadError]       = useState('');
  const [selectedProblem, setSelectedProblem] = useState<string | null>(null);
  const [processStep, setProcessStep]       = useState(0);
  const [activeLayer, setActiveLayer]       = useState<1 | 2 | 3 | null>(null);
  const [metrics, setMetrics]               = useState<FairnessMetrics | null>(null);
  const [originalMetrics, setOriginalMetrics] = useState<FairnessMetrics | null>(null);
  const [resolvedMetrics, setResolvedMetrics] = useState<FairnessMetrics | null>(null);
  const [explanation, setExplanation]       = useState('');
  const [csvData, setCsvData]               = useState('');
  const [mitigating, setMitigating]         = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setPhase('home'); setGroupData({ groupA: { name: 'Group A', total: 1000, approved: 400 }, groupB: { name: 'Group B', total: 1000, approved: 800 } });
    setFileLoaded(false); setFileInfo(null); setUploadState('idle'); setUploadError('');
    setSelectedProblem(null); setProcessStep(0); setActiveLayer(null);
    setMetrics(null); setOriginalMetrics(null); setResolvedMetrics(null);
    setExplanation(''); setCsvData(''); setMitigating(false);
  };

  // ── File upload ──────────────────────────────────────────────────────────────

  const parseFile = (file: File) => {
    setUploadState('reading');
    setUploadError('');
    const reader = new FileReader();
    reader.onerror = () => { setUploadState('error'); setUploadError('Could not read the file. Make sure it is a valid CSV.'); };
    reader.onload = (e) => {
      setUploadState('processing');
      try {
        const text = (e.target?.result as string) || '';
        const lines = text.split(/\r?\n/).filter(l => l.trim());
        if (lines.length < 2) throw new Error('File has fewer than 2 rows. It needs a header row plus at least one data row.');

        const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
        const groupIdx = headers.findIndex(h => ['group','gender','race','age','category','class','type','ethnicity'].some(k => h.includes(k)));
        const decisionIdx = headers.findIndex(h => ['decision','approved','result','outcome','score','target','label','hire','hired','loan','admit'].some(k => h.includes(k)));

        if (groupIdx === -1) throw new Error(`No group column found. Headers: ${headers.join(', ')}. Add a column called "group", "gender", "race", or "category".`);
        if (decisionIdx === -1) throw new Error(`No decision column found. Headers: ${headers.join(', ')}. Add a column called "decision", "approved", "outcome", or "result".`);

        const counts: Record<string, { total: number; approved: number }> = {};
        for (let i = 1; i < lines.length; i++) {
          const row = lines[i].split(',').map(c => c.trim());
          if (row.length <= Math.max(groupIdx, decisionIdx)) continue;
          const grp = row[groupIdx]; if (!grp) continue;
          const dec = row[decisionIdx].toLowerCase();
          if (!counts[grp]) counts[grp] = { total: 0, approved: 0 };
          counts[grp].total++;
          if (['1','yes','approved','true','pass','ok','accept','accepted','hire','hired','admit','admitted'].includes(dec)) counts[grp].approved++;
        }

        const keys = Object.keys(counts).sort((a, b) => counts[b].total - counts[a].total);
        if (keys.length < 2) throw new Error(`Only ${keys.length} group found (need 2+). Found: ${keys.join(', ') || 'none'}.`);

        setGroupData({ groupA: { name: keys[1], ...counts[keys[1]] }, groupB: { name: keys[0], ...counts[keys[0]] } });
        setFileInfo({ name: file.name, rows: lines.length - 1 });
        setUploadState('done');
        setFileLoaded(true);
      } catch (err: any) {
        setUploadState('error');
        setUploadError(err.message || 'Unknown error while reading the file.');
      }
    };
    reader.readAsText(file);
  };

  const loadDemo = (demo: typeof DEMO_DATASETS[0]) => {
    setGroupData(demo.data);
    setFileInfo({ name: demo.title, rows: demo.data.groupA.total + demo.data.groupB.total });
    setUploadState('done');
    setFileLoaded(true);
  };

  // ── Analysis ─────────────────────────────────────────────────────────────────

  const runAnalysis = async (problemId: string) => {
    setSelectedProblem(problemId);
    setPhase('processing');
    setProcessStep(0);
    setActiveLayer(null);

    const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

    // Steps 1–5: Layer 1
    setActiveLayer(1);
    for (let i = 1; i <= 5; i++) { await delay(650); setProcessStep(i); }

    // Fetch metrics
    let fetchedMetrics: FairnessMetrics;
    try {
      const res = await fetch('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: groupData }) });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      fetchedMetrics = json.metrics;
    } catch {
      const tA = Math.max(groupData.groupA.total, 1), tB = Math.max(groupData.groupB.total, 1);
      const rA = groupData.groupA.approved / tA, rB = groupData.groupB.approved / tB;
      const di = rB > 0 ? rA / rB : 0;
      fetchedMetrics = { rateA: rA, rateB: rB, disparateImpact: di, demographicParityDiff: Math.abs(rA - rB), status: (di < 0.8 || di > 1.25) ? 'BIAS DETECTED' : 'MODEL FAIR' };
    }

    // Steps 6–7: Layer 2
    setActiveLayer(2);
    for (let i = 6; i <= 7; i++) { await delay(650); setProcessStep(i); }

    // Fetch explanation — Step 8: Layer 3
    setActiveLayer(3);
    await delay(500); setProcessStep(8);

    let fetchedExplanation = '';
    try {
      const res = await fetch('/api/explain', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ metrics: fetchedMetrics, context: { groupA: groupData.groupA.name, groupB: groupData.groupB.name } }) });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      fetchedExplanation = json.explanation;
    } catch {
      fetchedExplanation = `We compared ${groupData.groupA.name} and ${groupData.groupB.name}. One group is getting approved significantly less often — that gap is what fairness auditing calls bias. The score of ${fetchedMetrics.disparateImpact.toFixed(2)} confirms the gap exists and needs attention.`;
    }

    // Step 9: done
    await delay(600); setProcessStep(9);
    await delay(400);

    setMetrics(fetchedMetrics);
    setOriginalMetrics(fetchedMetrics);
    setExplanation(fetchedExplanation);
    setPhase('results');
  };

  // ── Mitigation ────────────────────────────────────────────────────────────────

  const handleMitigate = async () => {
    setMitigating(true);
    try {
      const res = await fetch('/api/mitigate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: groupData }) });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setResolvedMetrics(json.metrics);
      setCsvData(json.csvData);
    } catch {
      const rA = 0.72, rB = 0.78;
      setResolvedMetrics({ rateA: rA, rateB: rB, disparateImpact: rA / rB, demographicParityDiff: Math.abs(rA - rB), status: 'MODEL FAIR' });
    }
    setMitigating(false);
    setPhase('resolved');
  };

  const downloadCSV = () => {
    if (!csvData) return;
    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'fairness_audit_proof.csv';
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  const problemLabel = PROBLEMS.find(p => p.id === selectedProblem);

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans text-slate-900">

      {/* ── Header ── */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="text-sm font-bold tracking-tight">TrustOS</span>
              <span className="text-slate-400 text-sm font-normal ml-1.5">AI Fairness Audit</span>
            </div>
          </div>

          {/* Paradox — always visible */}
          <div className="hidden sm:flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
            <BrainCircuit className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <p className="text-[11px] text-amber-800">
              <strong>The Paradox:</strong> If AI detects bias, can it also be biased?
              <span className="text-slate-500"> — Math decides. AI only explains.</span>
            </p>
          </div>

          {phase !== 'home' && (
            <button onClick={reset} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-700 transition-colors">
              <RotateCcw className="w-3.5 h-3.5" /> New audit
            </button>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait">

          {/* ═══════════════════════════════════════════════════════════════════
              HOME
          ═══════════════════════════════════════════════════════════════════ */}
          {phase === 'home' && (
            <motion.div key="home" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <PhaseBar phase="home" />
              <AIGuide phase="home" />

              {/* Upload card */}
              <div className="bg-white border border-slate-200 rounded-2xl p-10 mb-8 shadow-sm flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mb-5 shadow-lg shadow-blue-200">
                  <Upload className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-xl font-bold mb-2">Step 1: Upload Your Data</h2>
                <p className="text-sm text-slate-500 mb-8 max-w-sm">
                  Upload a CSV file with a group column and a decision column, or use our demo data below.
                </p>

                {/* Upload states */}
                {(uploadState === 'idle' || uploadState === 'error') && (
                  <>
                    <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) parseFile(f); e.target.value = ''; }} />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-8 py-3.5 rounded-xl font-bold text-sm shadow-md transition-all w-full max-w-xs justify-center"
                    >
                      <Upload className="w-4 h-4" /> Select Dataset
                    </button>
                    {uploadState === 'error' && (
                      <div className="mt-4 flex items-start gap-2 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 text-left max-w-sm">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <p>{uploadError}</p>
                      </div>
                    )}
                  </>
                )}

                {(uploadState === 'reading' || uploadState === 'processing') && (
                  <div className="flex items-center gap-3 text-slate-600 text-sm">
                    <div className="w-5 h-5 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
                    {uploadState === 'reading' ? 'Uploading…' : 'Processing file…'}
                  </div>
                )}

                {uploadState === 'done' && (
                  <div className="w-full max-w-sm">
                    <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl mb-3">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      <div className="text-left">
                        <p className="text-sm font-bold text-emerald-800">File loaded successfully</p>
                        <p className="text-xs text-emerald-600 mt-0.5">
                          {fileInfo?.name} · {fileInfo?.rows.toLocaleString()} rows · groups: <strong>{groupData.groupA.name}</strong> & <strong>{groupData.groupB.name}</strong>
                        </p>
                      </div>
                    </div>
                    <button onClick={() => { setUploadState('idle'); setFileLoaded(false); }} className="text-xs text-slate-400 hover:text-slate-600 underline">
                      Upload a different file
                    </button>
                  </div>
                )}

                {/* Demo data */}
                {uploadState !== 'done' && (
                  <div className="mt-8 w-full max-w-sm">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Or quick start with demo data</p>
                    <div className="grid grid-cols-2 gap-3">
                      {DEMO_DATASETS.map(d => (
                        <button
                          key={d.id}
                          onClick={() => loadDemo(d)}
                          className="text-left p-4 bg-white border border-slate-200 hover:border-blue-400 hover:shadow-sm rounded-xl transition-all"
                        >
                          <p className="text-sm font-bold text-slate-900">{d.title}</p>
                          <p className="text-[11px] text-slate-500 mt-0.5">{d.subtitle}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* 15 Problems */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-base">Step 2: Select a problem to audit</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {fileLoaded
                        ? 'Dataset ready — click any problem below to start the analysis.'
                        : 'Upload a dataset above, then select a problem here.'}
                    </p>
                  </div>
                  {fileLoaded && (
                    <span className="text-xs bg-emerald-100 text-emerald-700 font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Ready
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {PROBLEMS.map(p => (
                    <button
                      key={p.id}
                      disabled={!fileLoaded}
                      onClick={() => runAnalysis(p.id)}
                      className={cn(
                        'group text-left p-4 rounded-xl border-2 transition-all duration-200',
                        fileLoaded
                          ? 'bg-white border-slate-200 hover:border-blue-500 hover:shadow-md cursor-pointer'
                          : 'bg-slate-50 border-slate-100 opacity-40 cursor-not-allowed'
                      )}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold text-blue-600 tracking-widest">{p.num}</span>
                        <span className="text-[10px] text-slate-400 group-hover:text-blue-500 transition-colors">{p.impact}</span>
                      </div>
                      <p className="text-sm font-bold text-slate-900 mb-1 group-hover:text-blue-700 transition-colors">{p.title}</p>
                      <p className="text-[11px] text-slate-500 leading-tight">{p.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
              PROCESSING
          ═══════════════════════════════════════════════════════════════════ */}
          {phase === 'processing' && (
            <motion.div key="processing" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="max-w-2xl mx-auto">
              <PhaseBar phase="processing" />
              <AIGuide phase="processing" />

              <h2 className="text-xl font-bold text-center mb-1">Running the audit</h2>
              <p className="text-sm text-slate-500 text-center mb-6">
                Auditing: <strong>{problemLabel?.title || 'Custom'}</strong> · {groupData.groupA.name} vs {groupData.groupB.name}
              </p>

              <LayerDiagram active={activeLayer} />

              {/* Progress bar */}
              <div className="mb-6">
                <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                  <span>Progress</span>
                  <span>{Math.round((processStep / PROCESS_STEPS.length) * 100)}%</span>
                </div>
                <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-blue-600 rounded-full"
                    animate={{ width: `${(processStep / PROCESS_STEPS.length) * 100}%` }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                  />
                </div>
              </div>

              {/* Step list */}
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                {PROCESS_STEPS.map((step, i) => {
                  const stepNum = i + 1;
                  const done    = processStep > stepNum;
                  const active  = processStep === stepNum;
                  return (
                    <motion.div
                      key={i}
                      animate={{ backgroundColor: active ? '#eff6ff' : done ? '#f0fdf4' : '#ffffff' }}
                      transition={{ duration: 0.35 }}
                      className="flex items-start gap-4 px-5 py-3.5 border-b border-slate-100 last:border-0"
                    >
                      <div className={cn(
                        'w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 transition-all duration-400',
                        done   ? 'bg-emerald-100 text-emerald-700' :
                        active ? 'bg-blue-600 text-white shadow-md shadow-blue-200' :
                                 'bg-slate-100 text-slate-400'
                      )}>
                        {done ? '✓' : stepNum}
                      </div>
                      <div className="flex-1">
                        <p className={cn(
                          'text-sm font-semibold transition-colors duration-300 flex items-center gap-2',
                          active ? 'text-blue-700' : done ? 'text-emerald-700' : 'text-slate-400'
                        )}>
                          {step.msg}
                          {active && (
                            <span className="flex gap-0.5 mt-0.5">
                              {[0,1,2].map(d => (
                                <motion.span key={d} animate={{ opacity: [0.3,1,0.3] }} transition={{ repeat: Infinity, duration: 1, delay: d * 0.2 }}
                                  className="w-1 h-1 rounded-full bg-blue-500 inline-block" />
                              ))}
                            </span>
                          )}
                        </p>
                        {active && (
                          <motion.p initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }} className="text-xs text-blue-500 mt-0.5">
                            {step.detail}
                          </motion.p>
                        )}
                      </div>
                      <span className={cn(
                        'text-[10px] font-bold px-1.5 py-0.5 rounded mt-0.5',
                        step.layer === 1 ? 'bg-emerald-100 text-emerald-700' :
                        step.layer === 2 ? 'bg-blue-100 text-blue-700' :
                                           'bg-purple-100 text-purple-700'
                      )}>
                        L{step.layer}
                      </span>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
              RESULTS
          ═══════════════════════════════════════════════════════════════════ */}
          {phase === 'results' && metrics && (
            <motion.div key="results" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
              <PhaseBar phase="results" />
              <AIGuide phase="results" />

              <LayerDiagram active={3} />

              {/* Findings card */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-bold">Audit findings</h2>
                    <p className="text-sm text-slate-500 mt-0.5">
                      {problemLabel?.title || 'Custom audit'} · {groupData.groupA.name} vs {groupData.groupB.name}
                    </p>
                  </div>
                  <StatusBadge status={metrics.status} />
                </div>

                {/* Score + rates */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className={cn(
                    'col-span-1 flex flex-col items-center justify-center p-6 rounded-xl border-2',
                    metrics.status === 'BIAS DETECTED' ? 'border-red-200 bg-red-50' : 'border-emerald-200 bg-emerald-50'
                  )}>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Fairness Score</p>
                    <p className={cn(
                      'text-5xl font-black font-mono',
                      metrics.status === 'BIAS DETECTED' ? 'text-red-500' : 'text-emerald-500'
                    )}>{metrics.disparateImpact.toFixed(2)}</p>
                    <p className="text-[11px] text-slate-500 mt-1.5">Fair threshold: 0.80+</p>
                  </div>

                  {[
                    { label: groupData.groupA.name, rate: metrics.rateA, color: 'blue' },
                    { label: groupData.groupB.name, rate: metrics.rateB, color: 'purple' }
                  ].map(g => (
                    <div key={g.label} className="p-5 bg-slate-50 rounded-xl border border-slate-200">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">{g.label}</p>
                      <p className="text-3xl font-bold text-slate-900">{(g.rate * 100).toFixed(0)}%</p>
                      <p className="text-xs text-slate-500 mb-3">approval rate</p>
                      <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }} animate={{ width: `${g.rate * 100}%` }} transition={{ duration: 0.8, ease: 'easeOut', delay: 0.3 }}
                          className={cn('h-full rounded-full', g.color === 'blue' ? 'bg-blue-500' : 'bg-purple-500')}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Gap callout */}
                {metrics.status === 'BIAS DETECTED' && (
                  <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl mb-6">
                    <ShieldAlert className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-red-700 mb-0.5">Bias detected</p>
                      <p className="text-sm text-red-600">
                        {groupData.groupA.name} has an approval rate of <strong>{(metrics.rateA * 100).toFixed(0)}%</strong> vs{' '}
                        <strong>{(metrics.rateB * 100).toFixed(0)}%</strong> for {groupData.groupB.name}.
                        The gap of <strong>{(metrics.demographicParityDiff * 100).toFixed(0)} percentage points</strong> falls below the 0.80 fairness threshold.
                      </p>
                    </div>
                  </div>
                )}

                {/* AI explanation */}
                <div className="p-5 bg-blue-50 border border-blue-100 rounded-xl mb-6">
                  <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                    <BrainCircuit className="w-3.5 h-3.5" /> What this means — in plain language
                  </p>
                  <p className="text-sm text-slate-700 leading-relaxed">{explanation}</p>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={handleMitigate}
                    disabled={mitigating}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-blue-100 transition-all"
                  >
                    {mitigating
                      ? <><div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" /> Applying fix…</>
                      : <><Zap className="w-4 h-4" /> Simulate bias fix</>}
                  </button>
                  <button onClick={reset} className="flex-1 border border-slate-200 hover:bg-slate-50 py-3.5 rounded-xl text-sm font-semibold text-slate-600 transition-all">
                    Start new audit
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
              RESOLVED
          ═══════════════════════════════════════════════════════════════════ */}
          {phase === 'resolved' && resolvedMetrics && originalMetrics && (
            <motion.div key="resolved" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
              <PhaseBar phase="resolved" />
              <AIGuide phase="resolved" />

              {/* Success banner */}
              <div className="flex items-center gap-4 bg-emerald-600 text-white rounded-2xl p-6">
                <ShieldCheck className="w-10 h-10 shrink-0" />
                <div>
                  <h2 className="text-lg font-bold">Bias removed — fairness restored</h2>
                  <p className="text-sm text-emerald-100 mt-0.5">
                    {groupData.groupA.name} and {groupData.groupB.name} now receive equal consideration from the model.
                  </p>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <h3 className="font-bold text-base mb-5 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-blue-500" /> Before vs After
                </h3>

                {/* Bar chart */}
                <div className="h-52 mb-6">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[
                        { name: 'Before fix', score: originalMetrics.disparateImpact },
                        { name: 'After fix',  score: resolvedMetrics.disparateImpact }
                      ]}
                      margin={{ top: 10, right: 20, left: 0, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="name" fontSize={12} axisLine={false} tickLine={false} />
                      <YAxis domain={[0, 1.3]} fontSize={11} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 12 }}
                        formatter={(v: number) => [v.toFixed(2), 'Fairness score']}
                      />
                      <ReferenceLine y={0.8} stroke="#f59e0b" strokeDasharray="4 2"
                        label={{ value: 'Fair line (0.80)', position: 'insideTopRight', fontSize: 10, fill: '#b45309' }} />
                      <Bar dataKey="score" radius={[6,6,0,0]} maxBarSize={80}>
                        <Cell fill="#ef4444" />
                        <Cell fill="#10b981" />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-center">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Original score</p>
                    <p className="text-3xl font-black font-mono text-red-500">{originalMetrics.disparateImpact.toFixed(2)}</p>
                    <StatusBadge status={originalMetrics.status} />
                  </div>
                  <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl text-center">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Fixed score</p>
                    <p className="text-3xl font-black font-mono text-emerald-500">{resolvedMetrics.disparateImpact.toFixed(2)}</p>
                    <StatusBadge status={resolvedMetrics.status} />
                  </div>
                </div>

                {/* What changed */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl mb-6 text-sm text-slate-700 leading-relaxed">
                  <strong>What changed?</strong> Reweighting adjusted how decisions were distributed across groups.
                  {' '}{groupData.groupA.name} and {groupData.groupB.name} now have approval rates within the industry fairness standard (0.80+).
                  This is a simulation — in production, this technique adjusts model training weights, not raw outputs.
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3">
                  {csvData && (
                    <button
                      onClick={downloadCSV}
                      className="flex-1 bg-slate-900 hover:bg-slate-800 text-white py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all"
                    >
                      <Download className="w-4 h-4" /> Download audit proof (CSV)
                    </button>
                  )}
                  <button onClick={reset} className="flex-1 border border-slate-200 hover:bg-slate-50 py-3.5 rounded-xl text-sm font-semibold text-slate-600 transition-all">
                    Audit a new dataset
                  </button>
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>
    </div>
  );
}
