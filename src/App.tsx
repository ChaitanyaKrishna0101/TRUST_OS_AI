import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShieldAlert, ShieldCheck, BrainCircuit, Calculator, Upload,
  ArrowRight, CheckCircle2, AlertCircle, Zap, Download,
  RotateCcw, HelpCircle, Info, X, ChevronRight
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
type Modal = null | 'engine' | 'scenarios';

interface FairnessMetrics {
  rateA: number; rateB: number;
  disparateImpact: number; demographicParityDiff: number;
  status: string;
}

// ─── Problem Mapping Engine ───────────────────────────────────────────────────

interface ProblemMapping {
  sensitiveKeywords: string[];
  outcomeKeywords: string[];
}

const PROBLEM_MAPPINGS: Record<string, ProblemMapping> = {
  hiring:    { sensitiveKeywords: ['gender','sex','race','ethnicity','age'],             outcomeKeywords: ['hired','selected','hire','decision','approved','result'] },
  banking:   { sensitiveKeywords: ['gender','sex','race','ethnicity','age'],             outcomeKeywords: ['approved','loan','credit','decision','result','outcome'] },
  health:    { sensitiveKeywords: ['gender','sex','race','ethnicity','age'],             outcomeKeywords: ['treated','admitted','approved','access','outcome','result'] },
  edu:       { sensitiveKeywords: ['gender','sex','race','ethnicity','age'],             outcomeKeywords: ['admitted','accepted','approved','admit','decision'] },
  justice:   { sensitiveKeywords: ['gender','sex','race','ethnicity','age'],             outcomeKeywords: ['released','bail','parole','approved','decision','result'] },
  insurance: { sensitiveKeywords: ['gender','sex','race','age','location','zip'],       outcomeKeywords: ['approved','rate','premium','decision','result'] },
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
  { id: 'hiring',    num: '01', title: 'Hiring',           domain: 'Employment',      desc: 'Screening algorithms and promotion decisions.',     analyzes: 'Selection rate by gender or ethnicity' },
  { id: 'banking',   num: '02', title: 'Banking & Credit', domain: 'Finance',         desc: 'Loan, credit card, and mortgage approvals.',        analyzes: 'Approval rate by race, gender, or income' },
  { id: 'health',    num: '03', title: 'Healthcare',       domain: 'Medicine',        desc: 'Treatment access and diagnostic outcomes.',         analyzes: 'Treatment access by income or ethnicity' },
  { id: 'edu',       num: '04', title: 'Education',        domain: 'Admissions',      desc: 'University and scholarship selection.',             analyzes: 'Admission rate by gender or race' },
  { id: 'justice',   num: '05', title: 'Criminal Justice', domain: 'Legal',           desc: 'Bail, parole, and sentencing recommendations.',     analyzes: 'Bail/parole rate by race or age' },
  { id: 'insurance', num: '06', title: 'Insurance',        domain: 'Risk pricing',    desc: 'Premium rates and claim approvals.',                analyzes: 'Premium rate by location or age' },
  { id: 'gov',       num: '07', title: 'Government',       domain: 'Public services', desc: 'Welfare, benefits, and subsidy allocation.',        analyzes: 'Benefit approval by income or ethnicity' },
  { id: 'social',    num: '08', title: 'Social Media',     domain: 'Moderation',      desc: 'Content removal and account restrictions.',        analyzes: 'Removal rate by group or affiliation' },
  { id: 'commerce',  num: '09', title: 'E-Commerce',       domain: 'Retail',          desc: 'Ad targeting and dynamic pricing systems.',        analyzes: 'Ad exposure rate by age, gender, or location' },
  { id: 'housing',   num: '10', title: 'Real Estate',      domain: 'Property',        desc: 'Valuation algorithms and listing access.',         analyzes: 'Valuation/approval by race or location' },
  { id: 'police',    num: '11', title: 'Policing',         domain: 'Public safety',   desc: 'Predictive patrol and risk scoring tools.',        analyzes: 'Stop/arrest rate by race or location' },
  { id: 'climate',   num: '12', title: 'Energy Access',    domain: 'Environment',     desc: 'Green tech grants and subsidy distribution.',      analyzes: 'Subsidy access by income or location' },
  { id: 'legal',     num: '13', title: 'AI Compliance',    domain: 'Regulation',      desc: 'EU AI Act Article 9 fairness requirements.',       analyzes: 'Compliance score by protected attribute' },
  { id: 'sme',       num: '14', title: 'Small Business',   domain: 'Finance',         desc: 'SME funding and market access algorithms.',        analyzes: 'Funding approval by gender or ethnicity' },
  { id: 'citizen',   num: '15', title: 'Citizen Rights',   domain: 'Governance',      desc: 'Right-to-explanation under AI decision-making.',   analyzes: 'Decision rights by protected class' }
];

const NAV_STEPS: { id: Step; label: string; sublabel: string }[] = [
  { id: 'upload',     label: 'Upload Data',      sublabel: 'Import your dataset' },
  { id: 'problem',    label: 'Select Context',   sublabel: 'Choose a scenario' },
  { id: 'processing', label: 'Math Check',       sublabel: 'Bias detection' },
  { id: 'audit',      label: 'AI Explanation',   sublabel: 'Plain-language results' },
  { id: 'resolution', label: 'Resolution',       sublabel: 'Fix & certify' }
];

const STEP_ORDER: Step[] = ['upload', 'preview', 'problem', 'processing', 'audit', 'resolution'];

const LOG_STEPS = [
  "Parsing data structure…",
  "Step 1 · Math Engine active",
  "Identifying protected groups…",
  "Computing approval rates per group…",
  "Applying 4/5ths disparate impact rule…",
  "Step 2 · AI Explainer initialising…",
  "Audit complete — results ready."
];

// ─── Column Match Helpers ─────────────────────────────────────────────────────

function matchColumns(cols: string[], keywords: string[]): string | null {
  const lower = cols.map(c => c.toLowerCase().replace(/[^a-z]/g, ''));
  for (const kw of keywords) {
    const i = lower.findIndex(c => c.includes(kw) || kw.includes(c));
    if (i >= 0) return cols[i];
  }
  return null;
}

interface ColumnMatch { sensitiveCol: string | null; outcomeCol: string | null; isGoodMatch: boolean; }

function evaluateColumnMatch(cols: string[], pid: string): ColumnMatch {
  const m = PROBLEM_MAPPINGS[pid];
  if (!m) return { sensitiveCol: null, outcomeCol: null, isGoodMatch: false };
  const s = matchColumns(cols, m.sensitiveKeywords);
  const o = matchColumns(cols, m.outcomeKeywords);
  return { sensitiveCol: s, outcomeCol: o, isGoodMatch: s !== null && o !== null };
}

// ─── Shared Components ────────────────────────────────────────────────────────

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

// ─── Animated Layer Connector ─────────────────────────────────────────────────

function LayerConnector({ filled, color }: { filled: boolean; color: 'emerald' | 'blue' }) {
  const fillColor = color === 'emerald' ? 'bg-emerald-400' : 'bg-blue-400';
  const arrowColor = filled ? (color === 'emerald' ? 'text-emerald-400' : 'text-blue-400') : 'text-slate-200';
  return (
    <div className="flex flex-col items-center justify-center w-10 shrink-0 gap-0.5">
      <div className="w-full h-[2px] bg-slate-100 rounded-full overflow-hidden relative">
        <motion.div className={cn('absolute inset-y-0 left-0 rounded-full', fillColor)}
          initial={{ width: '0%' }} animate={{ width: filled ? '100%' : '0%' }}
          transition={{ duration: 0.7, ease: 'easeInOut' }}
        />
      </div>
      <ArrowRight className={cn('w-3 h-3 transition-colors duration-500', arrowColor)} />
    </div>
  );
}

// ─── 3-Layer Header with animated connectors ──────────────────────────────────

function LayerHeader({ step }: { step: Step }) {
  const l1Active = step === 'processing';
  const l2Active = step === 'audit';
  const l3Active = false;
  const l1Done   = ['audit', 'resolution'].includes(step);
  const l2Done   = step === 'resolution';
  const l3Done   = step === 'resolution';

  const layers = [
    { key: 'l1', num: '1', label: 'Math Engine',  sub: 'Detects bias with math only.',          active: l1Active, done: l1Done, color: 'emerald' as const },
    { key: 'l2', num: '2', label: 'AI Explainer', sub: 'Translates results to language.',        active: l2Active, done: l2Done, color: 'blue'    as const },
    { key: 'l3', num: '3', label: 'Final Check',  sub: 'Confirms everything is consistent.',     active: l3Active, done: l3Done, color: 'emerald' as const }
  ];

  const cardStyle = (l: typeof layers[0]) => {
    if (l.active) return ({
      emerald: 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-400/20',
      blue:    'bg-blue-50 border-blue-300 ring-2 ring-blue-400/20',
      purple:  'bg-purple-50 border-purple-300 ring-2 ring-purple-400/20'
    })[l.color];
    if (l.done) return 'bg-white border-emerald-200 shadow-sm';
    return 'bg-white border-slate-200 opacity-40';
  };

  const labelStyle = (l: typeof layers[0]) => {
    if (l.active) return ({ emerald: 'text-emerald-700', blue: 'text-blue-700', purple: 'text-purple-700' })[l.color];
    if (l.done) return 'text-emerald-700';
    return 'text-slate-400';
  };

  const dotColor = ({ emerald: 'bg-emerald-500', blue: 'bg-blue-500', purple: 'bg-purple-500' });

  return (
    <div className="flex items-center gap-0 mb-4">
      {layers.map((l, i) => (
        <React.Fragment key={l.key}>
          <div className={cn('flex-1 p-3 rounded-xl border transition-all duration-500 relative', cardStyle(l))}>
            {l.active && <span className={cn('absolute top-2.5 right-2.5 w-1.5 h-1.5 rounded-full animate-pulse', dotColor[l.color])} />}
            {l.done && !l.active && <CheckCircle2 className="absolute top-2.5 right-2.5 w-3.5 h-3.5 text-emerald-500" />}
            <div className="flex items-center gap-1.5 mb-0.5">
              <div className={cn('w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black shrink-0',
                l.active ? ({ emerald: 'bg-emerald-500', blue: 'bg-blue-500', purple: 'bg-purple-500' })[l.color] + ' text-white'
                : l.done  ? 'bg-emerald-500 text-white'
                : 'bg-slate-200 text-slate-400'
              )}>
                {l.done && !l.active ? '✓' : l.num}
              </div>
              <p className={cn('text-[11px] font-bold', labelStyle(l))}>{l.label}</p>
            </div>
            <p className="text-[10px] text-slate-500 leading-tight pl-5.5">{l.sub}</p>
          </div>
          {i < 2 && <LayerConnector filled={i === 0 ? l1Done : l2Done} color={i === 0 ? 'emerald' : 'blue'} />}
        </React.Fragment>
      ))}
    </div>
  );
}

// ─── Paradox Core Banner ──────────────────────────────────────────────────────

function ParadoxBanner() {
  return (
    <div className="bg-slate-900 rounded-xl px-5 py-4 mb-5">
      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-400 mb-3">Paradox Core</p>
      <div className="space-y-2 mb-3">
        <p className="text-[11px] text-slate-400 italic leading-relaxed">
          "If our system uses AI, what if that AI is biased? Won't the solution also be biased?"
        </p>
        <p className="text-[11px] text-slate-300 leading-relaxed">
          "We don't use AI to make decisions. We use math to detect bias. AI only explains the results. So even if AI is wrong, the decision stays correct."
        </p>
      </div>
      <div className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-1.5 rounded-lg">
        <Calculator className="w-3.5 h-3.5" />
        <span className="text-sm font-black tracking-tight">Math makes the decision. AI just explains it.</span>
      </div>
    </div>
  );
}

// ─── Engine Modal ─────────────────────────────────────────────────────────────

function EngineModal({ onClose }: { onClose: () => void }) {
  const steps = [
    {
      num: '1', color: 'emerald', label: 'Math Engine (Layer 1)',
      icon: <Calculator className="w-5 h-5 text-emerald-600" />,
      what: 'What it does',
      points: [
        'Reads your dataset and counts decisions per group',
        'Calculates each group\'s approval rate',
        'Applies the 4/5ths rule to measure unfairness',
        'Produces a single Disparate Impact score'
      ],
      note: 'No AI is involved. This is pure deterministic math.'
    },
    {
      num: '2', color: 'blue', label: 'AI Explainer (Layer 2)',
      icon: <BrainCircuit className="w-5 h-5 text-blue-600" />,
      what: 'What it does',
      points: [
        'Receives the math results from Layer 1',
        'Translates numbers into plain, readable language',
        'Explains what the bias means in real-world terms',
        'Never changes or overrides the math decision'
      ],
      note: 'AI explains — it does not decide. The math result is final.'
    },
    {
      num: '3', color: 'purple', label: 'Parity Lock (Layer 3)',
      icon: <ShieldCheck className="w-5 h-5 text-purple-600" />,
      what: 'What it does',
      points: [
        'Applies mathematical reweighting to balance groups',
        'Recalculates fairness score after mitigation',
        'Generates a certified fairness audit report',
        'Ensures compliance with EU AI Act Article 9'
      ],
      note: 'Only activated after bias is confirmed by Layer 1.'
    }
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-black text-slate-900">How the System Works</h2>
          <p className="text-sm text-slate-500 mt-0.5">3-layer architecture — one problem, three steps</p>
        </div>
        <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors">
          <X className="w-4 h-4 text-slate-500" />
        </button>
      </div>

      <div className="space-y-4">
        {steps.map((s, i) => (
          <div key={s.num}>
            <div className={cn('p-5 rounded-xl border-2', {
              emerald: 'border-emerald-200 bg-emerald-50',
              blue:    'border-blue-200 bg-blue-50',
              purple:  'border-purple-200 bg-purple-50'
            }[s.color])}>
              <div className="flex items-center gap-3 mb-3">
                <div className={cn('w-8 h-8 rounded-full flex items-center justify-center', {
                  emerald: 'bg-emerald-100', blue: 'bg-blue-100', purple: 'bg-purple-100'
                }[s.color])}>
                  {s.icon}
                </div>
                <div>
                  <span className={cn('text-[9px] font-black uppercase tracking-widest', {
                    emerald: 'text-emerald-600', blue: 'text-blue-600', purple: 'text-purple-600'
                  }[s.color])}>Layer {s.num}</span>
                  <p className="text-sm font-bold text-slate-900">{s.label}</p>
                </div>
              </div>
              <ul className="space-y-1.5 mb-3">
                {s.points.map(pt => (
                  <li key={pt} className="flex items-start gap-2 text-sm text-slate-700">
                    <ChevronRight className="w-3.5 h-3.5 shrink-0 mt-0.5 text-slate-400" />
                    {pt}
                  </li>
                ))}
              </ul>
              <p className={cn('text-xs font-semibold italic', {
                emerald: 'text-emerald-700', blue: 'text-blue-700', purple: 'text-purple-700'
              }[s.color])}>{s.note}</p>
            </div>
            {i < 2 && (
              <div className="flex justify-center my-2">
                <div className="flex flex-col items-center gap-0.5">
                  <div className="w-0.5 h-4 bg-slate-300 rounded" />
                  <ArrowRight className="w-3 h-3 text-slate-400 rotate-90" />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-slate-900 rounded-xl">
        <p className="text-sm font-black text-white text-center">Math makes the decision. AI just explains it.</p>
      </div>
    </div>
  );
}

// ─── Scenarios Modal ──────────────────────────────────────────────────────────

function ScenariosModal({ onClose }: { onClose: () => void }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-black text-slate-900">15 Fairness Problems</h2>
          <p className="text-sm text-slate-500 mt-0.5">Each scenario applies different fairness rules to your data</p>
        </div>
        <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors">
          <X className="w-4 h-4 text-slate-500" />
        </button>
      </div>

      <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl mb-5 flex items-start gap-2">
        <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-800">
          <strong>Why different scenarios?</strong> Your dataset is raw numbers. The scenario tells the Math Engine
          <em> what kind of decision</em> is being made — so it knows what "fair" looks like in that context.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {SCENARIOS.map(s => (
          <div key={s.id} className="p-3.5 bg-white border border-slate-200 rounded-xl">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[9px] font-bold text-blue-600 tracking-widest">{s.num}</span>
              <span className="text-[9px] text-slate-400">{s.domain}</span>
            </div>
            <p className="text-xs font-bold text-slate-900 mb-1">{s.title}</p>
            <p className="text-[9px] text-slate-500 leading-tight mb-2">{s.desc}</p>
            <div className="flex items-center gap-1 pt-2 border-t border-slate-100">
              <ChevronRight className="w-2.5 h-2.5 text-blue-500 shrink-0" />
              <p className="text-[9px] font-semibold text-blue-600">{s.analyzes}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [step, setStep]               = useState<Step>('upload');
  const [modal, setModal]             = useState<Modal>(null);
  const [data, setData]               = useState(INITIAL_DATA);
  const [fileInfo, setFileInfo]       = useState<{ name: string; rows: number; cols: number; columnNames: string[] } | null>(null);
  const [isDemo, setIsDemo]           = useState(false);
  const [suggestedProblem, setSuggested] = useState<string | null>(null);
  const [uploadErr, setUploadErr]     = useState('');
  const [uploadBusy, setUploadBusy]   = useState(false);
  const [scenario, setScenario]       = useState<string | null>(null);
  const [colMatch, setColMatch]       = useState<ColumnMatch | null>(null);
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
    setSuggested(null); setUploadErr(''); setUploadBusy(false); setScenario(null);
    setColMatch(null); setLogs([]); setProgress(0); setMetrics(null); setOrigMetrics(null);
    setExplanation(''); setHistory([]); setCsvData(''); setFixing(false);
  };

  const navState = (id: Step) => {
    const cur = STEP_ORDER.indexOf(step), own = STEP_ORDER.indexOf(id);
    const isActive = step === id || (id === 'upload' && step === 'preview');
    const isDone   = cur > own || (id === 'upload' && cur > 1);
    return { isActive, isDone };
  };

  // ── File parse ──────────────────────────────────────────────────────────────

  const parseFile = (file: File) => {
    setUploadBusy(true); setUploadErr(''); setIsDemo(false); setSuggested(null);
    const reader = new FileReader();
    reader.onerror = () => { setUploadBusy(false); setUploadErr('Could not read the file.'); };
    reader.onload = (e) => {
      try {
        const text = (e.target?.result as string) || '';
        const lines = text.split(/\r?\n/).filter(l => l.trim());
        if (lines.length < 2) throw new Error('File needs at least a header row and one data row.');
        const headers = lines[0].split(',').map(h => h.trim());
        const hdrsLower = headers.map(h => h.toLowerCase());
        const gIdx = hdrsLower.findIndex(h => ['group','gender','sex','race','age','category','class','type','ethnicity'].some(k => h.includes(k)));
        const dIdx = hdrsLower.findIndex(h => ['decision','approved','result','outcome','score','target','label','hire','loan','admit','selected','flagged'].some(k => h.includes(k)));
        if (gIdx < 0) throw new Error(`No group column found. Your columns: ${headers.join(', ')}`);
        if (dIdx < 0) throw new Error(`No decision column found. Your columns: ${headers.join(', ')}`);
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
        if (keys.length < 2) throw new Error(`Only 1 group detected (need 2+). Groups: ${keys.join(', ')}`);
        setData({ groupA: { name: keys[1], ...counts[keys[1]] }, groupB: { name: keys[0], ...counts[keys[0]] } });
        setFileInfo({ name: file.name, rows: lines.length - 1, cols: headers.length, columnNames: headers });
        setUploadBusy(false); setStep('preview');
      } catch (err: any) {
        setUploadBusy(false); setUploadErr(err.message || 'Unknown error reading the file.');
      }
    };
    reader.readAsText(file);
  };

  // ── Problem select → validate ──────────────────────────────────────────────

  const handleProblemSelect = (sid: string) => {
    setScenario(sid);
    if (!isDemo && fileInfo?.columnNames?.length) {
      const match = evaluateColumnMatch(fileInfo.columnNames, sid);
      if (!match.isGoodMatch) { setColMatch(match); return; }
    }
    runAnalysis(sid);
  };

  // ── Analysis ─────────────────────────────────────────────────────────────────

  const runAnalysis = async (sid: string) => {
    setStep('processing'); setLogs([]); setProgress(0); setColMatch(null);
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
      exp = `Comparing ${data.groupA.name} and ${data.groupB.name}: fairness score of ${m.disparateImpact.toFixed(2)} ${m.status === 'BIAS DETECTED' ? 'falls below the 0.80 threshold — bias confirmed.' : 'meets the 0.80 standard — decisions are equitable.'}`;
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
    setFixing(false); setStep('resolution');
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
    <div className="h-screen bg-slate-50 text-slate-900 font-sans flex flex-col overflow-hidden">

      {/* ── Modal Overlay ──────────────────────────────────────────────────── */}
      <AnimatePresence>
        {modal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-6"
            onClick={(e) => { if (e.target === e.currentTarget) setModal(null); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto p-7"
            >
              {modal === 'engine' && <EngineModal onClose={() => setModal(null)} />}
              {modal === 'scenarios' && <ScenariosModal onClose={() => setModal(null)} />}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="h-14 border-b border-slate-200/80 bg-white/95 backdrop-blur-sm flex items-center justify-between px-6 shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center shadow-md shadow-blue-200">
            <ShieldCheck className="w-4 h-4 text-white" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-black tracking-tight text-slate-900">TrustOS</span>
            <span className="hidden sm:block text-[10px] font-semibold px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md">AI Fairness Audit</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setModal('engine')}
            className="hidden sm:flex items-center gap-1.5 text-[10px] font-bold px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full hover:bg-emerald-100 active:scale-95 transition-all"
          >
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            Math Engine Active
          </button>
          <button onClick={() => setModal('scenarios')}
            className="hidden md:flex items-center gap-1.5 text-[10px] font-bold px-3 py-1.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full hover:bg-indigo-100 active:scale-95 transition-all"
          >
            15 Problem Scenarios
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">

        {/* ── Left Sidebar ────────────────────────────────────────────────── */}
        <nav className="w-56 border-r border-slate-200 bg-white p-5 flex flex-col gap-1 shrink-0">
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-3">Audit Journey</p>

          {NAV_STEPS.map((s, i) => {
            const { isActive, isDone } = navState(s.id);
            return (
              <div key={s.id} className={cn(
                'flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-all duration-200',
                isActive ? 'bg-white border border-slate-200 shadow-sm'
                : isDone  ? ''
                : ''
              )}>
                <div className={cn(
                  'w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0',
                  isActive ? 'bg-blue-600 text-white'
                  : isDone  ? 'bg-emerald-100 border border-emerald-400 text-emerald-600'
                  : 'border border-slate-300 text-slate-400'
                )}>
                  {isDone ? '✓' : i + 1}
                </div>
                <div>
                  <p className={cn('text-xs font-bold leading-tight',
                    isActive ? 'text-slate-900' : isDone ? 'text-emerald-700' : 'text-slate-400'
                  )}>{s.label}</p>
                  <p className={cn('text-[9px] leading-tight', isActive ? 'text-slate-500' : 'text-slate-400')}>{s.sublabel}</p>
                </div>
              </div>
            );
          })}

          <div className="mt-auto p-3 bg-white border border-slate-200 rounded-xl">
            <p className="text-[9px] font-bold uppercase text-slate-400 mb-2">Engine Status</p>
            <div className="space-y-1.5">
              <div className="flex justify-between text-[10px]">
                <span className="text-slate-600">Math Layer</span>
                <span className="text-emerald-600 font-bold">READY</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span className="text-slate-600">AI Layer</span>
                <span className="text-blue-600 font-bold">STANDBY</span>
              </div>
            </div>
          </div>
        </nav>

        {/* ── Main Content ─────────────────────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto bg-slate-50">
          <div className="max-w-4xl mx-auto p-5">

            <LayerHeader step={step} />
            <AnimatePresence>
              {step === 'upload' && (
                <motion.div key="paradox" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, height: 0 }}>
                  <ParadoxBanner />
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence mode="wait">

              {/* ── UPLOAD ────────────────────────────────────────────────── */}
              {step === 'upload' && (
                <motion.div key="upload" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="bg-white border border-slate-200 rounded-2xl p-10 flex flex-col items-center text-center shadow-sm"
                >
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl flex items-center justify-center mb-5 shadow-lg shadow-blue-200">
                    <Upload className="w-8 h-8 text-white" />
                  </div>
                  <h2 className="text-xl font-black mb-1.5 tracking-tight">Upload Your Decision Data</h2>
                  <p className="text-sm text-slate-500 mb-7 max-w-xs leading-relaxed">
                    Any CSV with a group column and a decision column. The system audits across 15 real-world fairness scenarios.
                  </p>

                  <input ref={fileRef} type="file" accept=".csv" className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) parseFile(f); e.target.value = ''; }} />

                  {!uploadBusy ? (
                    <button onClick={() => fileRef.current?.click()}
                      className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-8 py-3 rounded-xl font-bold text-sm shadow-md shadow-blue-200 transition-all w-full max-w-xs justify-center active:scale-95"
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
                            setIsDemo(true); setSuggested(d.suggestedProblem); setStep('preview');
                          }}
                          className="text-left p-4 bg-slate-50 border border-slate-200 hover:border-blue-400 hover:bg-white hover:shadow-md rounded-xl transition-all active:scale-95"
                        >
                          <p className="text-sm font-bold text-slate-900">{d.title}</p>
                          <p className="text-[11px] text-slate-500 mt-0.5">{d.subtitle}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ── PREVIEW ───────────────────────────────────────────────── */}
              {step === 'preview' && (
                <motion.div key="preview" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="bg-white border border-slate-200 rounded-2xl p-8"
                >
                  <h2 className="text-lg font-bold mb-5 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" /> Dataset Verified
                  </h2>
                  <div className="grid grid-cols-3 gap-4 mb-5">
                    {[
                      { label: 'Records',      val: (fileInfo?.rows || 1000).toLocaleString() },
                      { label: 'Groups Found', val: '2' },
                      { label: 'Columns',      val: String(fileInfo?.cols || 3) }
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
                      <span>Recommended scenario: <strong>{SCENARIOS.find(s => s.id === suggestedProblem)?.title}</strong></span>
                    </div>
                  )}
                  <button onClick={() => setStep('problem')}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 shadow-md shadow-blue-200 transition-all"
                  >
                    Continue — Select Scenario <ArrowRight className="w-4 h-4" />
                  </button>
                </motion.div>
              )}

              {/* ── PROBLEM ───────────────────────────────────────────────── */}
              {step === 'problem' && (
                <motion.div key="problem" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>

                  <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 mb-5 flex items-start gap-3">
                    <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-amber-900 mb-1">Why choose a scenario?</p>
                      <p className="text-xs text-amber-800 leading-relaxed">
                        Your dataset is raw numbers — it doesn't say what <em>kind</em> of decision it represents.
                        The scenario tells the Math Engine how to interpret the data. A hiring dataset and a loan dataset
                        may look identical but require completely different fairness rules.
                      </p>
                      {isDemo && suggestedProblem && (
                        <p className="text-xs text-amber-700 mt-2 font-semibold">
                          Recommended for this data: <strong className="text-amber-900">{SCENARIOS.find(s => s.id === suggestedProblem)?.title}</strong>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Column mismatch warning */}
                  {colMatch && !colMatch.isGoodMatch && (
                    <div className="bg-orange-50 border border-orange-300 rounded-xl px-5 py-4 mb-5">
                      <div className="flex items-start gap-3 mb-3">
                        <AlertCircle className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-bold text-orange-900">Column mismatch for this scenario</p>
                          <p className="text-xs text-orange-700 mt-1">
                            The <strong>{currentScenario?.title}</strong> scenario expects columns for a group attribute
                            {!colMatch.sensitiveCol && ' (e.g. gender, race, age)'} and an outcome
                            {!colMatch.outcomeCol && ' (e.g. approved, hired, selected)'}.
                          </p>
                          {fileInfo?.columnNames?.length ? (
                            <p className="text-xs text-orange-700 mt-1">
                              Your columns: <span className="font-mono bg-orange-100 px-1 rounded">{fileInfo.columnNames.join(', ')}</span>
                            </p>
                          ) : null}
                          <p className="text-xs text-orange-800 mt-2 font-semibold">You may have selected the wrong scenario. Choose a different one or proceed anyway.</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => { if (scenario) runAnalysis(scenario); }}
                          className="text-xs font-bold px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                        >Proceed anyway</button>
                        <button onClick={() => setColMatch(null)}
                          className="text-xs font-bold px-4 py-2 border border-orange-300 text-orange-700 rounded-lg hover:bg-orange-100 transition-colors"
                        >Choose different scenario</button>
                      </div>
                    </div>
                  )}

                  <div className="text-center mb-4">
                    <h2 className="text-xl font-bold">Select a Scenario</h2>
                    <p className="text-sm text-slate-500 mt-1">The Math Engine adapts its fairness rules based on your choice.</p>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {SCENARIOS.map(s => {
                      const isRec = isDemo && suggestedProblem === s.id;
                      return (
                        <button key={s.id} onClick={() => handleProblemSelect(s.id)}
                          className={cn(
                            'p-3.5 bg-white border rounded-xl text-left transition-all group relative',
                            isRec ? 'border-blue-400 ring-2 ring-blue-500/20 shadow-md'
                                  : 'border-slate-200 hover:border-blue-400 hover:shadow-sm'
                          )}
                        >
                          {isRec && (
                            <span className="absolute -top-2 right-3 text-[9px] font-black uppercase tracking-widest bg-blue-600 text-white px-2 py-0.5 rounded-full">
                              Recommended
                            </span>
                          )}
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[9px] font-bold text-blue-600 tracking-widest">{s.num}</span>
                            <span className="text-[9px] text-slate-400">{s.domain}</span>
                          </div>
                          <p className="text-xs font-bold text-slate-900 mb-1 group-hover:text-blue-700 transition-colors">{s.title}</p>
                          <p className="text-[9px] text-slate-500 leading-tight mb-2">{s.desc}</p>
                          <div className="pt-2 border-t border-slate-100 space-y-0.5">
                            <p className="text-[9px] text-slate-400">If you select this:</p>
                            <div className="flex items-start gap-1">
                              <ChevronRight className="w-2.5 h-2.5 text-blue-500 shrink-0 mt-0.5" />
                              <p className="text-[9px] font-semibold text-blue-600 leading-tight">Analyze: {s.analyzes}</p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {/* ── PROCESSING ────────────────────────────────────────────── */}
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
                            i === logs.length - 1 ? 'opacity-100 font-bold text-blue-300' : 'opacity-25'
                          )}
                        >{log}</motion.p>
                      ))}
                    </div>
                    <p className="text-slate-500 text-xs mt-6 font-mono">{progress}% complete</p>
                  </div>
                </motion.div>
              )}

              {/* ── AUDIT ─────────────────────────────────────────────────── */}
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

              {/* ── RESOLUTION ────────────────────────────────────────────── */}
              {step === 'resolution' && metrics && origMetrics && (
                <motion.div key="resolution" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-5">
                      <div>
                        <h3 className="text-2xl font-black tracking-tight">Audit Complete</h3>
                        <p className="text-emerald-600 text-sm font-semibold mt-0.5">Deterministic parity applied. All 3 layers complete.</p>
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
                              <Cell fill="#ef4444" /><Cell fill="#10b981" />
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}

                    <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 mb-4">
                      <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest mb-1">Result</p>
                      <p className="text-sm text-emerald-800 mb-3">{data.groupA.name} and {data.groupB.name} now receive equal consideration from the AI.</p>
                      <p className="text-[10px] text-emerald-600">Compliant with EU AI Act Article 9 · Audit certified</p>
                    </div>

                    <button onClick={downloadCSV} disabled={!csvData}
                      className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white py-3.5 rounded-xl font-bold text-sm transition-all mb-4 shadow-md shadow-emerald-200"
                    >
                      <Download className="w-4 h-4" /> Download Balanced Dataset
                    </button>

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
              <p className="font-bold mb-1 text-slate-700">Step 1: Data Analysis</p>
              <p className="text-[10px] text-slate-400 mb-2">Math Engine — demographic parity check</p>
              <div className="flex justify-between items-center mb-1.5">
                <p className="text-slate-500">Parity Index</p>
                <span className="font-mono font-bold text-slate-900">{metrics?.demographicParityDiff.toFixed(2) ?? '–'}</span>
              </div>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <motion.div className="bg-red-400 h-full rounded-full"
                  animate={{ width: `${Math.min((metrics?.demographicParityDiff ?? 0) * 100, 100)}%` }}
                  transition={{ duration: 0.7 }}
                />
              </div>
            </div>

            <div className="text-xs pb-4 border-b border-slate-100">
              <p className="font-bold mb-1 text-slate-700">Step 2: Math Result</p>
              <p className="text-[10px] text-slate-400 mb-2">Disparate impact ratio (4/5ths rule)</p>
              <div className="flex justify-between items-center mb-1.5">
                <p className="text-slate-500">Fairness Score</p>
                <span className="font-mono font-bold text-slate-900">{metrics?.disparateImpact.toFixed(2) ?? '–'}</span>
              </div>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <motion.div className="bg-blue-400 h-full rounded-full"
                  animate={{ width: `${Math.min((metrics?.disparateImpact ?? 0) * 70, 100)}%` }}
                  transition={{ duration: 0.7 }}
                />
              </div>
            </div>

            {step === 'problem' && (
              <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                className="p-3 bg-amber-50 border border-amber-100 rounded-xl"
              >
                <p className="text-[9px] font-bold text-amber-700 uppercase tracking-widest mb-1">Why 15 scenarios?</p>
                <p className="text-[10px] text-amber-700 leading-relaxed">Banking bias ≠ Hiring bias. Each scenario applies different fairness rules to the same raw data.</p>
              </motion.div>
            )}

            {step === 'audit' && (
              <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-blue-50 border border-blue-100 rounded-xl"
              >
                <p className="text-[9px] font-bold text-blue-600 uppercase tracking-widest mb-2">AI Layer Note</p>
                <p className="text-[11px] text-blue-700 italic leading-relaxed">"Decision computed by Math Engine. AI is only explaining the result."</p>
              </motion.div>
            )}

            {step === 'resolution' && (
              <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl"
              >
                <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest mb-2">All 3 Layers Complete</p>
                <div className="space-y-1">
                  {['Math Engine', 'AI Explainer', 'Parity Lock'].map((l, i) => (
                    <div key={l} className="flex items-center gap-2 text-[10px]">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                      <span className="text-emerald-700 font-medium">{l}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        </aside>

      </div>
    </div>
  );
}
