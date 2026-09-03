import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Clock3,
  Cylinder,
  Download,
  Plus,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import DistillerDatePicker from "../components/DistillerDatePicker";
import DistillerSelect from "../components/DistillerSelect";
import { todayIso } from "../utils/datedSheetStore";
import { downloadExcelTable } from "../utils/exportReport";
import { BarSpark, LineChart, Sparkline } from "../components/dashboard/MiniCharts";

const SHIFTS = [
  { value: "A", label: "Shift A (06:00 – 14:00)" },
  { value: "B", label: "Shift B (14:00 – 22:00)" },
  { value: "C", label: "Shift C (22:00 – 06:00)" },
];

const PERIODS = [
  { value: "today", label: "Today" },
  { value: "1m", label: "1 Month" },
  { value: "2m", label: "2 Months" },
  { value: "all", label: "All Time" },
];

const COLUMNS = [
  { name: "Mash Stripper", top: 102.4, bottom: 108.1 },
  { name: "Pre Rectifying", top: 78.6, bottom: 96.2 },
  { name: "RS Rectifying", top: 72.1, bottom: 88.4 },
  { name: "Deoiled (FOC)", top: 70.5, bottom: 86.2 },
  { name: "MSDH Bed 1", hideTemp: true },
  { name: "MSDH Bed 2", hideTemp: true },
];

const ANALYSIS_HEADS = [
  "Time",
  "Ethanol Online",
  "RC Reflux",
  "Regen. Tank",
  "RC Lees Loss",
  "Spent Wash Loss",
  "Syrup Brix",
  "Sign / Remarks",
];

const VIEWS = {
  today: {
    chartRange: "Last 24 hours",
    summaryTitle: "Today’s Summary",
    kpis: [
      { title: "Absolute Alcohol", value: "96.18", unit: "% v/v", sub: "Target: 95.0 – 96.5", spark: [95.8, 96.0, 96.2, 95.9, 96.3, 96.1, 96.18], bars: false },
      { title: "RS Strength (RC Top)", value: "94.86", unit: "% v/v", sub: "Target: 94.0 – 95.5", spark: [94.4, 94.6, 94.9, 94.7, 95.0, 94.8, 94.86], bars: false },
      { title: "Deoiled Strength (FOC Top)", value: "96.08", unit: "% v/v", sub: "Target: 95.5 – 96.5", spark: [95.7, 95.9, 96.1, 95.8, 96.2, 96.0, 96.08], bars: false },
      { title: "Steam Consumption", value: "458.35", unit: "MT", sub: "Per KL: 6.31", spark: [470, 465, 462, 468, 460, 455, 458.35], bars: false },
      { title: "Total AA Production", value: "68.39", unit: "KL", sub: "Target: 70.00 KL", spark: [62, 64, 67, 65, 69, 66, 68.39], bars: true },
    ],
    labels: ["06:00", "10:00", "14:00", "18:00", "22:00", "02:00"],
    trend: {
      ena: [95.9, 96.05, 96.2, 96.12, 96.08, 96.18],
      rs: [94.5, 94.7, 94.9, 94.8, 94.75, 94.86],
      ed: [96.2, 96.3, 96.45, 96.38, 96.4, 96.42],
      foc: [95.8, 95.95, 96.1, 96.0, 96.05, 96.08],
    },
    analysis: [
      ["07:00 AM", "45.20", "94.80", "12.40", "0.18", "0.12", "1.042", "Shift A"],
      ["09:00 AM", "45.80", "94.90", "12.55", "0.16", "0.11", "1.044", ""],
      ["11:00 AM", "46.10", "95.05", "12.60", "0.17", "0.13", "1.046", ""],
      ["01:00 PM", "45.90", "94.88", "12.48", "0.19", "0.12", "1.045", "Shift A"],
      ["03:00 PM", "46.20", "95.10", "12.70", "0.15", "0.10", "1.047", ""],
      ["05:00 PM", "45.70", "94.75", "12.52", "0.18", "0.14", "1.043", ""],
    ],
    avg: ["Remarks / Avg", "45.82", "94.91", "12.54", "0.17", "0.12", "1.045", "Stable"],
    summary: {
      aa: { value: "68.39 KL", sub: "Target: 70.00 KL", delta: -2.1, invert: false },
      steam: { value: "458.35 MT", sub: "Per KL: 6.31", delta: -1.2, invert: true },
      brix: { value: "1.045", sub: "Target: 1.040 – 1.050", badge: "In Range" },
      down: "00h 15m",
    },
  },
  "1m": {
    chartRange: "Last 4 weeks",
    summaryTitle: "Month Summary",
    kpis: [
      { title: "Absolute Alcohol", value: "96.11", unit: "% v/v", sub: "Target: 95.0 – 96.5", spark: [95.9, 96.1, 96.2, 96.11], bars: false },
      { title: "RS Strength (RC Top)", value: "94.72", unit: "% v/v", sub: "Target: 94.0 – 95.5", spark: [94.5, 94.8, 94.6, 94.72], bars: false },
      { title: "Deoiled Strength (FOC Top)", value: "95.98", unit: "% v/v", sub: "Target: 95.5 – 96.5", spark: [95.8, 96.0, 96.1, 95.98], bars: false },
      { title: "Steam Consumption", value: "12,540", unit: "MT", sub: "Per KL: 6.31", spark: [3180, 3120, 3090, 3150], bars: false },
      { title: "Total AA Production", value: "1,986", unit: "KL", sub: "Target: 2,100 KL", spark: [480, 502, 495, 509], bars: true },
    ],
    labels: ["W1", "W2", "W3", "W4"],
    trend: {
      ena: [95.95, 96.12, 96.18, 96.11],
      rs: [94.55, 94.8, 94.7, 94.72],
      ed: [96.15, 96.32, 96.38, 96.28],
      foc: [95.82, 96.04, 96.1, 95.98],
    },
    analysis: [
      ["Week 1", "45.40", "94.70", "12.38", "0.19", "0.13", "1.043", "Stable"],
      ["Week 2", "45.90", "94.92", "12.52", "0.16", "0.11", "1.046", ""],
      ["Week 3", "46.05", "95.00", "12.60", "0.17", "0.12", "1.045", ""],
      ["Week 4", "45.82", "94.88", "12.48", "0.18", "0.12", "1.044", "Month close"],
    ],
    avg: ["Remarks / Avg", "45.79", "94.88", "12.50", "0.18", "0.12", "1.045", "In range"],
    summary: {
      aa: { value: "1,986 KL", sub: "Target: 2,100 KL", delta: -5.43, invert: false },
      steam: { value: "12,540 MT", sub: "Per KL: 6.31", delta: -1.8, invert: true },
      brix: { value: "1.045", sub: "Target: 1.040 – 1.050", badge: "In Range" },
      down: "04h 40m",
    },
  },
  "2m": {
    chartRange: "Last 8 weeks",
    summaryTitle: "2-Month Summary",
    kpis: [
      { title: "Absolute Alcohol", value: "96.06", unit: "% v/v", sub: "Target: 95.0 – 96.5", spark: [95.8, 96.0, 96.2, 96.1, 95.9, 96.15, 96.08, 96.06], bars: false },
      { title: "RS Strength (RC Top)", value: "94.68", unit: "% v/v", sub: "Target: 94.0 – 95.5", spark: [94.4, 94.7, 94.9, 94.6, 94.5, 94.8, 94.7, 94.68], bars: false },
      { title: "Deoiled Strength (FOC Top)", value: "95.94", unit: "% v/v", sub: "Target: 95.5 – 96.5", spark: [95.7, 95.9, 96.1, 95.9, 95.8, 96.0, 95.96, 95.94], bars: false },
      { title: "Steam Consumption", value: "25,310", unit: "MT", sub: "Per KL: 6.31", spark: [3180, 3120, 3090, 3150, 3110, 3080, 3140, 3160], bars: false },
      { title: "Total AA Production", value: "4,012", unit: "KL", sub: "Target: 4,200 KL", spark: [480, 502, 495, 509, 498, 512, 505, 511], bars: true },
    ],
    labels: ["W1", "W2", "W3", "W4", "W5", "W6", "W7", "W8"],
    trend: {
      ena: [95.88, 96.02, 96.16, 96.1, 95.94, 96.12, 96.08, 96.06],
      rs: [94.48, 94.72, 94.88, 94.62, 94.55, 94.78, 94.7, 94.68],
      ed: [96.05, 96.22, 96.38, 96.18, 96.12, 96.3, 96.24, 96.22],
      foc: [95.76, 95.92, 96.08, 95.9, 95.84, 96.02, 95.96, 95.94],
    },
    analysis: [
      ["Weeks 1–2", "45.50", "94.72", "12.40", "0.19", "0.13", "1.043", ""],
      ["Weeks 3–4", "45.88", "94.90", "12.55", "0.17", "0.12", "1.046", ""],
      ["Weeks 5–6", "46.00", "94.95", "12.58", "0.16", "0.11", "1.045", ""],
      ["Weeks 7–8", "45.78", "94.82", "12.48", "0.18", "0.12", "1.044", "Period avg"],
    ],
    avg: ["Remarks / Avg", "45.79", "94.85", "12.50", "0.18", "0.12", "1.045", "In range"],
    summary: {
      aa: { value: "4,012 KL", sub: "Target: 4,200 KL", delta: -4.48, invert: false },
      steam: { value: "25,310 MT", sub: "Per KL: 6.31", delta: -1.4, invert: true },
      brix: { value: "1.045", sub: "Target: 1.040 – 1.050", badge: "In Range" },
      down: "09h 20m",
    },
  },
  all: {
    chartRange: "Last 12 months",
    summaryTitle: "All-Time Summary",
    kpis: [
      { title: "Absolute Alcohol", value: "96.14", unit: "% v/v", sub: "Lifetime avg", spark: [95.8, 95.9, 96.0, 96.1, 96.2, 96.15, 96.18, 96.12, 96.2, 96.16, 96.22, 96.14], bars: false },
      { title: "RS Strength (RC Top)", value: "94.80", unit: "% v/v", sub: "Lifetime avg", spark: [94.4, 94.5, 94.7, 94.8, 94.9, 94.7, 94.85, 94.78, 94.9, 94.82, 94.88, 94.8], bars: false },
      { title: "Deoiled Strength (FOC Top)", value: "96.02", unit: "% v/v", sub: "Lifetime avg", spark: [95.7, 95.8, 95.9, 96.0, 96.1, 95.95, 96.08, 96.0, 96.1, 96.04, 96.12, 96.02], bars: false },
      { title: "Steam Consumption", value: "156,400", unit: "MT", sub: "Per KL: 6.29", spark: [13200, 12980, 12840, 13110, 12920, 12780, 13040, 12860, 12720, 12950, 12680, 12810], bars: false },
      { title: "Total AA Production", value: "24,860", unit: "KL", sub: "Avg / month: 2,072 KL", spark: [1980, 2040, 2010, 2110, 2060, 2090, 2140, 2080, 2160, 2120, 2180, 2072], bars: true },
    ],
    labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    trend: {
      ena: [95.9, 96.0, 96.08, 96.12, 96.18, 96.1, 96.16, 96.14, 96.2, 96.12, 96.18, 96.14],
      rs: [94.5, 94.6, 94.72, 94.8, 94.88, 94.7, 94.82, 94.78, 94.9, 94.8, 94.86, 94.8],
      ed: [96.1, 96.18, 96.25, 96.3, 96.38, 96.22, 96.32, 96.28, 96.4, 96.3, 96.36, 96.3],
      foc: [95.8, 95.88, 95.95, 96.0, 96.08, 95.94, 96.04, 96.0, 96.1, 96.02, 96.08, 96.02],
    },
    analysis: [
      ["Q1", "45.40", "94.70", "12.36", "0.20", "0.14", "1.042", ""],
      ["Q2", "45.85", "94.88", "12.50", "0.17", "0.12", "1.045", ""],
      ["Q3", "46.10", "95.02", "12.62", "0.16", "0.11", "1.046", ""],
      ["Q4", "45.90", "94.90", "12.55", "0.17", "0.12", "1.045", "Year avg"],
    ],
    avg: ["Remarks / Avg", "45.81", "94.88", "12.51", "0.18", "0.12", "1.045", "In range"],
    summary: {
      aa: { value: "24,860 KL", sub: "Avg / month: 2,072 KL", delta: 3.12, invert: false },
      steam: { value: "156,400 MT", sub: "Per KL: 6.29", delta: -2.1, invert: true },
      brix: { value: "1.045", sub: "Target: 1.040 – 1.050", badge: "In Range" },
      down: "62h 10m",
    },
  },
};

const KEY_PARAMS = [
  { name: "Mash Stripper — Top", unit: "°C", value: "102.4", range: "98 – 108", ok: true },
  { name: "Mash Stripper — Bottom", unit: "°C", value: "108.1", range: "104 – 112", ok: true },
  { name: "PRC — Top", unit: "°C", value: "78.6", range: "74 – 82", ok: true },
  { name: "PRC — Bottom", unit: "°C", value: "96.2", range: "92 – 100", ok: true },
  { name: "ENA RC — Bottom", unit: "°C", value: "94.0", range: "90 – 98", ok: true },
  { name: "Steam Flow", unit: "Kgs/Hr", value: "18,420", range: "17,000 – 20,000", ok: true },
  { name: "Reflux Flow", unit: "LPH", value: "12,850", range: "12,000 – 14,000", ok: true },
];

const ALERTS = [
  { level: "high", title: "Low Absolute Alcohol", time: "10:18 AM", detail: "96.18 %  ·  Target 95.0–96.5" },
  { level: "warn", title: "High Steam Consumption", time: "09:42 AM", detail: "6.71 MT/KL  ·  Target 6.40" },
  { level: "warn", title: "Loss in Spent Wash", time: "08:55 AM", detail: "0.14 %  ·  Limit 0.12 %" },
];

function firstName(user) {
  const raw = String(user?.username || "Operator").trim();
  const part = raw.split(/\s+/)[0];
  return part.charAt(0).toUpperCase() + part.slice(1);
}

function roleLabel(user) {
  const r = String(user?.role || "User");
  if (r.toLowerCase() === "admin") return "Plant Admin";
  return r.replace(/_/g, " ");
}

function Card({ title, children, className = "", action }) {
  return (
    <section className={`rounded-2xl border border-stone-200/80 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)] ${className}`}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-[13px] font-extrabold tracking-tight text-[#0f2744]">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function Change({ value, invert }) {
  const up = value > 0;
  const good = invert ? !up : up;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[11px] font-extrabold tabular-nums ${good ? "text-blue-600" : "text-rose-500"}`}>
      <Icon size={12} strokeWidth={2.6} />
      {Math.abs(value).toFixed(2)}%
    </span>
  );
}

function ColumnTank() {
  return (
    <svg viewBox="0 0 56 88" className="h-[72px] w-11">
      <rect x="18" y="2" width="20" height="8" rx="2" fill="#64748b" />
      <rect x="12" y="10" width="32" height="72" rx="10" fill="#eef4fb" stroke="#94a3b8" strokeWidth="1.6" />
      <rect x="15" y="38" width="26" height="41" rx="8" fill="#3b82f6" opacity="0.88" />
      <rect x="22" y="82" width="12" height="5" rx="1.5" fill="#64748b" />
    </svg>
  );
}

export default function DistillationOverviewPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [date, setDate] = useState(todayIso);
  const [shift, setShift] = useState("A");
  const [period, setPeriod] = useState("today");
  const view = VIEWS[period] || VIEWS.today;
  const name = firstName(user);
  const initials = name.slice(0, 1).toUpperCase();
  const updated = useMemo(
    () =>
      new Date().toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }),
    []
  );

  const handleExport = () => {
    downloadExcelTable({
      title: "Distillation Overview — Online Analysis",
      headers: ANALYSIS_HEADS,
      rows: [...view.analysis, view.avg],
      sheetName: "Online Analysis",
      subtitle: `${PERIODS.find((p) => p.value === period)?.label || "Today"}  ·  Shift ${shift}`,
    });
  };

  return (
    <div className="min-h-full bg-stone-250 px-4 py-4 sm:px-6 lg:px-7">
      <header className="mb-4 rounded-2xl border border-stone-200/80 bg-white px-5 py-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#2563eb]">Distillery</p>
            <h1 className="mt-0.5 text-2xl font-black tracking-tight text-[#0f2744]">Distillation Overview</h1>
            <p className="mt-0.5 text-sm font-medium text-stone-500">
              Real-time monitoring of distillation columns and online analysis.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2.5">
            <DistillerDatePicker value={date} onChange={setDate} compact className="w-[148px]" />
            <DistillerSelect value={period} onChange={setPeriod} options={PERIODS} compact className="w-[158px]" />
            <DistillerSelect value={shift} onChange={setShift} options={SHIFTS} compact className="w-[210px]" />
            <button
              type="button"
              onClick={handleExport}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-sky-200 bg-white px-3 text-[12px] font-bold text-[#3b74e8] hover:bg-sky-50"
            >
              <Download size={14} strokeWidth={2.4} />
              Download Report
            </button>
            <button
              type="button"
              onClick={() => navigate("/distillery/operating-parameters")}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[#3b74e8] px-3 text-[12px] font-bold text-white shadow-sm hover:bg-[#2f63d4]"
            >
              <Plus size={14} strokeWidth={2.6} />
              Add Log
            </button>
            <div className="flex items-center gap-2.5 rounded-xl border border-stone-200 bg-white py-1 pl-1 pr-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#2563eb] text-xs font-black text-white">
                {initials}
              </span>
              <div className="min-w-0 leading-tight">
                <p className="truncate text-[12px] font-extrabold text-[#0f2744]">{user?.username || "Operator"}</p>
                <p className="text-[10px] font-bold text-stone-400">{roleLabel(user)}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        {view.kpis.map((k) => (
          <article key={k.title} className="rounded-2xl border border-stone-200/80 bg-white p-3.5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-stone-400">{k.title}</p>
            <p className="mt-1 text-[22px] font-black tabular-nums leading-none text-[#0f2744]">
              {k.value}
              <span className="ml-1 text-[11px] font-bold text-stone-400">{k.unit}</span>
            </p>
            <p className="mt-1 text-[10px] font-bold text-stone-400">{k.sub}</p>
            <div className="mt-1">
              {k.bars ? (
                <BarSpark data={k.spark} color="#f59e0b" />
              ) : (
                <Sparkline data={k.spark} color="#22c55e" fill="rgba(34,197,94,0.14)" />
              )}
            </div>
          </article>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-[1.7fr_0.7fr]">
        <Card title="Column Overview">
          <div className="flex flex-wrap items-end justify-between gap-2">
            {COLUMNS.map((col, i) => (
              <div key={col.name} className="flex min-w-[92px] flex-1 items-end">
                <div className="flex w-full flex-col items-center">
                  <span className="mb-1 rounded-full bg-sky-50 px-2 py-0.5 text-[9px] font-extrabold text-blue-700">
                    Running
                  </span>
                  <ColumnTank />
                  <p className="mt-1 text-center text-[11px] font-extrabold leading-tight text-[#0f2744]">{col.name}</p>
                  {col.hideTemp ? (
                    <p className="mt-0.5 text-center text-[10px] font-bold text-stone-400">—</p>
                  ) : (
                    <p className="mt-0.5 text-center text-[10px] font-bold text-stone-500">
                      Top {col.top}°C
                      <span className="mx-1 text-stone-300">·</span>
                      Btm {col.bottom}°C
                    </p>
                  )}
                </div>
                {i < COLUMNS.length - 1 ? (
                  <span className="mb-14 hidden text-lg font-black text-stone-300 sm:block">→</span>
                ) : null}
              </div>
            ))}
          </div>
        </Card>

        <Card title="Live Status">
          <ul className="space-y-2">
            {COLUMNS.map((col) => (
              <li key={col.name} className="flex items-center justify-between gap-2">
                <span className="text-[12px] font-bold text-[#0f2744]">{col.name}</span>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold text-blue-600">
                  <span className="h-2 w-2 rounded-full bg-sky-500" />
                  Running
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-4 rounded-xl bg-sky-50 px-3 py-2.5 text-center text-[12px] font-extrabold text-blue-700">
            Overall Status · All Systems Normal
          </div>
        </Card>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-[1.7fr_0.7fr]">
        <Card
          title="Online Analysis — Alcohol Content (% v/v)"
          action={<span className="text-[10px] font-bold text-stone-400">Last updated {updated}</span>}
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left">
              <thead>
                <tr className="text-[10px] font-extrabold uppercase tracking-wider text-stone-400">
                  {ANALYSIS_HEADS.map((h) => (
                    <th key={h} className="pb-2 pr-3 font-extrabold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {view.analysis.map((row) => (
                  <tr key={row[0]}>
                    {row.map((cell, i) => (
                      <td key={ANALYSIS_HEADS[i]} className={`py-2 pr-3 text-[12px] ${i === 0 ? "font-extrabold text-[#0f2744]" : "font-semibold tabular-nums text-stone-700"}`}>
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
                <tr className="bg-sky-50/80">
                  {view.avg.map((cell, i) => (
                    <td key={`avg-${ANALYSIS_HEADS[i]}`} className="py-2 pr-3 text-[12px] font-extrabold text-[#2563eb]">
                      {cell}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </Card>

        <Card title="Key Parameters (Live)">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] font-extrabold uppercase tracking-wider text-stone-400">
                  <th className="pb-2">Parameter</th>
                  <th className="pb-2">Unit</th>
                  <th className="pb-2 text-right">Value</th>
                  <th className="pb-2 text-right">Range</th>
                  <th className="pb-2 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {KEY_PARAMS.map((p) => (
                  <tr key={p.name}>
                    <td className="py-1.5 text-[11px] font-bold text-[#0f2744]">{p.name}</td>
                    <td className="py-1.5 text-[11px] font-semibold text-stone-400">{p.unit}</td>
                    <td className="py-1.5 text-right text-[11px] font-extrabold tabular-nums">{p.value}</td>
                    <td className="py-1.5 text-right text-[10px] font-semibold text-stone-400">{p.range}</td>
                    <td className="py-1.5 text-right">
                      <span className="inline-block h-2.5 w-2.5 rounded-full bg-sky-500" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-3">
        <Card title="Alcohol Strength Trend" action={<span className="text-[10px] font-bold text-stone-400">{view.chartRange}</span>}>
          <div className="mb-1 flex flex-wrap gap-3 text-[10px] font-bold text-stone-500">
            <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-3 rounded-full bg-[#3b82f6]" /> Absolute Alcohol (%)</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-3 rounded-full bg-[#22c55e]" /> RS Top (%)</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-3 rounded-full bg-[#8b5cf6]" /> FOC Top (%)</span>
          </div>
          <LineChart
            labels={view.labels}
            series={[
              { label: "AA", color: "#3b82f6", data: view.trend.ena },
              { label: "RS", color: "#22c55e", data: view.trend.rs },
              { label: "FOC", color: "#8b5cf6", data: view.trend.foc },
            ]}
          />
        </Card>

        <Card title={view.summaryTitle}>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="rounded-xl bg-[#f4f7f8] px-3 py-3">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-stone-400">AA Production</p>
              <p className="mt-1 text-[16px] font-black tabular-nums text-[#0f2744]">{view.summary.aa.value}</p>
              <p className="text-[10px] font-bold text-stone-400">{view.summary.aa.sub}</p>
              <Change value={view.summary.aa.delta} invert={view.summary.aa.invert} />
            </div>
            <div className="rounded-xl bg-[#f4f7f8] px-3 py-3">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-stone-400">Steam Consumption</p>
              <p className="mt-1 text-[16px] font-black tabular-nums text-[#0f2744]">{view.summary.steam.value}</p>
              <p className="text-[10px] font-bold text-stone-400">{view.summary.steam.sub}</p>
              <Change value={view.summary.steam.delta} invert={view.summary.steam.invert} />
            </div>
            <div className="rounded-xl bg-[#f4f7f8] px-3 py-3">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-stone-400">Syrup Brix Avg</p>
              <p className="mt-1 text-[16px] font-black tabular-nums text-[#0f2744]">{view.summary.brix.value}</p>
              <p className="text-[10px] font-bold text-stone-400">{view.summary.brix.sub}</p>
              <span className="mt-1 inline-flex rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-extrabold text-blue-700">
                {view.summary.brix.badge}
              </span>
            </div>
            <div className="rounded-xl bg-[#f4f7f8] px-3 py-3">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-stone-400">Downtime</p>
              <p className="mt-1 flex items-center gap-1.5 text-[16px] font-black tabular-nums text-[#0f2744]">
                <Clock3 size={15} className="text-stone-400" />
                {view.summary.down}
              </p>
              <p className="text-[10px] font-bold text-stone-400">This period</p>
            </div>
          </div>
        </Card>

        <Card
          title="Recent Alerts"
          action={
            <button type="button" className="text-[10px] font-extrabold text-[#3b74e8]">
              View All
            </button>
          }
        >
          <ul className="space-y-2.5">
            {ALERTS.map((a) => (
              <li key={a.title} className="flex gap-2.5">
                <span
                  className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                    a.level === "high" ? "bg-rose-100 text-rose-600" : "bg-amber-100 text-amber-600"
                  }`}
                >
                  <AlertTriangle size={12} strokeWidth={2.6} />
                </span>
                <div className="min-w-0">
                  <p className="text-[12px] font-extrabold leading-snug text-[#0f2744]">{a.title}</p>
                  <p className="text-[10px] font-semibold text-stone-400">{a.detail}</p>
                  <p className="text-[10px] font-bold text-stone-300">{a.time}</p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <p className="mt-4 flex items-center gap-1.5 pb-2 text-[10px] font-bold text-stone-400">
        <Cylinder size={12} />
        {user?.organizationName || "Digital Distillery"} · Distillation overview
      </p>
    </div>
  );
}
