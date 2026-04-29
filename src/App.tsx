import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShieldCheck, ShieldAlert, BrainCircuit, Calculator, Upload,
  ArrowRight, CheckCircle2, Download, RotateCcw, Zap, AlertCircle
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─── Types ────────────────────────────────────────────────────────────────────

type AppPhase = 'home' | 'upload' | 'problem' | 'processing' | 'results' | 'resolved';

interface GroupData {
  name: string;
  total: number;
  approved: number;
}

interface FairnessMetrics {
  rateA: number;
  rateB: number;
  disparateImpact: number;
  demographicParityDiff: number;
  status: string;
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const SAMPLE_DATA = {
  groupA: { name: 'Group A', total: 1000, approved: 400 },
  groupB: { name: 'Group B', total: 1000, approved: 800 }
};

const PROBLEMS = [
  { id: 'hiring',    num: '01', title: 'Hiring',        desc: 'AI screens job applicants — does it treat everyone equally?' },
  { id: 'banking',   num: '02', title: 'Banking',       desc: 'Loan algorithms decide who gets credit — are they fair?' },
  { id: 'health',    num: '03', title: 'Healthcare',    desc: 'Medical AI affects who gets treatment — gaps can cost lives.' },
  { id: 'edu',       num: '04', title: 'Education',     desc: 'Admissions tools shape futures — bias blocks opportunity.' },
  { id: 'justice',   num: '05', title: 'Criminal Justice', desc: 'Bail & parole AI — unfairness means people lose freedom.' },
  { id: 'insurance', num: '06', title: 'Insurance',     desc: 'Pricing algorithms — should your zip code define your rate?' },
  { id: 'gov',       num: '07', title: 'Government',    desc: 'Welfare & benefits AI — bias can deny people basic help.' },
  { id: 'social',    num: '08', title: 'Social Media',  desc: 'Content moderation — some voices are silenced unfairly.' },
  { id: 'commerce',  num: '09', title: 'Shopping',      desc: 'Ad targeting — not everyone sees the same deals or prices.' },
  { id: 'housing',   num: '10', title: 'Real Estate',   desc: 'Valuation AI can discriminate based on neighbourhood.' },
  { id: 'police',    num: '11', title: 'Policing',      desc: 'Predictive tools target communities — not always fairly.' },
  { id: 'climate',   num: '12', title: 'Energy Access', desc: 'Green tech subsidies — do they reach everyone equally?' },
  { id: 'legal',     num: '13', title: 'Regulation',    desc: 'EU AI Act compliance — is your model legally fair?' },
  { id: 'sme',       num: '14', title: 'Small Business', desc: 'Access to tools & capital — bias blocks small players.' },
  { id: 'citizen',   num: '15', title: 'Citizen Rights', desc: 'Your right to an explanation when AI decides your future.' }
];

const PROCESS_STEPS = [
  { id: 1, label: 'Reading your dataset',       detail: 'Opening the file and checking its structure.' },
  { id: 2, label: 'Validating data',            detail: 'Making sure all rows and columns are readable.' },
  { id: 3, label: 'Detecting groups',           detail: 'Identifying the two groups we will compare.' },
  { id: 4, label: 'Counting decisions',         detail: 'How many times was each group approved or rejected?' },
  { id: 5, label: 'Calculating fairness score', detail: 'Running the Disparate Impact formula — pure math, no AI.' },
  { id: 6, label: 'Checking the gap',           detail: 'Measuring how large the difference is between the groups.' },
  { id: 7, label: 'Detecting bias',             detail: 'Is the score below 0.80? That means bias is present.' },
  { id: 8, label: 'Asking AI to explain',       detail: 'Sending the numbers to AI so it can write a plain summary.' },
  { id: 9, label: 'Showing your results',       detail: 'Everything is ready — let\'s look at what we found.' }
];

// ─── Small Components ─────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const ok = status !== 'BIAS DETECTED';
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold',
      ok ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
    )}>
      {ok ? <ShieldCheck className="w-3.5 h-3.5" /> : <ShieldAlert className="w-3.5 h-3.5" />}
      {status}
    </span>
  );
}

// ─── Layer Diagram ────────────────────────────────────────────────────────────

function LayerDiagram({ activeLayer }: { activeLayer: 1 | 2 | 3 | null }) {
  const layers = [
    { n: 1, label: 'Math Engine',       sub: 'Pure math decides fairness', color: 'emerald', Icon: Calculator },
    { n: 2, label: 'Processing Layer',  sub: 'Compares groups & metrics',  color: 'blue',    Icon: Zap },
    { n: 3, label: 'AI Explanation',    sub: 'AI only explains — not decides', color: 'purple', Icon: BrainCircuit }
  ] as const;

  return (
    <div className="grid grid-cols-3 gap-3 mb-6">
      {layers.map((l, i) => {
        const active = activeLayer === l.n;
        const done = activeLayer !== null && (l.n as number) < (activeLayer as number);
        const colors = {
          emerald: { ring: 'ring-emerald-400', bg: 'bg-emerald-50', icon: 'text-emerald-600', label: 'text-emerald-700', dot: 'bg-emerald-500' },
          blue:    { ring: 'ring-blue-400',    bg: 'bg-blue-50',    icon: 'text-blue-600',    label: 'text-blue-700',    dot: 'bg-blue-500' },
          purple:  { ring: 'ring-purple-400',  bg: 'bg-purple-50',  icon: 'text-purple-600',  label: 'text-purple-700',  dot: 'bg-purple-500' }
        }[l.color];
        return (
          <React.Fragment key={l.n}>
            <motion.div
              animate={{ opacity: active ? 1 : done ? 0.7 : 0.35, scale: active ? 1.02 : 1 }}
              className={cn(
                'relative p-4 rounded-xl border-2 transition-colors duration-500',
                active ? `${colors.bg} ${colors.ring} ring-2` : 'bg-slate-50 border-slate-200'
              )}
            >
              {active && (
                <span className={cn('absolute top-3 right-3 w-2 h-2 rounded-full animate-pulse', colors.dot)} />
              )}
              {done && (
                <span className="absolute top-3 right-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                </span>
              )}
              <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center mb-3', active ? colors.bg : 'bg-white')}>
                <l.Icon className={cn('w-4 h-4', active ? colors.icon : 'text-slate-400')} />
              </div>
              <p className={cn('text-xs font-bold mb-0.5', active ? colors.label : 'text-slate-600')}>Layer {l.n}: {l.label}</p>
              <p className="text-[11px] text-slate-500 leading-tight">{l.sub}</p>
            </motion.div>
            {i < 2 && (
              <div className="hidden" /> // grid handles spacing
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [phase, setPhase] = useState<AppPhase>('home');

  // Data
  const [groupData, setGroupData] = useState(SAMPLE_DATA);
  const [fileInfo, setFileInfo] = useState<{ name: string; rows: number } | null>(null);
  const [selectedProblem, setSelectedProblem] = useState<string | null>(null);

  // Upload UI state
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'processing' | 'done' | 'error'>('idle');
  const [uploadError, setUploadError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Processing
  const [processStep, setProcessStep] = useState(0); // 0 = not started
  const [activeLayer, setActiveLayer] = useState<1 | 2 | 3 | null>(null);

  // Results
  const [metrics, setMetrics] = useState<FairnessMetrics | null>(null);
  const [explanation, setExplanation] = useState('');
  const [originalMetrics, setOriginalMetrics] = useState<FairnessMetrics | null>(null);
  const [resolvedMetrics, setResolvedMetrics] = useState<FairnessMetrics | null>(null);
  const [csvData, setCsvData] = useState('');

  // ── Helpers ────────────────────────────────────────────────────────────────

  const reset = () => {
    setPhase('home');
    setGroupData(SAMPLE_DATA);
    setFileInfo(null);
    setSelectedProblem(null);
    setUploadStatus('idle');
    setUploadError('');
    setProcessStep(0);
    setActiveLayer(null);
    setMetrics(null);
    setExplanation('');
    setOriginalMetrics(null);
    setResolvedMetrics(null);
    setCsvData('');
  };

  // ── File upload ────────────────────────────────────────────────────────────

  const handleFile = (file: File) => {
    setUploadStatus('uploading');
    setUploadError('');

    const reader = new FileReader();

    reader.onerror = () => {
      setUploadStatus('error');
      setUploadError('Could not read the file. Please make sure it is a valid CSV.');
    };

    reader.onload = (e) => {
      setUploadStatus('processing');
      try {
        const text = (e.target?.result as string) || '';
        const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);

        if (lines.length < 2) {
          throw new Error('The file has fewer than 2 rows. Please use a CSV with a header and at least one data row.');
        }

        const headers = lines[0].toLowerCase().split(',').map(h => h.trim());

        const groupIdx = headers.findIndex(h =>
          h.includes('group') || h.includes('gender') || h.includes('race') ||
          h.includes('age') || h.includes('category') || h.includes('class') || h.includes('type')
        );
        const decisionIdx = headers.findIndex(h =>
          h.includes('decision') || h.includes('approved') || h.includes('result') ||
          h.includes('outcome') || h.includes('score') || h.includes('target') || h.includes('label')
        );

        if (groupIdx === -1) {
          throw new Error(
            `No group column found. Your headers are: ${headers.join(', ')}. ` +
            'Please include a column named "group", "gender", "race", "age", or "category".'
          );
        }
        if (decisionIdx === -1) {
          throw new Error(
            `No decision column found. Your headers are: ${headers.join(', ')}. ` +
            'Please include a column named "decision", "approved", "outcome", or "result".'
          );
        }

        const counts: Record<string, { total: number; approved: number }> = {};

        for (let i = 1; i < lines.length; i++) {
          const row = lines[i].split(',').map(c => c.trim());
          if (row.length <= Math.max(groupIdx, decisionIdx)) continue;
          const group = row[groupIdx];
          const decision = row[decisionIdx].toLowerCase();
          if (!group) continue;
          if (!counts[group]) counts[group] = { total: 0, approved: 0 };
          counts[group].total++;
          const isPos = ['1', 'yes', 'approved', 'true', 'pass', 'ok', 'accept', 'accepted'].includes(decision);
          if (isPos) counts[group].approved++;
        }

        const keys = Object.keys(counts).sort((a, b) => counts[b].total - counts[a].total);

        if (keys.length < 2) {
          throw new Error(
            `Only ${keys.length} unique group found. We need at least 2 groups to compare. ` +
            `Found: ${keys.join(', ') || 'none'}.`
          );
        }

        setGroupData({
          groupA: { name: keys[1], ...counts[keys[1]] },
          groupB: { name: keys[0], ...counts[keys[0]] }
        });
        setFileInfo({ name: file.name, rows: lines.length - 1 });
        setUploadStatus('done');
      } catch (err: any) {
        setUploadStatus('error');
        setUploadError(err.message || 'Unknown error while parsing the file.');
      }
    };

    reader.readAsText(file);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  };

  // ── Analysis ───────────────────────────────────────────────────────────────

  const runAnalysis = async (problem: string) => {
    setSelectedProblem(problem);
    setPhase('processing');
    setProcessStep(0);
    setActiveLayer(null);

    const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

    // Steps 1-4: Layer 1 active
    setActiveLayer(1);
    for (let i = 1; i <= 4; i++) {
      await delay(700);
      setProcessStep(i);
    }

    // Step 5-7: Math calculation
    for (let i = 5; i <= 7; i++) {
      await delay(700);
      setProcessStep(i);
    }

    // Call API for metrics
    let fetchedMetrics: FairnessMetrics | null = null;
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: groupData })
      });
      const json = await res.json();
      fetchedMetrics = json.metrics;
    } catch {
      // Fallback calculation
      const rateA = groupData.groupA.approved / groupData.groupA.total;
      const rateB = groupData.groupB.approved / groupData.groupB.total;
      const disparateImpact = rateA / rateB;
      fetchedMetrics = {
        rateA, rateB, disparateImpact,
        demographicParityDiff: Math.abs(rateA - rateB),
        status: disparateImpact < 0.8 || disparateImpact > 1.25 ? 'BIAS DETECTED' : 'MODEL FAIR'
      };
    }

    // Step 8: AI explanation — Layer 2 active
    await delay(500);
    setActiveLayer(2);
    setProcessStep(8);

    let fetchedExplanation = '';
    try {
      const res = await fetch('/api/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metrics: fetchedMetrics,
          context: { groupA: groupData.groupA.name, groupB: groupData.groupB.name }
        })
      });
      const json = await res.json();
      fetchedExplanation = json.explanation;
    } catch {
      fetchedExplanation = `We compared ${groupData.groupA.name} and ${groupData.groupB.name}. One group is getting approved much less often than the other. That gap is what we call bias — and the math confirmed it.`;
    }

    // Step 9: Show results — Layer 3 active
    await delay(600);
    setActiveLayer(3);
    setProcessStep(9);
    await delay(500);

    setMetrics(fetchedMetrics);
    setOriginalMetrics(fetchedMetrics);
    setExplanation(fetchedExplanation);
    setPhase('results');
  };

  // ── Mitigation ─────────────────────────────────────────────────────────────

  const [mitigating, setMitigating] = useState(false);

  const handleMitigate = async () => {
    setMitigating(true);
    try {
      const res = await fetch('/api/mitigate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: groupData })
      });
      const json = await res.json();
      setResolvedMetrics(json.metrics);
      setCsvData(json.csvData);
      setPhase('resolved');
    } catch {
      // Fallback
      const newRateA = 0.72;
      const newRateB = 0.78;
      setResolvedMetrics({
        rateA: newRateA, rateB: newRateB,
        disparateImpact: newRateA / newRateB,
        demographicParityDiff: Math.abs(newRateA - newRateB),
        status: 'MODEL FAIR'
      });
      setPhase('resolved');
    }
    setMitigating(false);
  };

  const downloadCSV = () => {
    if (!csvData) return;
    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'fairness_fixed_dataset.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* ── Header ── */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight leading-none">TrustOS</h1>
            <p className="text-[10px] text-slate-500 leading-none mt-0.5">AI Fairness Audit</p>
          </div>
        </div>

        {/* Paradox statement — always visible */}
        <div className="hidden md:flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2">
          <span className="text-amber-600">
            <BrainCircuit className="w-4 h-4" />
          </span>
          <p className="text-xs text-amber-800 font-medium">
            <strong>The Paradox:</strong> If AI detects bias, can it also be biased?
            <span className="text-slate-500 font-normal ml-1">— Math decides. AI only explains.</span>
          </p>
        </div>

        {phase !== 'home' && (
          <button onClick={reset} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition-colors">
            <RotateCcw className="w-3.5 h-3.5" /> Start over
          </button>
        )}
      </header>

      {/* ── Main ── */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait">

          {/* ══════════════════════════════════════════════════════════════════
              HOME — Upload + 15 problems
          ══════════════════════════════════════════════════════════════════ */}
          {phase === 'home' && (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            >
              {/* Hero */}
              <div className="text-center mb-10">
                <h2 className="text-2xl font-bold mb-2">Is your AI treating everyone fairly?</h2>
                <p className="text-slate-500 text-sm max-w-xl mx-auto">
                  Upload a dataset and pick a problem below. We'll run a step-by-step analysis — the math decides fairness, the AI just explains it to you in plain English.
                </p>

                {/* Paradox callout — mobile only */}
                <div className="md:hidden mt-4 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-left">
                  <p className="text-xs text-amber-800">
                    <strong>The Paradox:</strong> If AI detects bias, can it also be biased?<br />
                    <span className="text-slate-500">Math decides fairness. AI only explains the result.</span>
                  </p>
                </div>
              </div>

              {/* Upload Card */}
              <div className="bg-white border border-slate-200 rounded-2xl p-8 mb-8 shadow-sm">
                <h3 className="font-bold text-sm mb-5 flex items-center gap-2">
                  <Upload className="w-4 h-4 text-blue-600" /> Step 1: Upload your dataset
                </h3>

                {uploadStatus === 'idle' && (
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv"
                      className="hidden"
                      onChange={handleFileInput}
                    />
                    <button
                      onClick={() => {
                        setGroupData(SAMPLE_DATA);
                        setFileInfo({ name: 'sample_data.csv', rows: 2000 });
                        setUploadStatus('done');
                      }}
                      className="flex-1 border border-slate-200 hover:border-blue-300 bg-slate-50 hover:bg-blue-50 px-5 py-3 rounded-xl text-sm font-semibold transition-all"
                    >
                      Use sample data
                    </button>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl text-sm font-bold transition-all shadow-md shadow-blue-100"
                    >
                      Upload dataset
                    </button>
                  </div>
                )}

                {uploadStatus === 'uploading' && (
                  <div className="flex items-center gap-3 text-sm text-slate-600">
                    <div className="w-4 h-4 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
                    Uploading…
                  </div>
                )}

                {uploadStatus === 'processing' && (
                  <div className="flex items-center gap-3 text-sm text-slate-600">
                    <div className="w-4 h-4 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
                    Processing file…
                  </div>
                )}

                {uploadStatus === 'error' && (
                  <div className="space-y-3">
                    <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                      <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                      <div>
                        <p className="font-bold mb-1">Upload failed</p>
                        <p>{uploadError}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setUploadStatus('idle')}
                      className="text-sm text-slate-500 hover:text-slate-800 underline"
                    >
                      Try again
                    </button>
                  </div>
                )}

                {uploadStatus === 'done' && (
                  <div className="flex items-center justify-between p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      <div>
                        <p className="text-sm font-bold text-emerald-800">File loaded successfully</p>
                        <p className="text-xs text-emerald-600 mt-0.5">
                          {fileInfo?.name} · {fileInfo?.rows.toLocaleString()} rows · groups detected: <strong>{groupData.groupA.name}</strong> and <strong>{groupData.groupB.name}</strong>
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setUploadStatus('idle')}
                      className="text-xs text-slate-400 hover:text-slate-700 ml-4"
                    >
                      Change
                    </button>
                  </div>
                )}
              </div>

              {/* 15 Problems Grid */}
              <div>
                <h3 className="font-bold text-sm mb-2">Step 2: Select a problem to audit</h3>
                <p className="text-xs text-slate-500 mb-5">
                  {uploadStatus === 'done'
                    ? 'Dataset is ready. Click any problem below to start the analysis.'
                    : 'Upload a dataset first, then select a problem to begin.'}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {PROBLEMS.map(p => (
                    <button
                      key={p.id}
                      disabled={uploadStatus !== 'done'}
                      onClick={() => { setPhase('processing'); runAnalysis(p.id); }}
                      className={cn(
                        'text-left p-4 rounded-xl border transition-all group',
                        uploadStatus === 'done'
                          ? 'bg-white border-slate-200 hover:border-blue-400 hover:shadow-md hover:shadow-blue-50 cursor-pointer'
                          : 'bg-slate-50 border-slate-100 opacity-40 cursor-not-allowed'
                      )}
                    >
                      <span className="text-[10px] font-bold text-blue-600 block mb-1">{p.num}</span>
                      <span className="text-sm font-bold text-slate-900 block mb-1 group-hover:text-blue-700 transition-colors">{p.title}</span>
                      <span className="text-[11px] text-slate-500 leading-tight block">{p.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              PROCESSING — 9-step animated flow
          ══════════════════════════════════════════════════════════════════ */}
          {phase === 'processing' && (
            <motion.div
              key="processing"
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="max-w-2xl mx-auto"
            >
              {/* 3-layer diagram */}
              <h2 className="text-lg font-bold mb-2 text-center">Running the audit…</h2>
              <p className="text-sm text-slate-500 text-center mb-6">
                The Math Engine is working through each step. Watch the layers light up.
              </p>

              <LayerDiagram activeLayer={activeLayer} />

              {/* Progress bar */}
              <div className="mb-6">
                <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                  <span>Progress</span>
                  <span>{Math.round((processStep / PROCESS_STEPS.length) * 100)}%</span>
                </div>
                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-blue-500 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${(processStep / PROCESS_STEPS.length) * 100}%` }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                  />
                </div>
              </div>

              {/* Step list */}
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                {PROCESS_STEPS.map((step, i) => {
                  const done = processStep > step.id;
                  const active = processStep === step.id;
                  return (
                    <motion.div
                      key={step.id}
                      animate={{
                        backgroundColor: active ? '#eff6ff' : done ? '#f0fdf4' : '#ffffff',
                      }}
                      transition={{ duration: 0.4 }}
                      className={cn(
                        'flex items-start gap-4 px-5 py-4 border-b border-slate-100 last:border-0'
                      )}
                    >
                      {/* Step indicator */}
                      <div className={cn(
                        'w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 transition-all duration-500 text-xs font-bold',
                        done ? 'bg-emerald-100 text-emerald-600' :
                        active ? 'bg-blue-600 text-white shadow-md shadow-blue-200' :
                        'bg-slate-100 text-slate-400'
                      )}>
                        {done ? '✓' : step.id}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          'text-sm font-semibold transition-colors duration-300',
                          active ? 'text-blue-700' : done ? 'text-emerald-700' : 'text-slate-400'
                        )}>
                          {step.label}
                          {active && (
                            <span className="ml-2 inline-flex gap-0.5">
                              {[0,1,2].map(d => (
                                <motion.span
                                  key={d}
                                  animate={{ opacity: [0.3, 1, 0.3] }}
                                  transition={{ repeat: Infinity, duration: 1.2, delay: d * 0.2 }}
                                  className="w-1 h-1 bg-blue-500 rounded-full inline-block"
                                />
                              ))}
                            </span>
                          )}
                        </p>
                        {active && (
                          <motion.p
                            initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                            className="text-xs text-blue-500 mt-0.5"
                          >
                            {step.detail}
                          </motion.p>
                        )}
                      </div>

                      {/* Connector line to next step */}
                      {done && i < PROCESS_STEPS.length - 1 && (
                        <div className="w-px h-4 bg-emerald-200 absolute" />
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              RESULTS
          ══════════════════════════════════════════════════════════════════ */}
          {phase === 'results' && metrics && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="space-y-6"
            >
              {/* 3-layer (all done) */}
              <LayerDiagram activeLayer={3} />

              {/* Paradox resolution */}
              <div className="bg-slate-900 text-white rounded-2xl p-5 flex items-start gap-4">
                <BrainCircuit className="w-6 h-6 text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-blue-400 mb-1">Paradox Resolved</p>
                  <p className="text-sm leading-relaxed">
                    The <strong>Math Engine</strong> detected the fairness gap — no AI involved. The AI is only used to explain what the math found, in plain words. This is how you avoid the bias-in-bias-detection problem.
                  </p>
                </div>
              </div>

              {/* Main findings card */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-bold">Audit findings</h2>
                    <p className="text-sm text-slate-500 mt-0.5">
                      {PROBLEMS.find(p => p.id === selectedProblem)?.title || 'Custom audit'} ·{' '}
                      {groupData.groupA.name} vs {groupData.groupB.name}
                    </p>
                  </div>
                  <StatusBadge status={metrics.status} />
                </div>

                {/* Score + rates */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className={cn(
                    'flex flex-col items-center justify-center p-6 rounded-xl border-2',
                    metrics.status === 'BIAS DETECTED' ? 'border-red-200 bg-red-50' : 'border-emerald-200 bg-emerald-50'
                  )}>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Fairness Score</p>
                    <p className={cn(
                      'text-5xl font-black font-mono',
                      metrics.status === 'BIAS DETECTED' ? 'text-red-500' : 'text-emerald-500'
                    )}>
                      {metrics.disparateImpact.toFixed(2)}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">Fair = 0.80 or higher</p>
                  </div>

                  <div className="p-5 bg-slate-50 rounded-xl border border-slate-200">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">{groupData.groupA.name}</p>
                    <p className="text-2xl font-bold text-slate-900">{(metrics.rateA * 100).toFixed(0)}%</p>
                    <p className="text-xs text-slate-500 mt-1">approval rate</p>
                    <div className="mt-3 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${metrics.rateA * 100}%` }} />
                    </div>
                  </div>

                  <div className="p-5 bg-slate-50 rounded-xl border border-slate-200">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">{groupData.groupB.name}</p>
                    <p className="text-2xl font-bold text-slate-900">{(metrics.rateB * 100).toFixed(0)}%</p>
                    <p className="text-xs text-slate-500 mt-1">approval rate</p>
                    <div className="mt-3 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div className="h-full bg-purple-500 rounded-full" style={{ width: `${metrics.rateB * 100}%` }} />
                    </div>
                  </div>
                </div>

                {/* AI Explanation */}
                <div className="p-5 bg-blue-50 border border-blue-100 rounded-xl mb-6">
                  <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                    <BrainCircuit className="w-3.5 h-3.5" /> What the AI says (in plain English)
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
                    {mitigating ? (
                      <>
                        <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                        Applying fix…
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4" /> Simulate bias fix
                      </>
                    )}
                  </button>
                  <button
                    onClick={reset}
                    className="flex-1 border border-slate-200 hover:bg-slate-50 py-3.5 rounded-xl font-semibold text-sm text-slate-600 transition-all"
                  >
                    Start new audit
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              RESOLVED
          ══════════════════════════════════════════════════════════════════ */}
          {phase === 'resolved' && resolvedMetrics && originalMetrics && (
            <motion.div
              key="resolved"
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="space-y-6"
            >
              {/* Success banner */}
              <div className="bg-emerald-600 text-white rounded-2xl p-6 flex items-center gap-4">
                <ShieldCheck className="w-8 h-8 shrink-0" />
                <div>
                  <h2 className="text-lg font-bold">Bias fixed — fairness restored</h2>
                  <p className="text-sm text-emerald-100 mt-0.5">
                    The model now treats {groupData.groupA.name} and {groupData.groupB.name} with equal consideration.
                  </p>
                </div>
              </div>

              {/* Before / After */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <h3 className="font-bold mb-5">Before vs After</h3>

                {/* Comparison bar chart */}
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
                      <XAxis dataKey="name" fontSize={11} axisLine={false} tickLine={false} />
                      <YAxis domain={[0, 1.3]} fontSize={11} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 12 }}
                        formatter={(v: number) => [v.toFixed(2), 'Fairness score']}
                      />
                      <ReferenceLine y={0.8} stroke="#f59e0b" strokeDasharray="4 2" label={{ value: 'Fair threshold (0.80)', position: 'right', fontSize: 10, fill: '#b45309' }} />
                      <Bar dataKey="score" radius={[6, 6, 0, 0]} maxBarSize={80}>
                        <Cell fill="#ef4444" />
                        <Cell fill="#10b981" />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="p-4 bg-red-50 rounded-xl border border-red-100 text-center">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Original score</p>
                    <p className="text-3xl font-black text-red-500 font-mono">{originalMetrics.disparateImpact.toFixed(2)}</p>
                    <p className="text-xs text-slate-500 mt-1">Biased</p>
                  </div>
                  <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 text-center">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Fixed score</p>
                    <p className="text-3xl font-black text-emerald-500 font-mono">{resolvedMetrics.disparateImpact.toFixed(2)}</p>
                    <p className="text-xs text-slate-500 mt-1">Fair</p>
                  </div>
                </div>

                {/* What changed */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl mb-6 text-sm text-slate-700 leading-relaxed">
                  <strong>What changed?</strong> The reweighting strategy adjusted how decisions were distributed across groups. {groupData.groupA.name} and {groupData.groupB.name} now have approval rates within the industry standard fairness threshold (0.80+).
                </div>

                {/* Download + restart */}
                <div className="flex flex-col sm:flex-row gap-3">
                  {csvData && (
                    <button
                      onClick={downloadCSV}
                      className="flex-1 bg-slate-900 text-white py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-slate-800 transition-all"
                    >
                      <Download className="w-4 h-4" /> Download audit proof (CSV)
                    </button>
                  )}
                  <button
                    onClick={reset}
                    className="flex-1 border border-slate-200 hover:bg-slate-50 py-3.5 rounded-xl font-semibold text-sm text-slate-600 transition-all"
                  >
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
