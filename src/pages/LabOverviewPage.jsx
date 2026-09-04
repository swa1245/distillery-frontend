import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  CheckCircle2,
  Plus,
  Search,
  TestTube2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import DistillerDatePicker from "../components/DistillerDatePicker";
import DistillerSelect from "../components/DistillerSelect";
import { todayIso } from "../utils/datedSheetStore";
import { DonutChart, LineChart } from "../components/dashboard/MiniCharts";

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

const CATEGORIES = [
  { id: "all", label: "All Samples" },
  { id: "Raw Material", label: "Raw Material" },
  { id: "Liquor / Mash", label: "Liquor / Mash" },
  { id: "Fermented Wash", label: "Fermented Wash" },
  { id: "Distillation", label: "Distillation" },
  { id: "Ethanol / AA", label: "Ethanol / AA" },
  { id: "DDGS", label: "DDGS" },
];

const VIEWS = {
  today: {
    kpis: [
      { title: "Total Samples", value: "47", sub: "Today", delta: 12, invert: false, extra: "vs Yesterday" },
      { title: "Test Completed", value: "42", sub: "Today", delta: 10, invert: false, extra: "vs Yesterday" },
      { title: "Test In Progress", value: "5", sub: "Today", delta: 25, invert: false, extra: "vs Yesterday" },
      { title: "Pending Tests", value: "12", sub: "Today", delta: -8, invert: true, extra: "vs Yesterday" },
      { title: "Out of Spec (OOS)", value: "3", sub: "Today", delta: 2, invert: true, extra: "vs Yesterday", abs: true },
      { title: "QC Compliance", value: "95.6%", sub: "This week", target: "Target: ≥ 95%", ok: true },
    ],
    counts: { "Raw Material": 8, "Liquor / Mash": 15, "Fermented Wash": 10, Distillation: 8, "Ethanol / AA": 4, DDGS: 2 },
    summary: [
      { type: "Raw Material", rec: 8, done: 7, prog: 1, pend: 2, oos: 1 },
      { type: "Liquor / Mash", rec: 15, done: 14, prog: 1, pend: 3, oos: 1 },
      { type: "Fermented Wash", rec: 10, done: 9, prog: 1, pend: 3, oos: 0 },
      { type: "Distillation", rec: 8, done: 7, prog: 1, pend: 2, oos: 1 },
      { type: "Ethanol / AA", rec: 4, done: 4, prog: 0, pend: 1, oos: 0 },
      { type: "DDGS", rec: 2, done: 1, prog: 1, pend: 1, oos: 0 },
    ],
    donut: [
      { label: "Completed", value: 42, color: "#22c55e", pct: "89.4%" },
      { label: "In Progress", value: 5, color: "#eab308", pct: "10.6%" },
      { label: "Pending", value: 12, color: "#f97316", pct: "25.5%" },
      { label: "OOS", value: 3, color: "#ef4444", pct: "6.4%" },
    ],
    oos: [
      { param: "Moisture", id: "S-1042", result: "14.8 %", spec: "≤ 14.0 %", type: "Raw Material" },
      { param: "Ethanol", id: "S-1108", result: "94.2 %", spec: "≥ 95.0 %", type: "Distillation" },
      { param: "pH", id: "S-1081", result: "4.12", spec: "4.8 – 5.5", type: "Liquor / Mash" },
    ],
    results: [
      ["S-1108", "Distillation", "ENA RC", "Ethanol", "94.2", "% v/v", "≥ 95.0", "GC", "OOS", "10:18 AM", "Priya"],
      ["S-1104", "Ethanol / AA", "Product tank", "Ethanol", "96.18", "% v/v", "95.0 – 96.5", "GC", "OK", "10:05 AM", "Rahul"],
      ["S-1081", "Liquor / Mash", "Liquifier-01", "pH", "4.12", "", "4.8 – 5.5", "pH meter", "OOS", "09:42 AM", "Priya"],
      ["S-1076", "Fermented Wash", "F-4", "RS", "0.18", "%", "≤ 0.25", "Titration", "OK", "09:20 AM", "Amit"],
      ["S-1042", "Raw Material", "Silo A", "Moisture", "14.8", "%", "≤ 14.0", "Oven", "OOS", "08:55 AM", "Rahul"],
      ["S-1040", "DDGS", "Dryer", "Moisture", "10.6", "%", "≤ 12.0", "Oven", "OK", "08:20 AM", "Amit"],
    ],
    params: [
      { name: "Ethanol", tests: 18, oos: 1, pct: "5.6", status: "Good" },
      { name: "pH", tests: 16, oos: 1, pct: "6.3", status: "Attention" },
      { name: "Moisture", tests: 12, oos: 1, pct: "8.3", status: "Attention" },
      { name: "RS", tests: 10, oos: 0, pct: "0.0", status: "Good" },
      { name: "Starch", tests: 8, oos: 0, pct: "0.0", status: "Good" },
    ],
    labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    trend: {
      rm: [6, 7, 8, 5, 9, 4, 8],
      mash: [12, 14, 13, 15, 16, 10, 15],
      wash: [8, 9, 11, 9, 10, 7, 10],
      dist: [6, 7, 8, 7, 9, 5, 8],
    },
    notes: [
      { time: "10:18 AM", by: "Priya", text: "ENA RC ethanol OOS on S-1108 — resample booked." },
      { time: "09:40 AM", by: "Rahul", text: "High DO observed in Fermenter F-4. Flagged to fermentation." },
      { time: "08:20 AM", by: "Amit", text: "DDGS moisture within spec. Dryer load stable." },
    ],
  },
  "1m": {
    kpis: [
      { title: "Total Samples", value: "1,284", sub: "1 Month", delta: 6.4, invert: false, extra: "vs prior month" },
      { title: "Test Completed", value: "1,210", sub: "1 Month", delta: 5.8, invert: false, extra: "vs prior month" },
      { title: "Test In Progress", value: "18", sub: "Open", delta: -12, invert: true, extra: "vs prior month" },
      { title: "Pending Tests", value: "56", sub: "1 Month", delta: -9.2, invert: true, extra: "vs prior month" },
      { title: "Out of Spec (OOS)", value: "41", sub: "1 Month", delta: -4, invert: true, extra: "vs prior month", abs: true },
      { title: "QC Compliance", value: "96.1%", sub: "1 Month", target: "Target: ≥ 95%", ok: true },
    ],
    counts: { "Raw Material": 210, "Liquor / Mash": 390, "Fermented Wash": 260, Distillation: 220, "Ethanol / AA": 128, DDGS: 76 },
    summary: [
      { type: "Raw Material", rec: 210, done: 198, prog: 4, pend: 12, oos: 9 },
      { type: "Liquor / Mash", rec: 390, done: 372, prog: 6, pend: 16, oos: 12 },
      { type: "Fermented Wash", rec: 260, done: 248, prog: 3, pend: 10, oos: 6 },
      { type: "Distillation", rec: 220, done: 206, prog: 3, pend: 10, oos: 8 },
      { type: "Ethanol / AA", rec: 128, done: 122, prog: 1, pend: 5, oos: 4 },
      { type: "DDGS", rec: 76, done: 64, prog: 1, pend: 3, oos: 2 },
    ],
    donut: [
      { label: "Completed", value: 1210, color: "#22c55e", pct: "94.2%" },
      { label: "In Progress", value: 18, color: "#eab308", pct: "1.4%" },
      { label: "Pending", value: 56, color: "#f97316", pct: "4.4%" },
      { label: "OOS", value: 41, color: "#ef4444", pct: "3.2%" },
    ],
    oos: [
      { param: "Moisture", id: "S-2891", result: "14.6 %", spec: "≤ 14.0 %", type: "Raw Material" },
      { param: "Ethanol", id: "S-3012", result: "94.4 %", spec: "≥ 95.0 %", type: "Distillation" },
      { param: "VA", id: "S-2760", result: "0.18", spec: "≤ 0.12", type: "Fermented Wash" },
    ],
    results: [
      ["S-3012", "Distillation", "ENA RC", "Ethanol", "94.4", "% v/v", "≥ 95.0", "GC", "OOS", "Week 4", "Priya"],
      ["S-2988", "Liquor / Mash", "Liquifier-02", "pH", "5.70", "", "4.8 – 5.5", "pH meter", "OK", "Week 4", "Rahul"],
      ["S-2891", "Raw Material", "Silo B", "Moisture", "14.6", "%", "≤ 14.0", "Oven", "OOS", "Week 3", "Amit"],
      ["S-2760", "Fermented Wash", "F-2", "VA", "0.18", "%", "≤ 0.12", "Titration", "OOS", "Week 2", "Priya"],
    ],
    params: [
      { name: "Ethanol", tests: 310, oos: 8, pct: "2.6", status: "Good" },
      { name: "pH", tests: 280, oos: 11, pct: "3.9", status: "Good" },
      { name: "Moisture", tests: 240, oos: 12, pct: "5.0", status: "Attention" },
      { name: "RS", tests: 190, oos: 5, pct: "2.6", status: "Good" },
      { name: "Starch", tests: 190, oos: 5, pct: "2.6", status: "Good" },
    ],
    labels: ["W1", "W2", "W3", "W4"],
    trend: {
      rm: [48, 52, 54, 56],
      mash: [92, 98, 100, 100],
      wash: [62, 64, 66, 68],
      dist: [50, 54, 56, 60],
    },
    notes: [
      { time: "Week 4", by: "Lab", text: "Monthly starch in flour still below 68 % agreed — milling informed." },
      { time: "Week 3", by: "Priya", text: "OOS moisture cluster on silo B maize receipts." },
    ],
  },
  "2m": {
    kpis: [
      { title: "Total Samples", value: "2,540", sub: "2 Months", delta: 4.1, invert: false, extra: "vs prior 2 months" },
      { title: "Test Completed", value: "2,410", sub: "2 Months", delta: 3.8, invert: false, extra: "vs prior 2 months" },
      { title: "Test In Progress", value: "22", sub: "Open", delta: -8, invert: true, extra: "vs prior 2 months" },
      { title: "Pending Tests", value: "108", sub: "2 Months", delta: -6.5, invert: true, extra: "vs prior 2 months" },
      { title: "Out of Spec (OOS)", value: "86", sub: "2 Months", delta: -3, invert: true, extra: "vs prior 2 months", abs: true },
      { title: "QC Compliance", value: "96.4%", sub: "2 Months", target: "Target: ≥ 95%", ok: true },
    ],
    counts: { "Raw Material": 420, "Liquor / Mash": 780, "Fermented Wash": 520, Distillation: 430, "Ethanol / AA": 250, DDGS: 140 },
    summary: [
      { type: "Raw Material", rec: 420, done: 398, prog: 5, pend: 22, oos: 18 },
      { type: "Liquor / Mash", rec: 780, done: 742, prog: 7, pend: 30, oos: 24 },
      { type: "Fermented Wash", rec: 520, done: 496, prog: 4, pend: 20, oos: 14 },
      { type: "Distillation", rec: 430, done: 408, prog: 3, pend: 18, oos: 16 },
      { type: "Ethanol / AA", rec: 250, done: 238, prog: 2, pend: 10, oos: 8 },
      { type: "DDGS", rec: 140, done: 128, prog: 1, pend: 8, oos: 6 },
    ],
    donut: [
      { label: "Completed", value: 2410, color: "#22c55e", pct: "94.9%" },
      { label: "In Progress", value: 22, color: "#eab308", pct: "0.9%" },
      { label: "Pending", value: 108, color: "#f97316", pct: "4.3%" },
      { label: "OOS", value: 86, color: "#ef4444", pct: "3.4%" },
    ],
    oos: [
      { param: "Moisture", id: "S-4102", result: "14.9 %", spec: "≤ 14.0 %", type: "Raw Material" },
      { param: "Ethanol", id: "S-4288", result: "94.1 %", spec: "≥ 95.0 %", type: "Ethanol / AA" },
      { param: "pH", id: "S-4011", result: "4.20", spec: "4.8 – 5.5", type: "Liquor / Mash" },
    ],
    results: [
      ["S-4288", "Ethanol / AA", "Product tank", "Ethanol", "94.1", "% v/v", "≥ 95.0", "GC", "OOS", "W8", "Priya"],
      ["S-4102", "Raw Material", "Silo A", "Moisture", "14.9", "%", "≤ 14.0", "Oven", "OOS", "W6", "Rahul"],
      ["S-4011", "Liquor / Mash", "Liquifier-01", "pH", "4.20", "", "4.8 – 5.5", "pH meter", "OOS", "W5", "Amit"],
    ],
    params: [
      { name: "Ethanol", tests: 620, oos: 16, pct: "2.6", status: "Good" },
      { name: "pH", tests: 560, oos: 22, pct: "3.9", status: "Good" },
      { name: "Moisture", tests: 480, oos: 24, pct: "5.0", status: "Attention" },
      { name: "RS", tests: 380, oos: 12, pct: "3.2", status: "Good" },
      { name: "Starch", tests: 370, oos: 12, pct: "3.2", status: "Good" },
    ],
    labels: ["W1", "W2", "W3", "W4", "W5", "W6", "W7", "W8"],
    trend: {
      rm: [48, 50, 52, 54, 53, 55, 54, 54],
      mash: [90, 94, 96, 98, 100, 99, 102, 101],
      wash: [60, 62, 64, 66, 65, 67, 68, 68],
      dist: [50, 52, 54, 53, 56, 55, 55, 55],
    },
    notes: [
      { time: "W8", by: "Lab", text: "Two-month OOS rate on moisture still the main watch item." },
      { time: "W5", by: "Rahul", text: "Mash pH OOS after enzyme tank change — closed after resample." },
    ],
  },
  all: {
    kpis: [
      { title: "Total Samples", value: "15,420", sub: "All time", delta: 8.2, invert: false, extra: "vs last 12 months" },
      { title: "Test Completed", value: "14,880", sub: "All time", delta: 7.6, invert: false, extra: "vs last 12 months" },
      { title: "Test In Progress", value: "22", sub: "Open", delta: 0, invert: false, extra: "open now" },
      { title: "Pending Tests", value: "518", sub: "All time", delta: -11, invert: true, extra: "vs last 12 months" },
      { title: "Out of Spec (OOS)", value: "486", sub: "All time", delta: -18, invert: true, extra: "vs last 12 months", abs: true },
      { title: "QC Compliance", value: "96.8%", sub: "Lifetime", target: "Target: ≥ 95%", ok: true },
    ],
    counts: { "Raw Material": 2480, "Liquor / Mash": 4620, "Fermented Wash": 3180, Distillation: 2740, "Ethanol / AA": 1520, DDGS: 880 },
    summary: [
      { type: "Raw Material", rec: 2480, done: 2390, prog: 4, pend: 86, oos: 92 },
      { type: "Liquor / Mash", rec: 4620, done: 4460, prog: 6, pend: 154, oos: 148 },
      { type: "Fermented Wash", rec: 3180, done: 3070, prog: 4, pend: 106, oos: 88 },
      { type: "Distillation", rec: 2740, done: 2648, prog: 4, pend: 88, oos: 82 },
      { type: "Ethanol / AA", rec: 1520, done: 1472, prog: 2, pend: 46, oos: 44 },
      { type: "DDGS", rec: 880, done: 840, prog: 2, pend: 38, oos: 32 },
    ],
    donut: [
      { label: "Completed", value: 14880, color: "#22c55e", pct: "96.5%" },
      { label: "In Progress", value: 22, color: "#eab308", pct: "0.1%" },
      { label: "Pending", value: 518, color: "#f97316", pct: "3.4%" },
      { label: "OOS", value: 486, color: "#ef4444", pct: "3.2%" },
    ],
    oos: [
      { param: "Moisture", id: "Lifetime", result: "92 OOS", spec: "≤ 14.0 %", type: "Raw Material" },
      { param: "Ethanol", id: "Lifetime", result: "82 OOS", spec: "≥ 95.0 %", type: "Distillation" },
      { param: "pH", id: "Lifetime", result: "148 OOS", spec: "4.8 – 5.5", type: "Liquor / Mash" },
    ],
    results: [
      ["Q4", "Distillation", "ENA RC", "Ethanol", "96.14", "% v/v", "95.0 – 96.5", "GC", "OK", "Q4", "Lab"],
      ["Q3", "Raw Material", "Silos", "Moisture", "11.2", "%", "≤ 14.0", "Oven", "OK", "Q3", "Lab"],
      ["Q2", "Liquor / Mash", "Cook", "pH", "5.71", "", "4.8 – 5.5", "pH meter", "OK", "Q2", "Lab"],
      ["Q1", "DDGS", "Dryer", "Moisture", "10.8", "%", "≤ 12.0", "Oven", "OK", "Q1", "Lab"],
    ],
    params: [
      { name: "Ethanol", tests: 3720, oos: 82, pct: "2.2", status: "Good" },
      { name: "pH", tests: 3480, oos: 148, pct: "4.3", status: "Good" },
      { name: "Moisture", tests: 2960, oos: 124, pct: "4.2", status: "Good" },
      { name: "RS", tests: 2280, oos: 68, pct: "3.0", status: "Good" },
      { name: "Starch", tests: 2180, oos: 64, pct: "2.9", status: "Good" },
    ],
    labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    trend: {
      rm: [190, 198, 205, 210, 208, 214, 220, 216, 218, 222, 210, 207],
      mash: [360, 370, 380, 390, 388, 395, 400, 398, 402, 405, 392, 380],
      wash: [250, 255, 260, 265, 262, 270, 274, 272, 276, 278, 268, 260],
      dist: [210, 216, 224, 228, 226, 232, 238, 234, 236, 240, 228, 220],
    },
    notes: [
      { time: "All time", by: "Lab", text: "Lifetime QC compliance holds above 95 % target." },
      { time: "Q2", by: "Lab", text: "Largest OOS share remains mash pH and inbound moisture." },
    ],
  },
};

function firstName(user) {
  const raw = String(user?.username || "Operator").trim();
  return raw.split(/\s+/)[0].replace(/^./, (c) => c.toUpperCase());
}

function roleLabel(user) {
  const r = String(user?.role || "User");
  if (r.toLowerCase() === "admin") return "Lab Incharge";
  return r.replace(/_/g, " ");
}

function Card({ title, children, className = "", action }) {
  return (
    <section className={`rounded-2xl border border-stone-200/80 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)] ${className}`}>
      {(title || action) && (
        <div className="mb-3 flex items-center justify-between gap-2">
          {title ? <h2 className="text-[13px] font-extrabold tracking-tight text-[#0f2744]">{title}</h2> : <span />}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

function Change({ value, invert, abs }) {
  const up = value > 0;
  const good = invert ? !up : up;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[11px] font-extrabold tabular-nums ${good ? "text-blue-600" : "text-rose-500"}`}>
      <Icon size={12} strokeWidth={2.6} />
      {abs ? `${up ? "+" : ""}${value}` : `${Math.abs(value).toFixed(value % 1 ? 1 : 0)}%`}
    </span>
  );
}

export default function LabOverviewPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [date, setDate] = useState(todayIso);
  const [shift, setShift] = useState("A");
  const [period, setPeriod] = useState("today");
  const [cat, setCat] = useState("all");
  const [query, setQuery] = useState("");
  const [bellOpen, setBellOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [flash, setFlash] = useState("");
  const view = VIEWS[period] || VIEWS.today;
  const name = firstName(user);
  const initials = name.slice(0, 1).toUpperCase();
  const totalSamples = Object.values(view.counts).reduce((a, b) => a + b, 0);

  const summary = cat === "all" ? view.summary : view.summary.filter((r) => r.type === cat);
  const totals = summary.reduce(
    (acc, r) => ({
      rec: acc.rec + r.rec,
      done: acc.done + r.done,
      prog: acc.prog + r.prog,
      pend: acc.pend + r.pend,
      oos: acc.oos + r.oos,
    }),
    { rec: 0, done: 0, prog: 0, pend: 0, oos: 0 }
  );
  const oos = cat === "all" ? view.oos : view.oos.filter((r) => r.type === cat);
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return view.results.filter((row) => {
      if (cat !== "all" && row[1] !== cat) return false;
      if (!q) return true;
      return row.some((c) => String(c).toLowerCase().includes(q));
    });
  }, [view.results, cat, query]);

  const ping = (msg) => {
    setFlash(msg);
    window.setTimeout(() => setFlash(""), 2200);
  };

  return (
    <div className="min-h-full bg-stone-250 px-4 py-4 sm:px-6 lg:px-7">
      <header className="mb-4 rounded-2xl border border-stone-200/80 bg-white px-5 py-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#2563eb]">Laboratory</p>
            <h1 className="mt-0.5 text-2xl font-black tracking-tight text-[#0f2744]">Lab & QC Overview</h1>
            <p className="mt-0.5 text-sm font-medium text-stone-500">Real-time laboratory & quality control dashboard.</p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2.5">
            <DistillerDatePicker value={date} onChange={setDate} compact className="w-[148px]" />
            <DistillerSelect value={period} onChange={setPeriod} options={PERIODS} compact className="w-[158px]" />
            <DistillerSelect value={shift} onChange={setShift} options={SHIFTS} compact className="w-[210px]" />
            {searchOpen ? (
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search samples…"
                className="h-9 w-44 rounded-xl border border-stone-200 px-3 text-[12px] font-semibold outline-none focus:border-[#3b74e8]"
              />
            ) : (
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50"
                aria-label="Search"
              >
                <Search size={15} />
              </button>
            )}
            <div className="relative">
              <button
                type="button"
                onClick={() => setBellOpen((v) => !v)}
                className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50"
                aria-label="Notifications"
              >
                <Bell size={15} />
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-black text-white">
                  {view.oos.length}
                </span>
              </button>
              {bellOpen ? (
                <ul className="absolute right-0 z-20 mt-2 w-64 overflow-hidden rounded-2xl border border-stone-200 bg-white py-1 shadow-lg">
                  {view.oos.map((o) => (
                    <li key={o.id} className="px-3 py-2 text-[12px] font-semibold text-stone-600">
                      OOS {o.param} · {o.id}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => navigate("/laboratory/analysis")}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-[12px] font-bold text-emerald-700 hover:bg-emerald-100"
            >
              <TestTube2 size={14} strokeWidth={2.4} />
              HPLC Analysis
            </button>
            <button
              type="button"
              onClick={() => navigate("/laboratory/register")}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[#3b74e8] px-3 text-[12px] font-bold text-white shadow-sm hover:bg-[#2f63d4]"
            >
              <Plus size={14} strokeWidth={2.6} />
              New Sample
            </button>
            <div className="flex items-center gap-2.5 rounded-xl border border-stone-200 bg-white py-1 pl-1 pr-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#2563eb] text-xs font-black text-white">{initials}</span>
              <div className="min-w-0 leading-tight">
                <p className="truncate text-[12px] font-extrabold text-[#0f2744]">{user?.username || "Operator"}</p>
                <p className="text-[10px] font-bold text-stone-400">{roleLabel(user)}</p>
              </div>
            </div>
          </div>
        </div>
        {flash ? <p className="mt-2 text-right text-[11px] font-bold text-[#3b74e8]">{flash}</p> : null}
      </header>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-6">
        {view.kpis.map((k) => (
          <article key={k.title} className="rounded-2xl border border-stone-200/80 bg-white p-3.5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-stone-400">{k.title}</p>
            <p className={`mt-1 text-[22px] font-black tabular-nums leading-none ${k.title.includes("OOS") ? "text-rose-600" : "text-[#0f2744]"}`}>
              {k.value}
            </p>
            <p className="mt-1 text-[10px] font-bold text-stone-400">{k.sub}</p>
            {k.ok ? (
              <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-extrabold text-blue-600">
                <CheckCircle2 size={12} /> {k.target}
              </span>
            ) : (
              <p className="mt-1 flex items-center gap-1 text-[10px] font-bold text-stone-400">
                <Change value={k.delta} invert={k.invert} abs={k.abs} /> {k.extra}
              </p>
            )}
          </article>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {CATEGORIES.map((c) => {
          const count = c.id === "all" ? totalSamples : view.counts[c.id];
          const active = cat === c.id;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setCat(c.id)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-bold ${
                active ? "bg-[#3b74e8] text-white shadow-sm" : "bg-white text-stone-600 ring-1 ring-stone-200 hover:bg-stone-50"
              }`}
            >
              {c.label}
              <span className={`rounded-full px-1.5 text-[10px] font-extrabold ${active ? "bg-white/20" : "bg-stone-100 text-stone-500"}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-[1.2fr_0.9fr_1fr]">
        <Card
          title="Samples Summary"
          action={
            <button type="button" onClick={() => navigate("/laboratory/register")} className="text-[10px] font-extrabold text-[#3b74e8]">
              View All Samples →
            </button>
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-left">
              <thead>
                <tr className="text-[10px] font-extrabold uppercase tracking-wider text-stone-400">
                  <th className="pb-2">Sample Type</th>
                  <th className="pb-2 text-right">Received</th>
                  <th className="pb-2 text-right">Completed</th>
                  <th className="pb-2 text-right">In Prog.</th>
                  <th className="pb-2 text-right">Pending</th>
                  <th className="pb-2 text-right">OOS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {summary.map((r) => (
                  <tr key={r.type}>
                    <td className="py-1.5 text-[12px] font-bold text-[#0f2744]">{r.type}</td>
                    <td className="py-1.5 text-right text-[12px] font-semibold tabular-nums">{r.rec}</td>
                    <td className="py-1.5 text-right text-[12px] font-semibold tabular-nums">{r.done}</td>
                    <td className="py-1.5 text-right text-[12px] font-semibold tabular-nums">{r.prog}</td>
                    <td className="py-1.5 text-right text-[12px] font-semibold tabular-nums">{r.pend}</td>
                    <td className="py-1.5 text-right text-[12px] font-extrabold tabular-nums text-rose-600">{r.oos}</td>
                  </tr>
                ))}
                <tr className="bg-sky-50/80">
                  <td className="py-1.5 text-[12px] font-extrabold text-[#2563eb]">Total</td>
                  <td className="py-1.5 text-right text-[12px] font-extrabold tabular-nums text-[#2563eb]">{totals.rec}</td>
                  <td className="py-1.5 text-right text-[12px] font-extrabold tabular-nums text-[#2563eb]">{totals.done}</td>
                  <td className="py-1.5 text-right text-[12px] font-extrabold tabular-nums text-[#2563eb]">{totals.prog}</td>
                  <td className="py-1.5 text-right text-[12px] font-extrabold tabular-nums text-[#2563eb]">{totals.pend}</td>
                  <td className="py-1.5 text-right text-[12px] font-extrabold tabular-nums text-rose-600">{totals.oos}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>

        <Card title="Test Status">
          <div className="flex flex-col items-center">
            <DonutChart
              segments={view.donut}
              total={view.donut.reduce((s, d) => s + d.value, 0)}
            />
            <ul className="mt-1 w-full space-y-1.5">
              {view.donut.map((s) => (
                <li key={s.label} className="flex items-center justify-between text-[11px] font-bold">
                  <span className="flex items-center gap-2 text-stone-600">
                    <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                    {s.label}
                  </span>
                  <span className="tabular-nums text-[#0f2744]">
                    {s.value} · {s.pct}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </Card>

        <Card
          title="OOS Parameters"
          action={
            <button type="button" onClick={() => navigate("/laboratory/register")} className="text-[10px] font-extrabold text-[#3b74e8]">
              View All
            </button>
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[280px] text-left">
              <thead>
                <tr className="text-[10px] font-extrabold uppercase tracking-wider text-stone-400">
                  <th className="pb-2">Parameter</th>
                  <th className="pb-2">ID</th>
                  <th className="pb-2 text-right">Result</th>
                  <th className="pb-2 text-right">Spec</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {oos.map((r) => (
                  <tr key={`${r.id}-${r.param}`}>
                    <td className="py-1.5 text-[12px] font-bold text-[#0f2744]">{r.param}</td>
                    <td className="py-1.5 text-[11px] font-semibold text-stone-500">{r.id}</td>
                    <td className="py-1.5 text-right text-[12px] font-extrabold tabular-nums text-rose-600">{r.result}</td>
                    <td className="py-1.5 text-right text-[11px] font-semibold text-stone-400">{r.spec}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <Card
        className="mt-3"
        title="Recent Test Results"
        action={
          <button type="button" onClick={() => navigate("/laboratory/register")} className="text-[10px] font-extrabold text-[#3b74e8]">
            View All Results
          </button>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-left">
            <thead>
              <tr className="text-[10px] font-extrabold uppercase tracking-wider text-stone-400">
                {["Sample ID", "Type", "Location", "Parameter", "Result", "Unit", "Spec Limit", "Method", "Status", "Time", "Analyst"].map((h) => (
                  <th key={h} className="pb-2 pr-3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {results.map((row) => (
                <tr key={row[0] + row[3]}>
                  {row.map((cell, i) => (
                    <td key={i} className="py-2 pr-3 text-[12px] font-semibold text-stone-700">
                      {i === 8 ? (
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-extrabold ${cell === "OOS" ? "bg-rose-100 text-rose-700" : "bg-sky-50 text-blue-700"}`}>
                          {cell}
                        </span>
                      ) : (
                        <span className={i === 0 ? "font-extrabold text-[#0f2744]" : i === 4 && row[8] === "OOS" ? "font-extrabold text-rose-600" : ""}>{cell}</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
        <Card title="Parameter Wise Performance">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] font-extrabold uppercase tracking-wider text-stone-400">
                <th className="pb-2">Parameter</th>
                <th className="pb-2 text-right">Tests</th>
                <th className="pb-2 text-right">OOS</th>
                <th className="pb-2 text-right">OOS %</th>
                <th className="pb-2 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {view.params.map((p) => (
                <tr key={p.name}>
                  <td className="py-1.5 text-[12px] font-bold text-[#0f2744]">{p.name}</td>
                  <td className="py-1.5 text-right text-[12px] font-semibold tabular-nums">{p.tests}</td>
                  <td className="py-1.5 text-right text-[12px] font-semibold tabular-nums">{p.oos}</td>
                  <td className="py-1.5 text-right text-[12px] font-semibold tabular-nums">{p.pct}</td>
                  <td className="py-1.5 text-right">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-extrabold ${p.status === "Good" ? "bg-sky-50 text-blue-700" : "bg-amber-50 text-amber-700"}`}>
                      {p.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card title="Sample Category Trend">
          <div className="mb-1 flex flex-wrap gap-2 text-[10px] font-bold text-stone-500">
            <span className="inline-flex items-center gap-1"><span className="h-1.5 w-3 rounded-full bg-amber-500" /> RM</span>
            <span className="inline-flex items-center gap-1"><span className="h-1.5 w-3 rounded-full bg-[#3b82f6]" /> Mash</span>
            <span className="inline-flex items-center gap-1"><span className="h-1.5 w-3 rounded-full bg-[#22c55e]" /> Wash</span>
            <span className="inline-flex items-center gap-1"><span className="h-1.5 w-3 rounded-full bg-[#8b5cf6]" /> Distil</span>
          </div>
          <LineChart
            labels={view.labels}
            series={[
              { label: "RM", color: "#f59e0b", data: view.trend.rm },
              { label: "Mash", color: "#3b82f6", data: view.trend.mash },
              { label: "Wash", color: "#22c55e", data: view.trend.wash },
              { label: "Dist", color: "#8b5cf6", data: view.trend.dist },
            ]}
          />
        </Card>

        <Card
          title="Important Notes"
          action={
            <button type="button" onClick={() => ping("Add note from the register.")} className="text-[10px] font-extrabold text-[#3b74e8]">
              Add Note
            </button>
          }
        >
          <ul className="space-y-3">
            {view.notes.map((n) => (
              <li key={n.text} className="flex gap-2.5">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#3b74e8]" />
                <div>
                  <p className="text-[12px] font-semibold leading-snug text-stone-700">{n.text}</p>
                  <p className="mt-0.5 text-[10px] font-bold text-stone-400">
                    {n.time} · by {n.by}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <p className="mt-4 flex items-center gap-1.5 pb-2 text-[10px] font-bold text-stone-400">
        <TestTube2 size={12} />
        {user?.organizationName || "Digital Distillery"} · Lab & QC overview
      </p>
    </div>
  );
}
