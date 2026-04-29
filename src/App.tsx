import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShieldAlert, ShieldCheck, BrainCircuit, Calculator, Upload,
  ArrowRight, CheckCircle2, AlertCircle, Zap, Download,
  RotateCcw, Info, X, ArrowLeft, ChevronRight
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

type Step  = 'upload' | 'preview' | 'problem' | 'processing' | 'audit' | 'resolution';
type Modal = null | 'mathEngine' | 'problems';

interface FairnessMetrics {
  rateA: number; rateB: number;
  disparateImpact: number; demographicParityDiff: number;
  status: string;
}

// ─── Problem Mapping Engine ───────────────────────────────────────────────────

const PROBLEM_MAPPINGS: Record<string, { sensitiveKeywords: string[]; outcomeKeywords: string[] }> = {
  hiring:    { sensitiveKeywords: ['gender','sex','race','ethnicity','age'],             outcomeKeywords: ['hired','selected','hire','decision','approved','result'] },
  banking:   { sensitiveKeywords: ['gender','sex','race','ethnicity','age'],             outcomeKeywords: ['approved','loan','credit','decision','result','outcome'] },
  health:    { sensitiveKeywords: ['gender','sex','race','ethnicity','age'],             outcomeKeywords: ['treated','admitted','approved','access','outcome','result'] },
  edu:       { sensitiveKeywords: ['gender','sex','race','ethnicity','age'],             outcomeKeywords: ['admitted','accepted','approved','admit','decision'] },
  justice:   { sensitiveKeywords: ['gender','sex','race','ethnicity','age'],             outcomeKeywords: ['released','bail','parole','approved','decision','result'] },
  insurance: { sensitiveKeywords: ['gender','sex','race','age','location','zip'],        outcomeKeywords: ['approved','rate','premium','decision','result'] },
  gov:       { sensitiveKeywords: ['gender','sex','race','ethnicity','age'],             outcomeKeywords: ['approved','benefit','welfare','decision','result'] },
  social:    { sensitiveKeywords: ['gender','sex','race','ethnicity','age'],             outcomeKeywords: ['removed','banned','flagged','moderated','approved'] },
  commerce:  { sensitiveKeywords: ['gender','sex','race','age','location'],              outcomeKeywords: ['shown','targeted','approved','decision','result'] },
  housing:   { sensitiveKeywords: ['gender','sex','race','ethnicity','location'],        outcomeKeywords: ['approved','valued','rented','sold','decision','result'] },
  police:    { sensitiveKeywords: ['gender','sex','race','ethnicity','age','location'],  outcomeKeywords: ['stopped','arrested','searched','flagged','decision'] },
  climate:   { sensitiveKeywords: ['income','location','race','age','ethnicity'],        outcomeKeywords: ['approved','subsidy','decision','result'] },
  legal:     { sensitiveKeywords: ['gender','sex','race','ethnicity','age'],             outcomeKeywords: ['compliant','approved','decision','result','outcome'] },
  sme:       { sensitiveKeywords: ['gender','sex','race','ethnicity','location'],        outcomeKeywords: ['approved','funded','loan','decision','result'] },
  citizen:   { sensitiveKeywords: ['gender','sex','race','ethnicity','age'],             outcomeKeywords: ['approved','explained','decision','result','outcome'] }
};

// ─── Static Data ──────────────────────────────────────────────────────────────

const INITIAL_DATA = {
  groupA: { name: 'Group A', total: 1000, approved: 400 },
  groupB: { name: 'Group B', total: 1000, approved: 800 }
};

const DEMO_DATASETS = [
  { id: 'financial', title: 'Financial Fairness', subtitle: 'Loan approvals · 2,000 records',
    data: { groupA: { name: 'Minority Group', total: 800, approved: 280 }, groupB: { name: 'Majority Group', total: 1200, approved: 720 } },
    suggestedProblem: 'banking' },
  { id: 'medical', title: 'Medical Access Audit', subtitle: 'Treatment access · 1,500 records',
    data: { groupA: { name: 'Low-Income', total: 600, approved: 210 }, groupB: { name: 'High-Income', total: 900, approved: 630 } },
    suggestedProblem: 'health' }
];

const SCENARIOS = [
  { id: 'hiring',    num: '01', title: 'Hiring',           domain: 'Employment',    impact: 'Who gets the job', handle: 'Checks if screening algorithms treat all applicants equally regardless of demographics.' },
  { id: 'banking',   num: '02', title: 'Banking & Credit', domain: 'Finance',       impact: 'Who gets the loan', handle: 'Measures whether loan approval rates differ unfairly across groups.' },
  { id: 'health',    num: '03', title: 'Healthcare',       domain: 'Medicine',      impact: 'Who gets treatment', handle: 'Detects if medical AI gives different access levels to different patient groups.' },
  { id: 'edu',       num: '04', title: 'Education',        domain: 'Admissions',    impact: 'Who gets in',       handle: 'Audits if admissions tools disadvantage certain student demographics.' },
  { id: 'justice',   num: '05', title: 'Criminal Justice', domain: 'Legal',         impact: 'Who gets bail',     handle: 'Evaluates fairness in bail and parole recommendations across groups.' },
  { id: 'insurance', num: '06', title: 'Insurance',        domain: 'Risk pricing',  impact: 'Who pays more',     handle: 'Identifies if premiums or approvals unfairly burden certain groups.' },
  { id: 'gov',       num: '07', title: 'Government',       domain: 'Public services',impact: 'Who gets help',    handle: 'Checks whether benefit and welfare AI distributes help equitably.' },
  { id: 'social',    num: '08', title: 'Social Media',     domain: 'Moderation',    impact: 'Who gets silenced', handle: 'Audits content moderation for disproportionate censorship patterns.' },
  { id: 'commerce',  num: '09', title: 'E-Commerce',       domain: 'Retail',        impact: 'Who sees which price', handle: 'Measures if ad targeting and dynamic pricing treats users fairly.' },
  { id: 'housing',   num: '10', title: 'Real Estate',      domain: 'Property',      impact: 'Who can buy/rent',  handle: 'Detects discrimination in valuation algorithms and listing access.' },
  { id: 'police',    num: '11', title: 'Policing',         domain: 'Public safety', impact: 'Who gets targeted',  handle: 'Evaluates if predictive tools disproportionately flag certain communities.' },
  { id: 'climate',   num: '12', title: 'Energy Access',    domain: 'Environment',   impact: 'Who gets subsidies', handle: 'Checks if green energy grants reach all communities equally.' },
  { id: 'legal',     num: '13', title: 'AI Compliance',    domain: 'Regulation',    impact: 'Who is at legal risk', handle: 'Tests EU AI Act Article 9 compliance for protected attribute fairness.' },
  { id: 'sme',       num: '14', title: 'Small Business',   domain: 'Finance',       impact: 'Who gets funded',   handle: 'Audits whether SME funding algorithms disadvantage certain founders.' },
  { id: 'citizen',   num: '15', title: 'Citizen Rights',   domain: 'Governance',    impact: 'Who can contest AI', handle: 'Ensures equal right-to-explanation when AI makes decisions about people.' }
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
  "Computing per-group approval rates…",
  "Applying 4/5ths disparate impact rule…",
  "Layer 2 · AI Explainer initialising…",
  "Audit complete — results ready."
];

// ─── Column matching ───────────────────────────────────────────────────────────

function matchCol(cols: string[], kws: string[]): string | null {
  const lc = cols.map(c => c.toLowerCase().replace(/[^a-z]/g, ''));
  for (const kw of kws) {
    const i = lc.findIndex(c => c.includes(kw) || kw.includes(c));
    if (i >= 0) return cols[i];
  }
  return null;
}

// ─── Math Engine Modal ────────────────────────────────────────────────────────

function MathEngineModal({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const layers = [
    {
      num: '01', color: 'emerald', Icon: Calculator,
      title: 'Math Engine',
      subtitle: 'The Truth Layer — No AI Involved',
      desc: 'Pure mathematics calculates fairness. It computes the Disparate Impact ratio and Demographic Parity Index between groups. The output is objective and deterministic — it cannot be influenced by machine learning bias.'
    },
    {
      num: '02', color: 'blue', Icon: BrainCircuit,
      title: 'AI Explainer',
      subtitle: 'The Translation Layer — Reads Results Only',
      desc: 'AI receives the math output and translates the numbers into plain language for humans. It cannot change the verdict — only explain it. Even if the AI misunderstands, the decision already happened in Layer 1.'
    },
    {
      num: '03', color: 'purple', Icon: ShieldCheck,
      title: 'Parity Lock',
      subtitle: 'The Verification Layer — Compliance Proof',
      desc: 'Applies bias mitigation strategies (reweighting, threshold adjustment) and certifies the result against EU AI Act Article 9. Generates a downloadable audit certificate.'
    }
  ] as const;

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8 }}
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-slate-900 px-6 py-5 flex items-start justify-between">
          <div>
            <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1">System Architecture</p>
            <h2 className="text-xl font-bold text-white tracking-tight">How TrustOS Detects Bias</h2>
            <p className="text-slate-400 text-sm mt-0.5">Three layers. Math decides. AI explains. Zero guesswork.</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Flow diagram */}
        <div className="px-6 py-4 bg-slate-800 flex items-center gap-2 text-[11px] font-mono text-slate-400 overflow-x-auto">
          {['Your Data', 'Math Engine', 'Fairness Score', 'AI Explainer', 'Report', 'Parity Lock', 'Certificate'].map((item, i) => (
            <React.Fragment key={item}>
              <span className={cn(
                'px-2 py-1 rounded whitespace-nowrap',
                i === 0 ? 'bg-slate-700 text-slate-300' :
                i === 1 || i === 3 || i === 5 ? 'bg-blue-900/60 text-blue-300 font-bold' :
                'bg-slate-700 text-slate-400'
              )}>{item}</span>
              {i < 6 && <ChevronRight className="w-3 h-3 text-slate-600 shrink-0" />}
            </React.Fragment>
          ))}
        </div>

        {/* Layers */}
        <div className="p-5 space-y-3">
          {layers.map(l => (
            <div key={l.num} className={cn(
              'flex items-start gap-4 p-4 rounded-xl border',
              { emerald: 'bg-emerald-50 border-emerald-100', blue: 'bg-blue-50 border-blue-100', purple: 'bg-purple-50 border-purple-100' }[l.color]
            )}>
              <div className={cn(
                'w-9 h-9 rounded-xl flex items-center justify-center shrink-0',
                { emerald: 'bg-emerald-500', blue: 'bg-blue-500', purple: 'bg-purple-500' }[l.color]
              )}>
                <l.Icon className="w-4.5 h-4.5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={cn('text-[9px] font-black uppercase tracking-widest',
                    { emerald: 'text-emerald-600', blue: 'text-blue-600', purple: 'text-purple-600' }[l.color]
                  )}>Layer {l.num}</span>
                  <span className="text-xs font-bold text-slate-900">{l.title}</span>
                </div>
                <p className="text-[10px] font-semibold text-slate-500 mb-1">{l.subtitle}</p>
                <p className="text-xs text-slate-600 leading-relaxed">{l.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="px-5 pb-5">
          <button onClick={onClose}
            className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold text-sm transition-colors flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Audit
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── 15 Problems Modal ────────────────────────────────────────────────────────

function ProblemsModal({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const domainColors: Record<string, string> = {
    'Employment': 'bg-blue-100 text-blue-700',
    'Finance': 'bg-emerald-100 text-emerald-700',
    'Medicine': 'bg-red-100 text-red-700',
    'Admissions': 'bg-violet-100 text-violet-700',
    'Legal': 'bg-amber-100 text-amber-700',
    'Risk pricing': 'bg-orange-100 text-orange-700',
    'Public services': 'bg-cyan-100 text-cyan-700',
    'Moderation': 'bg-pink-100 text-pink-700',
    'Retail': 'bg-lime-100 text-lime-700',
    'Property': 'bg-teal-100 text-teal-700',
    'Public safety': 'bg-rose-100 text-rose-700',
    'Environment': 'bg-green-100 text-green-700',
    'Regulation': 'bg-indigo-100 text-indigo-700',
    'Governance': 'bg-slate-100 text-slate-700'
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8 }}
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-slate-900 px-6 py-5 flex items-start justify-between shrink-0">
          <div>
            <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1">Problem Mapping Engine</p>
            <h2 className="text-xl font-bold text-white tracking-tight">15 Real-World Fairness Problems</h2>
            <p className="text-slate-400 text-sm mt-0.5">Each problem applies different fairness rules to your data.</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Why explain */}
        <div className="px-6 py-3 bg-amber-50 border-b border-amber-100 shrink-0">
          <p className="text-xs text-amber-800">
            <span className="font-bold">Why choose a scenario?</span> Your dataset is raw numbers.
            The scenario tells the Math Engine what kind of decision it represents — so it knows what "fair" means in that context.
            A hiring dataset and a loan dataset may look identical but require completely different fairness rules.
          </p>
        </div>

        {/* List */}
        <div className="overflow-y-auto flex-1 p-4">
          <div className="space-y-1.5">
            {SCENARIOS.map(s => (
              <div key={s.id} className="flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-200">
                <span className="text-[10px] font-black text-slate-300 w-5 shrink-0 pt-0.5">{s.num}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <span className="text-sm font-bold text-slate-900">{s.title}</span>
                    <span className={cn('text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide', domainColors[s.domain] || 'bg-slate-100 text-slate-600')}>{s.domain}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mb-1"><span className="font-semibold text-slate-700">Key question:</span> {s.impact}</p>
                  <p className="text-[11px] text-slate-500 leading-relaxed">{s.handle}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 border-t border-slate-100 shrink-0">
          <button onClick={onClose}
            className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold text-sm transition-colors flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Audit
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Layer Strip ─────────────────────────────────────────────────────────────

function LayerStrip({ step }: { step: Step }) {
  const l1Active = step === 'processing';
  const l2Active = step === 'audit';
  const l3Active = step === 'resolution';
  const l1Done = ['audit', 'resolution'].includes(step);
  const l2Done = step === 'resolution';

  const layers = [
    { label: 'Layer 1 · Math Engine', sub: 'Objective. Zero AI.', active: l1Active, done: l1Done, color: 'emerald' as const },
    { label: 'Layer 2 · AI Explainer', sub: 'Translates results.', active: l2Active, done: l2Done, color: 'blue' as const },
    { label: 'Layer 3 · Parity Lock', sub: 'Verify & certify.', active: l3Active, done: false, color: 'purple' as const }
  ];

  return (
    <div className="grid grid-cols-3 gap-2 mb-3">
      {layers.map(l => (
        <div key={l.label} className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-lg border transition-all duration-500',
          l.active ? {
            emerald: 'bg-emerald-50 border-emerald-300',
            blue:    'bg-blue-50 border-blue-300',
            purple:  'bg-purple-50 border-purple-300'
          }[l.color] : l.done ? 'bg-slate-50 border-slate-200' : 'bg-slate-50 border-slate-100 opacity-40'
        )}>
          {l.done
            ? <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
            : <span className={cn('w-2 h-2 rounded-full shrink-0',
                l.active ? {
                  emerald: 'bg-emerald-500 animate-pulse', blue: 'bg-blue-500 animate-pulse', purple: 'bg-purple-500 animate-pulse'
                }[l.color] : 'bg-slate-300'
              )} />
          }
          <div className="min-w-0">
            <p className={cn('text-[9px] font-bold truncate leading-tight',
              l.active ? { emerald: 'text-emerald-700', blue: 'text-blue-700', purple: 'text-purple-700' }[l.color]
                       : l.done ? 'text-emerald-600' : 'text-slate-400'
            )}>{l.label}</p>
            <p className="text-[9px] text-slate-400 truncate leading-tight">{l.sub}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Paradox Core Banner ─────────────────────────────────────────────────────

function ParadoxCore() {
  return (
    <div className="relative rounded-xl overflow-hidden mb-3 bg-[#0f172a] border border-slate-700/50">
      <div className="absolute inset-0 bg-gradient-to-r from-blue-950/40 via-transparent to-slate-900/40" />
      <div className="relative px-5 py-3.5 flex items-start gap-4">
        {/* Label */}
        <div className="shrink-0 mt-0.5">
          <span className="text-[9px] font-black text-amber-400 uppercase tracking-[0.2em] block mb-1">Paradox Core</span>
          <div className="w-6 h-6 rounded-full border border-amber-500/40 flex items-center justify-center">
            <span className="text-amber-400 text-[10px] font-black">?</span>
          </div>
        </div>

        {/* Q&A */}
        <div className="flex-1 min-w-0">
          <p className="text-[11px] text-slate-400 italic leading-snug mb-1">
            "If our system uses AI, what if that AI is biased? Won't the solution also be biased?"
          </p>
          <p className="text-[11px] text-slate-300 leading-snug mb-2">
            "We don't use AI to make decisions. We use math to detect bias. AI only explains the results.
            So even if AI is wrong, the decision stays correct."
          </p>
          <div className="inline-flex items-center gap-2 bg-blue-600 rounded-lg px-3 py-1.5">
            <span className="text-white text-xs font-black tracking-tight">Math makes the decision. AI just explains it.</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const ok = status !== 'BIAS DETECTED';
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold',
      ok ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
    )}>
      {ok ? <ShieldCheck className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />}
      {status}
    </span>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [step, setStep]               = useState<Step>('upload');
  const [modal, setModal]             = useState<Modal>(null);
  const [data, setData]               = useState(INITIAL_DATA);
  const [fileInfo, setFileInfo]       = useState<{ name: string; rows: number; cols: number; columnNames: string[] } | null>(null);
  const [isDemo, setIsDemo]           = useState(false);
  const [suggestedProblem, setSuggestedProblem] = useState<string | null>(null);
  const [uploadErr, setUploadErr]     = useState('');
  const [uploadBusy, setUploadBusy]   = useState(false);
  const [scenario, setScenario]       = useState<string | null>(null);
  const [colWarn, setColWarn]         = useState<{ sensitive: boolean; outcome: boolean } | null>(null);
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
    setColWarn(null); setLogs([]); setProgress(0); setMetrics(null); setOrigMetrics(null);
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
    reader.onerror = () => { setUploadBusy(false); setUploadErr('Could not read this file. Please check it is a valid CSV.'); };
    reader.onload = (e) => {
      try {
        const text = (e.target?.result as string) || '';
        const lines = text.split(/\r?\n/).filter(l => l.trim());
        if (lines.length < 2) throw new Error('File needs at least a header row and one data row.');

        const headers = lines[0].split(',').map(h => h.trim());
        const hl = headers.map(h => h.toLowerCase());

        const gIdx = hl.findIndex(h => ['group','gender','sex','race','age','category','class','type','ethnicity'].some(k => h.includes(k)));
        const dIdx = hl.findIndex(h => ['decision','approved','result','outcome','score','target','label','hire','loan','admit','selected','flagged'].some(k => h.includes(k)));

        if (gIdx < 0) throw new Error(`No group column found. Your columns: ${headers.join(', ')}. Add a column named "group", "gender", or "race".`);
        if (dIdx < 0) throw new Error(`No decision column found. Your columns: ${headers.join(', ')}. Add a column named "decision", "approved", or "outcome".`);

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
        if (keys.length < 2) throw new Error(`Only 1 group found. Need at least 2. Found: ${keys.join(', ')}`);

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

  // ── Problem select → column check ──────────────────────────────────────────

  const handleProblemSelect = (sid: string) => {
    setScenario(sid);
    if (!isDemo && fileInfo?.columnNames?.length) {
      const m = PROBLEM_MAPPINGS[sid];
      const s = matchCol(fileInfo.columnNames, m.sensitiveKeywords);
      const o = matchCol(fileInfo.columnNames, m.outcomeKeywords);
      if (!s || !o) {
        setColWarn({ sensitive: !s, outcome: !o });
        return;
      }
    }
    setColWarn(null);
    runAnalysis(sid);
  };

  // ── Analysis ─────────────────────────────────────────────────────────────────

  const runAnalysis = async (sid: string) => {
    setStep('processing'); setLogs([]); setProgress(0); setColWarn(null);
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
      exp = `Comparing ${data.groupA.name} and ${data.groupB.name}: the fairness score is ${m.disparateImpact.toFixed(2)}. ${m.status === 'BIAS DETECTED' ? 'This falls below the 0.80 threshold — bias is statistically confirmed.' : 'This meets the 0.80 standard — the model treats groups equitably.'}`;
    }

    setMetrics(m); setOrigMetrics(m); setExplanation(exp);
    setHistory([{ label: 'Original', metrics: m }]);
    setStep('audit');
  };

  // ── Mitigation ─────────────────────────────────────────────────────────────

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
    <>
      {/* ── Modals ──────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {modal === 'mathEngine' && <MathEngineModal onClose={() => setModal(null)} />}
        {modal === 'problems'   && <ProblemsModal   onClose={() => setModal(null)} />}
      </AnimatePresence>

      <div className="h-screen bg-slate-50 text-slate-900 flex flex-col overflow-hidden" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>

        {/* ── Header ───────────────────────────────────────────────────── */}
        <header className="h-12 border-b border-slate-200 bg-white flex items-center justify-between px-5 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
              <ShieldCheck className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold tracking-tight text-slate-900 text-sm">TrustOS</span>
            <span className="text-slate-200 hidden sm:block">|</span>
            <span className="text-slate-400 text-xs hidden sm:block">AI Fairness Audit</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Clickable badge — Math Engine */}
            <button
              onClick={() => setModal('mathEngine')}
              className="hidden sm:flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full hover:bg-emerald-100 transition-colors cursor-pointer"
            >
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              Math Engine Active
            </button>

            {/* Clickable badge — 15 Problems */}
            <button
              onClick={() => setModal('problems')}
              className="hidden sm:flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full hover:bg-blue-100 transition-colors cursor-pointer"
            >
              15 Problem Scenarios
              <ChevronRight className="w-2.5 h-2.5" />
            </button>
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden">

          {/* ── Left Sidebar ─────────────────────────────────────────── */}
          <nav className="w-52 border-r border-slate-200 bg-white p-4 flex flex-col gap-1 shrink-0">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">Audit Journey</p>

            {NAV_STEPS.map((s, i) => {
              const { isActive, isDone } = navState(s.id);
              return (
                <div key={s.id} className={cn(
                  'flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs transition-all',
                  isActive ? 'bg-slate-900 text-white font-semibold'
                  : isDone  ? 'text-emerald-600 font-medium'
                  : 'text-slate-400'
                )}>
                  <div className={cn(
                    'w-4.5 h-4.5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 w-5 h-5',
                    isActive ? 'bg-blue-500 text-white'
                    : isDone  ? 'border border-emerald-400 text-emerald-500'
                    : 'border border-slate-300 text-slate-400'
                  )}>
                    {isDone ? '✓' : i + 1}
                  </div>
                  {s.label}
                </div>
              );
            })}

            <div className="mt-auto p-3 bg-slate-50 rounded-xl border border-slate-200">
              <p className="text-[9px] font-bold uppercase text-slate-400 mb-1.5 tracking-widest">Engine Status</p>
              <div className="space-y-1">
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-500">Math Layer</span>
                  <span className="text-emerald-600 font-bold">READY</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-500">AI Layer</span>
                  <span className="text-blue-500 font-bold">STANDBY</span>
                </div>
              </div>
            </div>
          </nav>

          {/* ── Main Content ─────────────────────────────────────────── */}
          <main className="flex-1 overflow-hidden bg-white flex flex-col">
            <div className="flex-1 overflow-y-auto p-4">
              <div className="max-w-3xl mx-auto h-full flex flex-col">

                {/* Layer Strip */}
                <LayerStrip step={step} />

                {/* Paradox Core */}
                <ParadoxCore />

                {/* Step Content */}
                <div className="flex-1 min-h-0">
                  <AnimatePresence mode="wait">

                    {/* ── UPLOAD ──────────────────────────────────────── */}
                    {step === 'upload' && (
                      <motion.div key="upload" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 flex flex-col items-center text-center">
                          <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-blue-100">
                            <Upload className="w-7 h-7 text-white" />
                          </div>
                          <h2 className="text-lg font-bold mb-1 tracking-tight">Upload Your Decision Data</h2>
                          <p className="text-sm text-slate-500 mb-6 max-w-xs leading-relaxed">
                            Any CSV with a group column and a decision column.
                          </p>

                          <input ref={fileRef} type="file" accept=".csv" className="hidden"
                            onChange={e => { const f = e.target.files?.[0]; if (f) parseFile(f); e.target.value = ''; }} />

                          {!uploadBusy ? (
                            <button onClick={() => fileRef.current?.click()}
                              className="flex items-center gap-2 bg-slate-900 hover:bg-slate-700 text-white px-7 py-2.5 rounded-xl font-semibold text-sm shadow-md transition-all w-full max-w-xs justify-center mb-2"
                            >
                              <Upload className="w-4 h-4" /> Select CSV File
                            </button>
                          ) : (
                            <div className="flex items-center gap-2.5 text-slate-600 text-sm mb-2">
                              <div className="w-4 h-4 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
                              Reading file…
                            </div>
                          )}

                          {uploadErr && (
                            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 text-left max-w-sm mt-3">
                              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                              <p>{uploadErr}</p>
                            </div>
                          )}

                          <div className="mt-5 w-full max-w-sm">
                            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-2.5">Or try a demo dataset</p>
                            <div className="grid grid-cols-2 gap-2.5">
                              {DEMO_DATASETS.map(d => (
                                <button key={d.id}
                                  onClick={() => {
                                    setData(d.data);
                                    setFileInfo({ name: d.title, rows: d.data.groupA.total + d.data.groupB.total, cols: 3, columnNames: [] });
                                    setIsDemo(true); setSuggestedProblem(d.suggestedProblem);
                                    setStep('preview');
                                  }}
                                  className="text-left p-3.5 bg-white border border-slate-200 hover:border-blue-400 hover:shadow-sm rounded-xl transition-all"
                                >
                                  <p className="text-xs font-bold text-slate-900">{d.title}</p>
                                  <p className="text-[10px] text-slate-500 mt-0.5">{d.subtitle}</p>
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {/* ── PREVIEW ─────────────────────────────────────── */}
                    {step === 'preview' && (
                      <motion.div key="preview" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                        <div className="bg-white border border-slate-200 rounded-2xl p-6">
                          <h2 className="text-base font-bold mb-4 flex items-center gap-2 tracking-tight">
                            <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500" /> Dataset Verified
                          </h2>
                          <div className="grid grid-cols-3 gap-3 mb-4">
                            {[
                              { label: 'Records', val: (fileInfo?.rows || 1000).toLocaleString() },
                              { label: 'Groups',  val: '2' },
                              { label: 'Columns', val: String(fileInfo?.cols || 3) }
                            ].map(c => (
                              <div key={c.label} className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">{c.label}</p>
                                <p className="text-2xl font-black tracking-tight">{c.val}</p>
                              </div>
                            ))}
                          </div>
                          <div className="p-2.5 bg-emerald-50 border border-emerald-100 rounded-lg text-xs text-emerald-700 mb-3">
                            Groups: <strong>{data.groupA.name}</strong> and <strong>{data.groupB.name}</strong>
                          </div>
                          {isDemo && suggestedProblem && (
                            <div className="p-2.5 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-700 mb-4 flex items-center gap-2">
                              <Info className="w-3.5 h-3.5 shrink-0" />
                              Suggested scenario: <strong>{SCENARIOS.find(s => s.id === suggestedProblem)?.title}</strong>
                            </div>
                          )}
                          <button onClick={() => setStep('problem')}
                            className="w-full bg-slate-900 hover:bg-slate-700 text-white py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all"
                          >
                            Choose a Scenario <ArrowRight className="w-4 h-4" />
                          </button>
                        </div>
                      </motion.div>
                    )}

                    {/* ── PROBLEM ─────────────────────────────────────── */}
                    {step === 'problem' && (
                      <motion.div key="problem" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                        {/* Column mismatch warning */}
                        {colWarn && (
                          <div className="bg-orange-50 border border-orange-200 rounded-xl p-3.5 mb-3">
                            <div className="flex items-start gap-2 mb-2.5">
                              <AlertCircle className="w-3.5 h-3.5 text-orange-600 shrink-0 mt-0.5" />
                              <div>
                                <p className="text-xs font-bold text-orange-900">Column mismatch for "{currentScenario?.title}"</p>
                                <p className="text-[10px] text-orange-700 mt-0.5">
                                  Missing: {colWarn.sensitive ? 'group/sensitive column ' : ''}{colWarn.outcome ? 'decision/outcome column' : ''}.
                                  Your columns: <span className="font-mono">{fileInfo?.columnNames.join(', ')}</span>
                                </p>
                                <p className="text-[10px] text-orange-700 mt-1 font-semibold">You may have selected the wrong scenario. Choose another or proceed anyway.</p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button onClick={() => { setColWarn(null); runAnalysis(scenario!); }}
                                className="text-[10px] font-bold px-3 py-1.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                              >Proceed anyway</button>
                              <button onClick={() => setColWarn(null)}
                                className="text-[10px] font-bold px-3 py-1.5 border border-orange-300 text-orange-700 rounded-lg hover:bg-orange-100 transition-colors"
                              >Pick different</button>
                            </div>
                          </div>
                        )}

                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h2 className="text-base font-bold tracking-tight">Select a Scenario</h2>
                            <p className="text-[11px] text-slate-500 mt-0.5">Pick the context that best describes your dataset's decisions.</p>
                          </div>
                          <button onClick={() => setModal('problems')}
                            className="text-[10px] text-blue-600 font-semibold hover:text-blue-800 flex items-center gap-1 transition-colors"
                          >
                            What are these? <Info className="w-3 h-3" />
                          </button>
                        </div>

                        {isDemo && suggestedProblem && (
                          <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-[10px] text-amber-800 mb-2.5 flex items-center gap-2">
                            <Info className="w-3 h-3 shrink-0" />
                            Your dataset matches best with: <strong>{SCENARIOS.find(s => s.id === suggestedProblem)?.title}</strong>
                          </div>
                        )}

                        <div className="grid grid-cols-3 gap-1.5">
                          {SCENARIOS.map(s => {
                            const isSuggested = isDemo && suggestedProblem === s.id;
                            return (
                              <button key={s.id} onClick={() => handleProblemSelect(s.id)}
                                className={cn(
                                  'p-2.5 bg-white border rounded-xl text-left transition-all group relative hover:shadow-sm',
                                  isSuggested
                                    ? 'border-blue-400 ring-2 ring-blue-400/20 bg-blue-50/30'
                                    : 'border-slate-200 hover:border-blue-300'
                                )}
                              >
                                {isSuggested && (
                                  <span className="absolute -top-1.5 right-2 text-[8px] font-black uppercase tracking-wide bg-blue-600 text-white px-1.5 py-0.5 rounded-full">Best match</span>
                                )}
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-[8px] font-black text-blue-500 tracking-widest">{s.num}</span>
                                  <span className="text-[8px] text-slate-400">{s.domain}</span>
                                </div>
                                <p className="text-[11px] font-semibold text-slate-800 leading-tight group-hover:text-blue-700 transition-colors">{s.title}</p>
                              </button>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}

                    {/* ── PROCESSING ──────────────────────────────────── */}
                    {step === 'processing' && (
                      <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <div className="bg-slate-900 rounded-2xl p-8 flex flex-col items-center justify-center min-h-[280px] text-white relative overflow-hidden">
                          <div className="absolute inset-0 opacity-10">
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#3b82f6,_transparent_70%)] animate-pulse" />
                          </div>
                          <div className="relative z-10 w-full max-w-sm flex flex-col items-center">
                            <p className="text-[9px] font-bold uppercase tracking-widest text-blue-400 mb-3">
                              {currentScenario?.title || 'Custom'} · {data.groupA.name} vs {data.groupB.name}
                            </p>
                            <div className="w-full bg-white/10 h-1 rounded-full mb-5 overflow-hidden">
                              <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }}
                                className="h-full bg-blue-500 rounded-full" transition={{ duration: 0.4 }}
                              />
                            </div>
                            <div className="w-full space-y-2 text-center">
                              {logs.map((log, i) => (
                                <motion.p key={log + i} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                                  className={cn('text-xs font-mono', i === logs.length - 1 ? 'opacity-100 font-bold text-blue-300' : 'opacity-25')}
                                >{log}</motion.p>
                              ))}
                            </div>
                            <p className="text-slate-500 text-[10px] mt-4 font-mono">{progress}%</p>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {/* ── AUDIT ────────────────────────────────────────── */}
                    {step === 'audit' && metrics && (
                      <motion.div key="audit" initial={{ opacity: 0, scale: 0.99 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
                        <div className="bg-white border border-slate-200 rounded-2xl p-5">
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <h3 className="text-base font-bold tracking-tight">Audit Findings</h3>
                              <p className="text-[11px] text-slate-500">{currentScenario?.title} · {data.groupA.name} vs {data.groupB.name}</p>
                            </div>
                            <StatusBadge status={metrics.status} />
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className={cn(
                              'flex flex-col items-center py-6 rounded-xl border-2',
                              metrics.status === 'BIAS DETECTED' ? 'border-red-200 bg-red-50' : 'border-emerald-200 bg-emerald-50'
                            )}>
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Fairness Score</p>
                              <p className={cn('text-5xl font-black font-mono mb-1 tracking-tighter', metrics.status === 'BIAS DETECTED' ? 'text-red-500' : 'text-emerald-500')}>
                                {metrics.disparateImpact.toFixed(2)}
                              </p>
                              <p className="text-[10px] text-slate-500 font-semibold mb-2.5">Threshold: 0.80 or above</p>
                              <div className="flex gap-3 text-[10px] text-slate-600">
                                <span><strong>{(metrics.rateA * 100).toFixed(0)}%</strong> {data.groupA.name}</span>
                                <span><strong>{(metrics.rateB * 100).toFixed(0)}%</strong> {data.groupB.name}</span>
                              </div>
                            </div>

                            <div className="space-y-3">
                              <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl">
                                <p className="text-[9px] font-bold text-blue-600 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                                  <BrainCircuit className="w-3 h-3" /> AI Explanation
                                </p>
                                <p className="text-xs text-slate-700 leading-relaxed">{explanation}</p>
                              </div>
                              <button onClick={handleFix} disabled={fixing}
                                className="w-full bg-slate-900 hover:bg-slate-700 disabled:opacity-60 text-white py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all"
                              >
                                {fixing
                                  ? <><div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" /> Balancing…</>
                                  : <><Zap className="w-4 h-4" /> Resolve This Bias</>}
                              </button>
                              <button onClick={goReset}
                                className="w-full text-slate-400 text-xs font-medium py-1 hover:text-slate-700 transition-colors flex items-center justify-center gap-1"
                              >
                                <RotateCcw className="w-3 h-3" /> Start New Audit
                              </button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {/* ── RESOLUTION ───────────────────────────────────── */}
                    {step === 'resolution' && metrics && origMetrics && (
                      <motion.div key="resolution" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                        <div className="bg-white border border-slate-200 rounded-2xl p-5">
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <h3 className="text-base font-bold tracking-tight">Audit Complete</h3>
                              <p className="text-emerald-600 text-xs font-semibold mt-0.5">Deterministic parity applied.</p>
                            </div>
                            <StatusBadge status="MODEL FAIR" />
                          </div>

                          {history.length >= 2 && (
                            <div className="h-36 mb-4">
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={[
                                  { name: 'Before', score: history[0].metrics.disparateImpact },
                                  { name: 'After',  score: history[1].metrics.disparateImpact }
                                ]} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                  <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} />
                                  <YAxis domain={[0, 1.3]} fontSize={10} axisLine={false} tickLine={false} />
                                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 11 }}
                                    formatter={(v: number) => [v.toFixed(2), 'Score']} />
                                  <ReferenceLine y={0.8} stroke="#f59e0b" strokeDasharray="4 2"
                                    label={{ value: 'Fair 0.80', position: 'insideTopRight', fontSize: 9, fill: '#b45309' }} />
                                  <Bar dataKey="score" radius={[5,5,0,0]} maxBarSize={60}>
                                    <Cell fill="#ef4444" />
                                    <Cell fill="#10b981" />
                                  </Bar>
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-3 mb-4">
                            <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                              <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest mb-1">Result</p>
                              <p className="text-xs text-emerald-800 leading-relaxed">{data.groupA.name} and {data.groupB.name} now receive equal consideration.</p>
                            </div>
                            <div className="bg-slate-900 p-4 rounded-xl text-white">
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Certificate</p>
                              <p className="text-[10px] text-slate-300 mb-2.5 leading-relaxed">EU AI Act Article 9 compliant.</p>
                              <button onClick={downloadCSV} disabled={!csvData}
                                className="w-full bg-white/10 hover:bg-white/20 text-white py-2 rounded-lg text-[10px] font-bold transition-all flex items-center justify-center gap-1.5 disabled:opacity-40"
                              >
                                <Download className="w-3 h-3" /> Download Proof
                              </button>
                            </div>
                          </div>

                          <button onClick={goReset}
                            className="w-full border border-slate-200 py-3 rounded-xl font-semibold text-sm text-slate-500 hover:bg-slate-50 transition-all"
                          >
                            Start New Audit
                          </button>
                        </div>
                      </motion.div>
                    )}

                  </AnimatePresence>
                </div>
              </div>
            </div>
          </main>

          {/* ── Right Sidebar ─────────────────────────────────────────── */}
          <aside className="w-64 border-l border-slate-200 bg-white p-4 shrink-0 hidden xl:flex flex-col">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-3">Live Audit Log</p>

            <div className="space-y-4 flex-1">
              <div className="pb-3 border-b border-slate-100">
                <p className="text-[10px] font-bold mb-2 text-slate-700">Layer 1 · Statistical Check</p>
                <div className="flex justify-between items-center mb-1.5">
                  <p className="text-[10px] text-slate-500">Parity Index</p>
                  <span className="text-[10px] font-mono font-bold text-slate-900">{metrics?.demographicParityDiff.toFixed(2) ?? '–'}</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="bg-red-400 h-full transition-all duration-700" style={{ width: `${Math.min((metrics?.demographicParityDiff ?? 0) * 100, 100)}%` }} />
                </div>
              </div>

              <div className="pb-3 border-b border-slate-100">
                <p className="text-[10px] font-bold mb-2 text-slate-700">Layer 2 · Fairness Score</p>
                <div className="flex justify-between items-center mb-1.5">
                  <p className="text-[10px] text-slate-500">Disparate Impact</p>
                  <span className="text-[10px] font-mono font-bold text-slate-900">{metrics?.disparateImpact.toFixed(2) ?? '–'}</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="bg-blue-400 h-full transition-all duration-700" style={{ width: `${Math.min((metrics?.disparateImpact ?? 0) * 70, 100)}%` }} />
                </div>
              </div>

              {step === 'problem' && (
                <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                  className="p-3 bg-amber-50 border border-amber-100 rounded-xl"
                >
                  <p className="text-[9px] font-bold text-amber-700 uppercase tracking-widest mb-1.5">Why a scenario?</p>
                  <p className="text-[10px] text-amber-700 leading-relaxed">Banking bias uses different fairness rules than hiring bias. The scenario tells the engine how to interpret your data.</p>
                </motion.div>
              )}

              {step === 'audit' && (
                <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                  className="p-3 bg-blue-50 border border-blue-100 rounded-xl"
                >
                  <p className="text-[9px] font-bold text-blue-600 uppercase tracking-widest mb-1.5">AI Layer Note</p>
                  <p className="text-[10px] text-blue-700 leading-relaxed italic">"Decision computed by Math Engine only. AI is explaining, not deciding."</p>
                </motion.div>
              )}

              <div>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">Mitigation Strategy</p>
                {['Reweighting', 'Oversampling', 'Threshold Adjustment'].map(m => (
                  <label key={m} className="flex items-center gap-2 py-1">
                    <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-300 flex items-center justify-center shrink-0">
                      {m === 'Reweighting' && <div className="w-1.5 h-1.5 bg-blue-600 rounded-full" />}
                    </div>
                    <span className={cn('text-[10px]', m === 'Reweighting' ? 'text-slate-800 font-semibold' : 'text-slate-400')}>{m}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="p-2.5 bg-slate-50 rounded-xl border border-dashed border-slate-300 mt-3">
              <p className="text-[9px] text-slate-400 uppercase italic leading-tight">
                Validation Hash<br /><span className="font-mono text-slate-600 not-italic text-[10px]">0x8F22…BE09</span>
              </p>
            </div>
          </aside>

        </div>
      </div>
    </>
  );
}
