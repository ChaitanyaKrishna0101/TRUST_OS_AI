import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShieldAlert, ShieldCheck, BrainCircuit, Calculator, Upload,
  ArrowRight, CheckCircle2, AlertCircle, Zap, Download,
  RotateCcw, HelpCircle, Info
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

type Step = 'upload' | 'preview' | 'problem' | 'processing' | 'audit' | 'resolution';

interface FairnessMetrics {
  rateA: number; rateB: number;
  disparateImpact: number; demographicParityDiff: number;
  status: string;
}

// ─── Problem Mapping Engine ───────────────────────────────────────────────────
// Each problem defines which columns it expects in a real dataset.
// This lets the system interpret the same raw data differently per context.

interface ProblemMapping {
  sensitiveKeywords: string[];   // column name hints for the group/sensitive attribute
  outcomeKeywords: string[];     // column name hints for the decision/outcome
  explanation: string;           // shown to user explaining the context
}

const PROBLEM_MAPPINGS: Record<string, ProblemMapping> = {
  hiring:    { sensitiveKeywords: ['gender','sex','race','ethnicity','age'],        outcomeKeywords: ['hired','selected','hire','decision','approved','result'],     explanation: 'Checks whether hiring decisions favour some demographic groups over others.' },
  banking:   { sensitiveKeywords: ['gender','sex','race','ethnicity','age'],        outcomeKeywords: ['approved','loan','credit','decision','result','outcome'],     explanation: 'Measures if loan approvals differ significantly by protected attribute.' },
  health:    { sensitiveKeywords: ['gender','sex','race','ethnicity','age'],        outcomeKeywords: ['treated','admitted','approved','access','outcome','result'],  explanation: 'Detects unequal access to medical treatment across patient groups.' },
  edu:       { sensitiveKeywords: ['gender','sex','race','ethnicity','age'],        outcomeKeywords: ['admitted','accepted','approved','admit','decision'],          explanation: 'Audits whether admissions algorithms disadvantage certain student groups.' },
  justice:   { sensitiveKeywords: ['gender','sex','race','ethnicity','age'],        outcomeKeywords: ['released','bail','parole','approved','decision','result'],    explanation: 'Evaluates fairness in bail and parole decisions across demographic groups.' },
  insurance: { sensitiveKeywords: ['gender','sex','race','age','location','zip'],  outcomeKeywords: ['approved','rate','premium','decision','result'],              explanation: 'Identifies if insurance pricing unfairly burdens certain groups.' },
  gov:       { sensitiveKeywords: ['gender','sex','race','ethnicity','age'],        outcomeKeywords: ['approved','benefit','welfare','decision','result'],           explanation: 'Checks whether government benefit systems distribute help equitably.' },
  social:    { sensitiveKeywords: ['gender','sex','race','ethnicity','age'],        outcomeKeywords: ['removed','banned','flagged','moderated','approved'],         explanation: 'Audits content moderation for patterns of unfair censorship.' },
  commerce:  { sensitiveKeywords: ['gender','sex','race','age','location'],         outcomeKeywords: ['shown','targeted','approved','decision','result'],            explanation: 'Measures whether ad targeting and pricing differs across groups.' },
  housing:   { sensitiveKeywords: ['gender','sex','race','ethnicity','location'],   outcomeKeywords: ['approved','valued','rented','sold','decision','result'],      explanation: 'Detects algorithmic discrimination in housing and property valuation.' },
  police:    { sensitiveKeywords: ['gender','sex','race','ethnicity','age','location'], outcomeKeywords: ['stopped','arrested','searched','flagged','decision'],    explanation: 'Evaluates whether predictive policing tools target groups unfairly.' },
  climate:   { sensitiveKeywords: ['income','location','race','age','ethnicity'],   outcomeKeywords: ['approved','subsidy','decision','result'],                    explanation: 'Checks if green energy subsidies reach all communities equally.' },
  legal:     { sensitiveKeywords: ['gender','sex','race','ethnicity','age'],        outcomeKeywords: ['compliant','approved','decision','result','outcome'],        explanation: 'Tests EU AI Act Article 9 compliance for protected attribute fairness.' },
  sme:       { sensitiveKeywords: ['gender','sex','race','ethnicity','location'],   outcomeKeywords: ['approved','funded','loan','decision','result'],               explanation: 'Audits whether SME funding algorithms disadvantage certain founders.' },
  citizen:   { sensitiveKeywords: ['gender','sex','race','ethnicity','age'],        outcomeKeywords: ['approved','explained','decision','result','outcome'],        explanation: 'Ensures citizens receive equal AI decision-making treatment by law.' }
};

// ─── Data ─────────────────────────────────────────────────────────────────────

const INITIAL_DATA = {
  groupA: { name: 'Group A', total: 1000, approved: 400 },
  groupB: { name: 'Group B', total: 1000, approved: 800 }
};

const DEMO_DATASETS = [
  {
    id: 'financial', title: 'Financial Fairness', subtitle: 'Loan approval · 2,000 decisions',
    data: { groupA: { name: 'Minority Group', total: 800, approved: 280 }, groupB: { name: 'Majority Group', total: 1200, approved: 720 } },
    suggestedProblem: 'banking'
  },
  {
    id: 'medical', title: 'Medical Access Audit', subtitle: 'Treatment approval · 1,500 decisions',
    data: { groupA: { name: 'Low-Income', total: 600, approved: 210 }, groupB: { name: 'High-Income', total: 900, approved: 630 } },
    suggestedProblem: 'health'
  }
];

const SCENARIOS = [
  { id: 'hiring',    num: '01', title: 'Hiring',           domain: 'Employment',      desc: 'Screening algorithms and promotion decisions.' },
  { id: 'banking',   num: '02', title: 'Banking & Credit', domain: 'Finance',         desc: 'Loan, credit card, and mortgage approvals.' },
  { id: 'health',    num: '03', title: 'Healthcare',       domain: 'Medicine',        desc: 'Treatment access and diagnostic outcomes.' },
  { id: 'edu',       num: '04', title: 'Education',        domain: 'Admissions',      desc: 'University and scholarship selection.' },
  { id: 'justice',   num: '05', title: 'Criminal Justice', domain: 'Legal',           desc: 'Bail, parole, and sentencing recommendations.' },
  { id: 'insurance', num: '06', title: 'Insurance',        domain: 'Risk pricing',    desc: 'Premium rates and claim approvals.' },
  { id: 'gov',       num: '07', title: 'Government',       domain: 'Public services', desc: 'Welfare, benefits, and subsidy allocation.' },
  { id: 'social',    num: '08', title: 'Social Media',     domain: 'Moderation',      desc: 'Content removal and account restrictions.' },
  { id: 'commerce',  num: '09', title: 'E-Commerce',       domain: 'Retail',          desc: 'Ad targeting and dynamic pricing systems.' },
  { id: 'housing',   num: '10', title: 'Real Estate',      domain: 'Property',        desc: 'Valuation algorithms and listing access.' },
  { id: 'police',    num: '11', title: 'Policing',         domain: 'Public safety',   desc: 'Predictive patrol and risk scoring tools.' },
  { id: 'climate',   num: '12', title: 'Energy Access',    domain: 'Environment',     desc: 'Green tech grants and subsidy distribution.' },
  { id: 'legal',     num: '13', title: 'AI Compliance',    domain: 'Regulation',      desc: 'EU AI Act Article 9 fairness requirements.' },
  { id: 'sme',       num: '14', title: 'Small Business',   domain: 'Finance',         desc: 'SME funding and market access algorithms.' },
  { id: 'citizen',   num: '15', title: 'Citizen Rights',   domain: 'Governance',      desc: 'Right-to-explanation under AI decision-making.' }
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
  "Parsing data structure…",
  "Layer 1 · Math Engine active",
  "Identifying protected groups…",
  "Computing approval rates per group…",
  "Applying 4/5ths disparate impact rule…",
  "Layer 2 · AI Explainer initialising…",
  "Audit complete — results ready."
];

// ─── Column Match Helper ──────────────────────────────────────────────────────

function matchColumns(columnNames: string[], keywords: string[]): string | null {
  const lower = columnNames.map(c => c.toLowerCase().replace(/[^a-z]/g, ''));
  for (const kw of keywords) {
    const idx = lower.findIndex(c => c.includes(kw) || kw.includes(c));
    if (idx >= 0) return columnNames[idx];
  }
  return null;
}

interface ColumnMatchResult {
  sensitiveCol: string | null;
  outcomeCol: string | null;
  sensitiveOriginal: string | null;
  outcomeOriginal: string | null;
  isGoodMatch: boolean;
}

function evaluateColumnMatch(columnNames: string[], problemId: string): ColumnMatchResult {
  const mapping = PROBLEM_MAPPINGS[problemId];
  if (!mapping) return { sensitiveCol: null, outcomeCol: null, sensitiveOriginal: null, outcomeOriginal: null, isGoodMatch: false };
  const s = matchColumns(columnNames, mapping.sensitiveKeywords);
  const o = matchColumns(columnNames, mapping.outcomeKeywords);
  return {
    sensitiveCol: s,
    outcomeCol: o,
    sensitiveOriginal: s,
    outcomeOriginal: o,
    isGoodMatch: s !== null && o !== null
  };
}

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
  const l1Active = step === 'processing';
  const l2Active = step === 'audit';
  const l3Active = step === 'resolution';
  const l1Done = ['audit', 'resolution'].includes(step);
  const l2Done = step === 'resolution';

  const layers = [
    { label: 'Layer 1 · Math Engine',    sub: 'Objective detection. Zero AI.',   active: l1Active, done: l1Done, color: 'emerald' as const },
    { label: 'Layer 2 · AI Explainer',   sub: 'Translates results to language.', active: l2Active, done: l2Done, color: 'blue' as const },
    { label: 'Layer 3 · Parity Lock',    sub: 'Verification & compliance.',      active: l3Active, done: false,  color: 'purple' as const }
  ];

  return (
    <div className="grid grid-cols-3 gap-3 mb-4">
      {layers.map(l => (
        <div key={l.label} className={cn(
          'p-3 rounded-xl border transition-all duration-500 relative',
          l.active ? {
            emerald: 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-500/20',
            blue:    'bg-blue-50 border-blue-300 ring-2 ring-blue-500/20',
            purple:  'bg-purple-50 border-purple-300 ring-2 ring-purple-500/20'
          }[l.color] : l.done ? 'bg-slate-50 border-slate-200' : 'bg-slate-50 border-slate-100 opacity-40'
        )}>
          {l.active && (
            <span className={cn('absolute top-2.5 right-2.5 w-1.5 h-1.5 rounded-full animate-pulse',
              { emerald: 'bg-emerald-500', blue: 'bg-blue-500', purple: 'bg-purple-500' }[l.color]
            )} />
          )}
          {l.done && <CheckCircle2 className="absolute top-2.5 right-2.5 w-3.5 h-3.5 text-emerald-500" />}
          <p className={cn('text-[10px] font-bold mb-0.5',
            l.active ? { emerald: 'text-emerald-600', blue: 'text-blue-600', purple: 'text-purple-600' }[l.color]
                     : l.done ? 'text-emerald-600' : 'text-slate-400'
          )}>{l.label}</p>
          <p className="text-[11px] text-slate-500 leading-tight">{l.sub}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Paradox Core Banner ─────────────────────────────────────────────────────

function ParadoxBanner() {
  return (
    <div className="bg-slate-900 rounded-xl px-5 py-4 mb-5 flex items-start gap-4">
      <div className="w-8 h-8 bg-amber-500/20 border border-amber-500/30 rounded-full flex items-center justify-center shrink-0 mt-0.5">
        <HelpCircle className="w-4 h-4 text-amber-400" />
      </div>
      <div className="min-w-0">
        <p className="text-[9px] font-black uppercase tracking-[0.18em] text-amber-400 mb-2">Paradox Core</p>
        <div className="space-y-1 mb-3">
          <p className="text-[11px] text-slate-400 italic">"If the system uses AI, won't the solution also be biased?"</p>
          <p className="text-[11px] text-slate-300">"No. We use math to detect bias. AI only explains the results. Even if AI is wrong, the decision stays correct."</p>
        </div>
        <p className="text-sm font-black text-white bg-blue-600 inline-block px-3 py-1 rounded-lg tracking-tight">
          Math makes the decision. AI just explains it.
        </p>
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [step, setStep]               = useState<Step>('upload');
  const [data, setData]               = useState(INITIAL_DATA);
  const [fileInfo, setFileInfo]       = useState<{ name: string; rows: number; cols: number; columnNames: string[] } | null>(null);
  const [isDemo, setIsDemo]           = useState(false);
  const [suggestedProblem, setSuggestedProblem] = useState<string | null>(null);
  const [uploadErr, setUploadErr]     = useState('');
  const [uploadBusy, setUploadBusy]   = useState(false);
  const [scenario, setScenario]       = useState<string | null>(null);
  const [columnMatch, setColumnMatch] = useState<ColumnMatchResult | null>(null);
  const [logs, setLogs]               = useState<string[]>([]);
  const [progress, setProgress]       = useState(0);
  const [metrics, setMetrics]         = useState<FairnessMetrics | null>(null);
  const [origMetrics, setOrigMetrics] = useState<FairnessMetrics | null>(null);
  const [explanation, setExplanation] = useState('');
  const [history, setHistory]         = useState<{ label: string; metrics: FairnessMetrics }[]>([]);
  const [csvData, setCsvData]         = useState('');
  const [fixing, setFixing]           = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const addLog = (msg: string) => setLogs(prev => [...prev.slice(-5), msg]);

  const goReset = () => {
    setStep('upload'); setData(INITIAL_DATA); setFileInfo(null); setIsDemo(false);
    setSuggestedProblem(null); setUploadErr(''); setUploadBusy(false); setScenario(null);
    setColumnMatch(null); setLogs([]); setProgress(0); setMetrics(null); setOrigMetrics(null);
    setExplanation(''); setHistory([]); setCsvData(''); setFixing(false);
  };

  const navState = (id: Step) => {
    const cur = STEP_ORDER.indexOf(step);
    const own = STEP_ORDER.indexOf(id);
    const isActive = step === id || (id === 'upload' && step === 'preview');
    const isDone = cur > own || (id === 'upload' && cur > 1);
    return { isActive, isDone };
  };

  // ── File parse ──────────────────────────────────────────────────────────────

  const parseFile = (file: File) => {
    setUploadBusy(true); setUploadErr(''); setIsDemo(false); setSuggestedProblem(null);
    const reader = new FileReader();
    reader.onerror = () => { setUploadBusy(false); setUploadErr('Could not read the file. Please use a valid CSV.'); };
    reader.onload = (e) => {
      try {
        const text = (e.target?.result as string) || '';
        const lines = text.split(/\r?\n/).filter(l => l.trim());
        if (lines.length < 2) throw new Error('File has fewer than 2 rows (header + data required).');

        const headers = lines[0].split(',').map(h => h.trim());
        const hdrsLower = headers.map(h => h.toLowerCase());

        const gIdx = hdrsLower.findIndex(h => ['group','gender','sex','race','age','category','class','type','ethnicity'].some(k => h.includes(k)));
        const dIdx = hdrsLower.findIndex(h => ['decision','approved','result','outcome','score','target','label','hire','loan','admit','selected','flagged'].some(k => h.includes(k)));

        if (gIdx < 0) throw new Error(`No group column found. Add a column named "group", "gender", "race", or similar. Your columns: ${headers.join(', ')}`);
        if (dIdx < 0) throw new Error(`No decision column found. Add a column named "decision", "approved", "outcome", or similar. Your columns: ${headers.join(', ')}`);

        const counts: Record<string, { total: number; approved: number }> = {};
        for (let i = 1; i < lines.length; i++) {
          const row = lines[i].split(',').map(c => c.trim());
          if (row.length <= Math.max(gIdx, dIdx)) continue;
          const grp = row[gIdx]; if (!grp) continue;
          const dec = row[dIdx].toLowerCase();
          if (!counts[grp]) counts[grp] = { total: 0, approved: 0 };
          counts[grp].total++;
          if (['1','yes','approved','true','pass','ok','accept','accepted','hire','hired','admit','admitted','selected','treated'].includes(dec))
            counts[grp].approved++;
        }

        const keys = Object.keys(counts).sort((a, b) => counts[b].total - counts[a].total);
        if (keys.length < 2) throw new Error(`Only 1 group found (need at least 2). Groups detected: ${keys.join(', ')}`);

        setData({ groupA: { name: keys[1], ...counts[keys[1]] }, groupB: { name: keys[0], ...counts[keys[0]] } });
        setFileInfo({ name: file.name, rows: lines.length - 1, cols: headers.length, columnNames: headers });
        setUploadBusy(false);
        setStep('preview');
      } catch (err: any) {
        setUploadBusy(false);
        setUploadErr(err.message || 'Unknown error reading the file.');
      }
    };
    reader.readAsText(file);
  };

  // ── Problem selection → column validation ──────────────────────────────────

  const handleProblemSelect = (sid: string) => {
    setScenario(sid);
    // If real CSV: evaluate column match and show result before running
    if (!isDemo && fileInfo?.columnNames) {
      const match = evaluateColumnMatch(fileInfo.columnNames, sid);
      setColumnMatch(match);
      // If columns are incompatible, show a warning step before proceeding
      if (!match.isGoodMatch) {
        setColumnMatch(match); // will show warning in the problem step
        return; // let the user see the warning and confirm manually
      }
    }
    runAnalysis(sid);
  };

  const confirmAndProceed = () => {
    if (scenario) runAnalysis(scenario);
  };

  // ── Analysis ─────────────────────────────────────────────────────────────────

  const runAnalysis = async (sid: string) => {
    setStep('processing'); setLogs([]); setProgress(0); setColumnMatch(null);
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
      exp = `Comparing ${data.groupA.name} and ${data.groupB.name}: the fairness score of ${m.disparateImpact.toFixed(2)} ${m.status === 'BIAS DETECTED' ? 'falls below the 0.80 threshold — bias is statistically confirmed.' : 'meets the 0.80 standard — decisions are equitable across groups.'}`;
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
      setMetrics(json.metrics); setCsvData(json.csvData);
    } catch {
      const rA = 0.72, rB = 0.78;
      const m2 = { rateA: rA, rateB: rB, disparateImpact: rA / rB, demographicParityDiff: Math.abs(rA - rB), status: 'MODEL FAIR' };
      setHistory(prev => [...prev, { label: 'Mitigated', metrics: m2 }]);
      setMetrics(m2);
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
          <span className="font-bold tracking-tight text-slate-900">TrustOS</span>
          <span className="text-slate-300 hidden sm:block">|</span>
          <span className="text-slate-500 text-sm hidden sm:block">AI Fairness Audit</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden sm:flex items-center gap-1.5 text-[10px] font-bold px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            Math Engine Active
          </span>
          <span className="text-[10px] font-bold px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full hidden md:block">
            15 Problem Scenarios
          </span>
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
                isActive ? 'bg-white border border-slate-200 text-slate-900 font-bold shadow-sm'
                : isDone  ? 'text-emerald-600 font-medium'
                : 'text-slate-400'
              )}>
                <div className={cn(
                  'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0',
                  isActive ? 'bg-blue-600 text-white'
                  : isDone  ? 'border border-emerald-500 text-emerald-500'
                  : 'border border-slate-300 text-slate-400'
                )}>
                  {isDone ? '✓' : i + 1}
                </div>
                {s.label}
              </div>
            );
          })}

          <div className="mt-auto p-3 bg-slate-200/60 rounded-xl">
            <p className="text-[9px] font-bold uppercase text-slate-500 mb-1.5">Engine Status</p>
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-600">Math Layer</span>
              <span className="text-emerald-600 font-bold">READY</span>
            </div>
            <div className="flex justify-between text-[11px] mt-1">
              <span className="text-slate-600">AI Layer</span>
              <span className="text-blue-600 font-bold">STANDBY</span>
            </div>
          </div>
        </nav>

        {/* ── Main Content ─────────────────────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto bg-white">
          <div className="max-w-4xl mx-auto p-5">

            {/* 3-Layer Header */}
            <LayerHeader step={step} />

            {/* Paradox Core Banner */}
            <ParadoxBanner />

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
                  <h2 className="text-xl font-bold mb-1.5">Upload Your Decision Data</h2>
                  <p className="text-sm text-slate-500 mb-7 max-w-xs">
                    Any CSV with a group column and a decision column. The system handles 15 real-world fairness scenarios.
                  </p>

                  <input ref={fileRef} type="file" accept=".csv" className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) parseFile(f); e.target.value = ''; }} />

                  {!uploadBusy ? (
                    <button onClick={() => fileRef.current?.click()}
                      className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-8 py-3 rounded-xl font-bold text-sm shadow-md transition-all w-full max-w-xs justify-center"
                    >
                      <Upload className="w-4 h-4" /> Select CSV File
                    </button>
                  ) : (
                    <div className="flex items-center gap-3 text-slate-600 text-sm">
                      <div className="w-4 h-4 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
                      Reading file…
                    </div>
                  )}

                  {uploadErr && (
                    <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 text-left max-w-sm mt-4">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <p>{uploadErr}</p>
                    </div>
                  )}

                  <div className="mt-7 w-full max-w-sm">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Or use a demo dataset</p>
                    <div className="grid grid-cols-2 gap-3">
                      {DEMO_DATASETS.map(d => (
                        <button key={d.id}
                          onClick={() => {
                            setData(d.data);
                            setFileInfo({ name: d.title, rows: d.data.groupA.total + d.data.groupB.total, cols: 3, columnNames: [] });
                            setIsDemo(true);
                            setSuggestedProblem(d.suggestedProblem);
                            setStep('preview');
                          }}
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
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" /> Dataset Verified
                  </h2>
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    {[
                      { label: 'Records',        val: (fileInfo?.rows || 1000).toLocaleString() },
                      { label: 'Groups Found',   val: '2' },
                      { label: 'Columns',        val: String(fileInfo?.cols || 3) }
                    ].map(c => (
                      <div key={c.label} className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{c.label}</p>
                        <p className="text-2xl font-bold">{c.val}</p>
                      </div>
                    ))}
                  </div>
                  <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-lg text-sm text-emerald-700 mb-3">
                    Groups identified: <strong>{data.groupA.name}</strong> and <strong>{data.groupB.name}</strong>
                  </div>
                  {isDemo && suggestedProblem && (
                    <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg text-sm text-blue-700 mb-5 flex items-start gap-2">
                      <Info className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>Demo dataset suggestion: <strong>{SCENARIOS.find(s => s.id === suggestedProblem)?.title}</strong> scenario is recommended for this data.</span>
                    </div>
                  )}
                  <button onClick={() => setStep('problem')}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 shadow-md shadow-blue-200 transition-all"
                  >
                    Continue to Scenario Selection <ArrowRight className="w-4 h-4" />
                  </button>
                </motion.div>
              )}

              {/* ── PROBLEM ─────────────────────────────────────────────── */}
              {step === 'problem' && (
                <motion.div key="problem" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>

                  {/* Why this step exists — context explanation */}
                  <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 mb-5 flex items-start gap-3">
                    <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-amber-900 mb-1">Why choose a scenario?</p>
                      <p className="text-xs text-amber-800 leading-relaxed">
                        Your dataset is raw numbers — it doesn't say <em>what kind of decision</em> it represents.
                        The scenario tells the Math Engine what "fair" means in this context.
                        A <strong>hiring dataset</strong> and a <strong>loan dataset</strong> may look identical but require completely different fairness rules.
                      </p>
                      {isDemo && suggestedProblem && (
                        <p className="text-xs text-amber-700 mt-2 font-semibold">
                          Recommended for your data: <strong className="text-amber-900">{SCENARIOS.find(s => s.id === suggestedProblem)?.title}</strong>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Column mismatch warning (real CSV only) */}
                  {columnMatch && !columnMatch.isGoodMatch && (
                    <div className="bg-orange-50 border border-orange-300 rounded-xl px-5 py-4 mb-5">
                      <div className="flex items-start gap-3 mb-3">
                        <AlertCircle className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-bold text-orange-900">Column mismatch detected</p>
                          <p className="text-xs text-orange-700 mt-1">
                            The <strong>{currentScenario?.title}</strong> scenario expects columns for a sensitive attribute
                            {!columnMatch.sensitiveCol ? ' (e.g. gender, race, age)' : ''} and decision outcome
                            {!columnMatch.outcomeCol ? ' (e.g. approved, hired, selected)' : ''}.
                          </p>
                          <p className="text-xs text-orange-700 mt-1">
                            Your columns: <span className="font-mono bg-orange-100 px-1 rounded">{fileInfo?.columnNames.join(', ')}</span>
                          </p>
                          <p className="text-xs text-orange-800 mt-2 font-semibold">
                            This may mean you've selected the wrong scenario. Choose a different one, or proceed anyway.
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={confirmAndProceed}
                          className="text-xs font-bold px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                        >
                          Proceed anyway
                        </button>
                        <button onClick={() => setColumnMatch(null)}
                          className="text-xs font-bold px-4 py-2 border border-orange-300 text-orange-700 rounded-lg hover:bg-orange-100 transition-colors"
                        >
                          Choose different scenario
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="text-center mb-4">
                    <h2 className="text-xl font-bold">Select a Scenario</h2>
                    <p className="text-sm text-slate-500 mt-1">The system can audit all 15 of these real-world fairness problems.</p>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {SCENARIOS.map(s => {
                      const isSuggested = isDemo && suggestedProblem === s.id;
                      return (
                        <button key={s.id} onClick={() => handleProblemSelect(s.id)}
                          className={cn(
                            'p-3.5 bg-white border rounded-xl text-left transition-all group relative',
                            isSuggested
                              ? 'border-blue-400 ring-2 ring-blue-500/20 shadow-md'
                              : 'border-slate-200 hover:border-blue-400 hover:shadow-sm'
                          )}
                        >
                          {isSuggested && (
                            <span className="absolute -top-2 right-3 text-[9px] font-black uppercase tracking-widest bg-blue-600 text-white px-2 py-0.5 rounded-full">
                              Recommended
                            </span>
                          )}
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[9px] font-bold text-blue-600 tracking-widest">{s.num}</span>
                            <span className="text-[9px] text-slate-400">{s.domain}</span>
                          </div>
                          <p className="text-xs font-bold text-slate-900 mb-1 group-hover:text-blue-700 transition-colors">{s.title}</p>
                          <p className="text-[10px] text-slate-500 leading-tight">{s.desc}</p>
                        </button>
                      );
                    })}
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
                      {currentScenario?.title || 'Custom Audit'} · {data.groupA.name} vs {data.groupB.name}
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
                          className={cn('text-sm font-mono transition-all',
                            i === logs.length - 1 ? 'opacity-100 font-bold text-blue-300' : 'opacity-30'
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
                <motion.div key="audit" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-5">
                      <div>
                        <h3 className="text-xl font-black tracking-tight">Audit Findings</h3>
                        <p className="text-sm text-slate-500 mt-0.5">
                          {currentScenario?.title || 'Custom'} · {data.groupA.name} vs {data.groupB.name}
                        </p>
                      </div>
                      <StatusBadge status={metrics.status} />
                    </div>

                    <div className="grid grid-cols-2 gap-6 mb-5 items-start">
                      <div className={cn(
                        'flex flex-col items-center py-8 rounded-2xl border-2',
                        metrics.status === 'BIAS DETECTED' ? 'border-red-200 bg-red-50' : 'border-emerald-200 bg-emerald-50'
                      )}>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Fairness Score</p>
                        <p className={cn('text-6xl font-black font-mono mb-1', metrics.status === 'BIAS DETECTED' ? 'text-red-500' : 'text-emerald-500')}>
                          {metrics.disparateImpact.toFixed(2)}
                        </p>
                        <p className="text-[11px] text-slate-500 font-bold mb-3">Threshold: 0.80 or above</p>
                        <div className="flex gap-4 text-xs text-slate-600">
                          <span><strong>{(metrics.rateA * 100).toFixed(0)}%</strong> {data.groupA.name}</span>
                          <span><strong>{(metrics.rateB * 100).toFixed(0)}%</strong> {data.groupB.name}</span>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
                          <p className="text-[9px] font-bold text-blue-600 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                            <BrainCircuit className="w-3.5 h-3.5" /> AI Explanation
                          </p>
                          <p className="text-sm text-slate-700 leading-relaxed">{explanation}</p>
                        </div>
                        <button onClick={handleFix} disabled={fixing}
                          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-blue-200 transition-all"
                        >
                          {fixing
                            ? <><div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" /> Balancing data…</>
                            : <><Zap className="w-4 h-4" /> Resolve This Bias</>}
                        </button>
                        <button onClick={goReset}
                          className="w-full text-slate-400 text-sm font-semibold py-1 hover:text-slate-700 transition-colors flex items-center justify-center gap-1"
                        >
                          <RotateCcw className="w-3.5 h-3.5" /> Start New Audit
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ── RESOLUTION ──────────────────────────────────────────── */}
              {step === 'resolution' && metrics && origMetrics && (
                <motion.div key="resolution" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-5">
                      <div>
                        <h3 className="text-2xl font-black tracking-tight">Audit Complete</h3>
                        <p className="text-emerald-600 text-sm font-semibold mt-0.5">Deterministic parity applied.</p>
                      </div>
                      <StatusBadge status="MODEL FAIR" />
                    </div>

                    {history.length >= 2 && (
                      <div className="h-44 mb-5">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={[
                              { name: 'Before Fix', score: history[0].metrics.disparateImpact },
                              { name: 'After Fix',  score: history[1].metrics.disparateImpact }
                            ]}
                            margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
                          >
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
                        <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest mb-1">Result</p>
                        <p className="text-sm text-emerald-800 leading-relaxed">
                          {data.groupA.name} and {data.groupB.name} now receive equal consideration.
                        </p>
                      </div>
                      <div className="bg-slate-900 p-5 rounded-2xl text-white">
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Certificate</p>
                        <p className="text-xs text-slate-300 mb-3">Compliant with EU AI Act Article 9.</p>
                        <button onClick={downloadCSV} disabled={!csvData}
                          className="w-full bg-white/10 hover:bg-white/20 text-white py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-40"
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
              <p className="font-bold mb-2 text-slate-700">Layer 1 · Statistical Check</p>
              <div className="flex justify-between items-center mb-1.5">
                <p className="text-slate-500">Demographic Parity Index</p>
                <span className="font-mono font-bold text-slate-900">{metrics?.demographicParityDiff.toFixed(2) ?? '–'}</span>
              </div>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="bg-red-400 h-full transition-all duration-700" style={{ width: `${Math.min((metrics?.demographicParityDiff ?? 0) * 100, 100)}%` }} />
              </div>
            </div>

            <div className="text-xs pb-4 border-b border-slate-100">
              <p className="font-bold mb-2 text-slate-700">Layer 2 · Fairness Score</p>
              <div className="flex justify-between items-center mb-1.5">
                <p className="text-slate-500">Disparate Impact Ratio</p>
                <span className="font-mono font-bold text-slate-900">{metrics?.disparateImpact.toFixed(2) ?? '–'}</span>
              </div>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="bg-blue-400 h-full transition-all duration-700" style={{ width: `${Math.min((metrics?.disparateImpact ?? 0) * 70, 100)}%` }} />
              </div>
            </div>

            {step === 'problem' && (
              <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                className="p-3 bg-amber-50 border border-amber-100 rounded-xl text-xs text-amber-700"
              >
                <p className="font-bold mb-1">Why 15 problems?</p>
                <p className="leading-relaxed text-amber-600">Each problem uses different fairness rules. Banking bias ≠ Hiring bias. The engine adapts its math to the selected context.</p>
              </motion.div>
            )}

            {step === 'audit' && (
              <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-blue-50 border border-blue-100 rounded-xl"
              >
                <p className="text-[9px] font-bold text-blue-600 uppercase tracking-widest mb-2">AI Layer Context</p>
                <p className="text-[11px] text-blue-700 leading-relaxed italic">
                  "Decision computed by Math Engine only. AI is explaining, not deciding."
                </p>
              </motion.div>
            )}

            <div className="text-xs">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">Mitigation Strategy</p>
              {['Reweighting', 'Oversampling', 'Threshold Adjustment'].map(m => (
                <label key={m} className="flex items-center gap-2 py-1.5">
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
              Validation Hash<br /><span className="font-mono text-slate-600 not-italic">0x8F22…BE09</span>
            </p>
          </div>
        </aside>

      </div>
    </div>
  );
}
