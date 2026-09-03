import { useEffect, useRef, useState } from "react";
import {
  Bell,
  CircleHelp,
  Cog,
  Cylinder,
  Droplets,
  Factory,
  FlaskConical,
  LayoutDashboard,
  TrendingDown,
  TrendingUp,
  Wheat,
  Wind,
  Zap,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import DistillerDatePicker from "../components/DistillerDatePicker";
import DistillerSelect from "../components/DistillerSelect";
import { todayIso } from "../utils/datedSheetStore";
import { BarChart, DonutChart, GroupedBarChart, LineChart, Sparkline } from "../components/dashboard/MiniCharts";

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

const KPI_META = [
  { key: "aa", icon: Droplets, iconBg: "bg-[#e8f0fe] text-[#3b74e8]", goodWhenDown: false },
  { key: "eff", icon: FlaskConical, iconBg: "bg-sky-50 text-[#2563eb]", goodWhenDown: false },
  { key: "rec", icon: Wheat, iconBg: "bg-amber-50 text-amber-600", goodWhenDown: false },
  { key: "steam", icon: Wind, iconBg: "bg-sky-50 text-sky-600", goodWhenDown: true },
  { key: "power", icon: Zap, iconBg: "bg-yellow-50 text-yellow-600", goodWhenDown: true },
  { key: "water", icon: Droplets, iconBg: "bg-cyan-50 text-cyan-700", goodWhenDown: true },
];

const VIEWS = {
  today: {
    blurb: "Here’s what’s happening in your plant today.",
    chartRange: "Last 7 days",
    compareA: "Today",
    compareB: "Yesterday",
    usedLabel: "Today used",
    ddgsTitle: "DDGS Production (Today)",
    labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    kpis: [
      { title: "AA Production (Today)", value: "68.39", unit: "KL", sub: "Target: 70.00 KL", delta: -2.3, spark: [62, 64, 67, 65, 69, 66, 68.39] },
      { title: "Fermentation Efficiency", value: "93.23", unit: "%", sub: "Target: 94.00 %", delta: -0.77, spark: [92.1, 93.4, 94.0, 93.1, 92.8, 93.6, 93.23] },
      { title: "Recovery (L/MT Grain)", value: "441.23", unit: "", sub: "Target: 450.00", delta: -1.95, spark: [438, 442, 448, 444, 440, 446, 441.23] },
      { title: "Steam Consumption (Today)", value: "458.35", unit: "MT", sub: "Per KL: 6.31", delta: -1.2, spark: [470, 465, 462, 468, 460, 455, 458.35] },
      { title: "Power Consumption (Today)", value: "1,307", unit: "kWh", sub: "Per KL: 18.00", delta: -2.1, spark: [1380, 1340, 1320, 1350, 1310, 1290, 1307] },
      { title: "Water Consumption (Today)", value: "580", unit: "m³", sub: "Per KL: 7.99", delta: -3.1, spark: [620, 610, 600, 605, 590, 585, 580] },
    ],
    production: [
      { name: "Grain Distilled (MT)", today: "155.20", yesterday: "148.40", change: 4.58 },
      { name: "AA Production (KL)", today: "68.39", yesterday: "70.12", change: -2.47 },
      { name: "Fermentation Eff. (%)", today: "93.23", yesterday: "94.10", change: -0.92 },
      { name: "Recovery (L/MT)", today: "441.23", yesterday: "448.60", change: -1.64 },
      { name: "Steam (MT/KL)", today: "6.31", yesterday: "6.39", change: -1.25, invert: true },
      { name: "Power (kWh/KL)", today: "18.00", yesterday: "18.38", change: -2.07, invert: true },
      { name: "Water (m³/KL)", today: "7.99", yesterday: "8.24", change: -3.03, invert: true },
    ],
    trend: {
      aa: [64.2, 66.1, 67.8, 65.4, 69.0, 68.1, 68.39],
      eff: [92.4, 93.1, 94.0, 93.0, 92.6, 93.8, 93.23],
      rec: [436, 440, 446, 442, 438, 444, 441],
    },
    steam: [6.42, 6.38, 6.28, 6.45, 6.33, 6.21, 6.31],
    water: [8.4, 8.2, 8.1, 8.3, 8.0, 7.9, 7.99],
    power: [18.8, 18.5, 18.2, 18.6, 18.1, 17.9, 18.0],
    grain: [
      { name: "Rice", stock: 420, used: 62, available: 358 },
      { name: "Broken Rice", stock: 185, used: 28, available: 157 },
      { name: "Maize", stock: 510, used: 65, available: 445 },
    ],
    ddgs: [
      { label: "Wet Cake", value: "92.4", unit: "MT" },
      { label: "Dry Cake", value: "38.6", unit: "MT" },
      { label: "Moisture", value: "10.8", unit: "%" },
      { label: "Yield (on Grain)", value: "24.9", unit: "%" },
    ],
  },
  "1m": {
    blurb: "Plant performance for the last 1 month.",
    chartRange: "Last 4 weeks",
    compareA: "This month",
    compareB: "Prior month",
    usedLabel: "Month used",
    ddgsTitle: "DDGS Production (1 Month)",
    labels: ["W1", "W2", "W3", "W4"],
    kpis: [
      { title: "AA Production (1 Month)", value: "1,986", unit: "KL", sub: "Target: 2,100 KL", delta: -5.43, spark: [480, 502, 495, 509] },
      { title: "Fermentation Efficiency", value: "93.41", unit: "%", sub: "Target: 94.00 %", delta: -0.63, spark: [92.8, 93.2, 93.6, 93.41] },
      { title: "Recovery (L/MT Grain)", value: "443.10", unit: "", sub: "Target: 450.00", delta: -1.53, spark: [439, 442, 445, 443.1] },
      { title: "Steam Consumption (1 Month)", value: "12,540", unit: "MT", sub: "Per KL: 6.31", delta: -1.8, spark: [3180, 3120, 3090, 3150] },
      { title: "Power Consumption (1 Month)", value: "35,820", unit: "kWh", sub: "Per KL: 18.04", delta: -2.4, spark: [9100, 8920, 8780, 9020] },
      { title: "Water Consumption (1 Month)", value: "15,860", unit: "m³", sub: "Per KL: 7.98", delta: -2.9, spark: [4120, 3980, 3890, 3870] },
    ],
    production: [
      { name: "Grain Distilled (MT)", today: "4,480", yesterday: "4,210", change: 6.41 },
      { name: "AA Production (KL)", today: "1,986", yesterday: "2,040", change: -2.65 },
      { name: "Fermentation Eff. (%)", today: "93.41", yesterday: "93.88", change: -0.5 },
      { name: "Recovery (L/MT)", today: "443.10", yesterday: "448.20", change: -1.14 },
      { name: "Steam (MT/KL)", today: "6.31", yesterday: "6.42", change: -1.71, invert: true },
      { name: "Power (kWh/KL)", today: "18.04", yesterday: "18.46", change: -2.28, invert: true },
      { name: "Water (m³/KL)", today: "7.98", yesterday: "8.22", change: -2.92, invert: true },
    ],
    trend: {
      aa: [478, 502, 496, 510],
      eff: [92.8, 93.2, 93.7, 93.41],
      rec: [438, 442, 446, 443],
    },
    steam: [6.44, 6.36, 6.28, 6.31],
    water: [8.2, 8.05, 7.94, 7.98],
    power: [18.5, 18.2, 17.95, 18.04],
    grain: [
      { name: "Rice", stock: 420, used: 1680, available: 358 },
      { name: "Broken Rice", stock: 185, used: 740, available: 157 },
      { name: "Maize", stock: 510, used: 1860, available: 445 },
    ],
    ddgs: [
      { label: "Wet Cake", value: "2,640", unit: "MT" },
      { label: "Dry Cake", value: "1,102", unit: "MT" },
      { label: "Moisture", value: "10.6", unit: "%" },
      { label: "Yield (on Grain)", value: "24.6", unit: "%" },
    ],
  },
  "2m": {
    blurb: "Plant performance for the last 2 months.",
    chartRange: "Last 8 weeks",
    compareA: "Last 2 months",
    compareB: "Prior 2 months",
    usedLabel: "Period used",
    ddgsTitle: "DDGS Production (2 Months)",
    labels: ["W1", "W2", "W3", "W4", "W5", "W6", "W7", "W8"],
    kpis: [
      { title: "AA Production (2 Months)", value: "4,012", unit: "KL", sub: "Target: 4,200 KL", delta: -4.48, spark: [480, 502, 495, 509, 498, 512, 505, 511] },
      { title: "Fermentation Efficiency", value: "93.18", unit: "%", sub: "Target: 94.00 %", delta: -0.87, spark: [92.6, 93.0, 93.4, 93.1, 92.9, 93.5, 93.2, 93.18] },
      { title: "Recovery (L/MT Grain)", value: "442.05", unit: "", sub: "Target: 450.00", delta: -1.77, spark: [438, 441, 444, 442, 440, 445, 443, 442] },
      { title: "Steam Consumption (2 Months)", value: "25,310", unit: "MT", sub: "Per KL: 6.31", delta: -1.4, spark: [3180, 3120, 3090, 3150, 3110, 3080, 3140, 3160] },
      { title: "Power Consumption (2 Months)", value: "72,440", unit: "kWh", sub: "Per KL: 18.06", delta: -1.9, spark: [9100, 8920, 8780, 9020, 8880, 8740, 8960, 9040] },
      { title: "Water Consumption (2 Months)", value: "32,080", unit: "m³", sub: "Per KL: 8.00", delta: -2.2, spark: [4120, 3980, 3890, 3870, 4010, 3920, 4050, 3980] },
    ],
    production: [
      { name: "Grain Distilled (MT)", today: "9,070", yesterday: "8,640", change: 4.98 },
      { name: "AA Production (KL)", today: "4,012", yesterday: "4,180", change: -4.02 },
      { name: "Fermentation Eff. (%)", today: "93.18", yesterday: "93.72", change: -0.58 },
      { name: "Recovery (L/MT)", today: "442.05", yesterday: "447.80", change: -1.28 },
      { name: "Steam (MT/KL)", today: "6.31", yesterday: "6.40", change: -1.41, invert: true },
      { name: "Power (kWh/KL)", today: "18.06", yesterday: "18.41", change: -1.9, invert: true },
      { name: "Water (m³/KL)", today: "8.00", yesterday: "8.18", change: -2.2, invert: true },
    ],
    trend: {
      aa: [478, 502, 496, 510, 498, 514, 506, 511],
      eff: [92.6, 93.0, 93.4, 93.1, 92.8, 93.5, 93.2, 93.18],
      rec: [438, 441, 445, 442, 439, 444, 443, 442],
    },
    steam: [6.44, 6.36, 6.28, 6.31, 6.38, 6.24, 6.29, 6.31],
    water: [8.22, 8.08, 7.96, 8.0, 8.12, 7.94, 8.02, 8.0],
    power: [18.55, 18.22, 17.98, 18.04, 18.3, 17.9, 18.1, 18.06],
    grain: [
      { name: "Rice", stock: 420, used: 3340, available: 358 },
      { name: "Broken Rice", stock: 185, used: 1480, available: 157 },
      { name: "Maize", stock: 510, used: 3720, available: 445 },
    ],
    ddgs: [
      { label: "Wet Cake", value: "5,280", unit: "MT" },
      { label: "Dry Cake", value: "2,210", unit: "MT" },
      { label: "Moisture", value: "10.7", unit: "%" },
      { label: "Yield (on Grain)", value: "24.4", unit: "%" },
    ],
  },
  all: {
    blurb: "Lifetime plant performance across all recorded operations.",
    chartRange: "Last 12 months",
    compareA: "All time",
    compareB: "Last 12 months",
    usedLabel: "Lifetime used",
    ddgsTitle: "DDGS Production (All Time)",
    labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    kpis: [
      { title: "AA Production (All Time)", value: "24,860", unit: "KL", sub: "Avg / month: 2,072 KL", delta: 3.12, spark: [1980, 2040, 2010, 2110, 2060, 2090, 2140, 2080, 2160, 2120, 2180, 2072] },
      { title: "Fermentation Efficiency", value: "93.52", unit: "%", sub: "Target: 94.00 %", delta: -0.51, spark: [92.9, 93.1, 93.4, 93.6, 93.3, 93.7, 93.5, 93.8, 93.4, 93.6, 93.9, 93.52] },
      { title: "Recovery (L/MT Grain)", value: "444.80", unit: "", sub: "Target: 450.00", delta: -1.16, spark: [438, 440, 442, 445, 443, 446, 444, 447, 445, 446, 448, 444.8] },
      { title: "Steam Consumption (All Time)", value: "156,400", unit: "MT", sub: "Per KL: 6.29", delta: -2.1, spark: [13200, 12980, 12840, 13110, 12920, 12780, 13040, 12860, 12720, 12950, 12680, 12810] },
      { title: "Power Consumption (All Time)", value: "447,200", unit: "kWh", sub: "Per KL: 17.99", delta: -2.6, spark: [38200, 37600, 37100, 37900, 37400, 36800, 37700, 37200, 36600, 37500, 36400, 37000] },
      { title: "Water Consumption (All Time)", value: "198,500", unit: "m³", sub: "Per KL: 7.98", delta: -3.4, spark: [17100, 16800, 16500, 16950, 16640, 16380, 16820, 16520, 16240, 16700, 16180, 16440] },
    ],
    production: [
      { name: "Grain Distilled (MT)", today: "55,920", yesterday: "52,410", change: 6.7 },
      { name: "AA Production (KL)", today: "24,860", yesterday: "24,110", change: 3.11 },
      { name: "Fermentation Eff. (%)", today: "93.52", yesterday: "93.18", change: 0.36 },
      { name: "Recovery (L/MT)", today: "444.80", yesterday: "441.20", change: 0.82 },
      { name: "Steam (MT/KL)", today: "6.29", yesterday: "6.42", change: -2.02, invert: true },
      { name: "Power (kWh/KL)", today: "17.99", yesterday: "18.46", change: -2.55, invert: true },
      { name: "Water (m³/KL)", today: "7.98", yesterday: "8.26", change: -3.39, invert: true },
    ],
    trend: {
      aa: [1980, 2040, 2010, 2110, 2060, 2090, 2140, 2080, 2160, 2120, 2180, 2072],
      eff: [92.9, 93.1, 93.4, 93.6, 93.3, 93.7, 93.5, 93.8, 93.4, 93.6, 93.9, 93.52],
      rec: [438, 440, 442, 445, 443, 446, 444, 447, 445, 446, 448, 444.8],
    },
    steam: [6.48, 6.42, 6.38, 6.35, 6.33, 6.31, 6.3, 6.28, 6.27, 6.29, 6.26, 6.29],
    water: [8.28, 8.18, 8.12, 8.08, 8.04, 8.0, 7.98, 7.96, 7.94, 7.99, 7.92, 7.98],
    power: [18.6, 18.42, 18.28, 18.18, 18.1, 18.04, 18.0, 17.96, 17.94, 18.02, 17.9, 17.99],
    grain: [
      { name: "Rice", stock: 420, used: 21480, available: 358 },
      { name: "Broken Rice", stock: 185, used: 8920, available: 157 },
      { name: "Maize", stock: 510, used: 23840, available: 445 },
    ],
    ddgs: [
      { label: "Wet Cake", value: "32,640", unit: "MT" },
      { label: "Dry Cake", value: "13,580", unit: "MT" },
      { label: "Moisture", value: "10.5", unit: "%" },
      { label: "Yield (on Grain)", value: "24.3", unit: "%" },
    ],
  },
};

const PLANT_STAGES = [
  { name: "Raw Material", status: "Normal", tone: "ok", icon: Wheat },
  { name: "Milling & Liquefaction", status: "Normal", tone: "ok", icon: Cog },
  { name: "Fermentation", status: "Running", tone: "run", icon: FlaskConical, detail: "8 / 12 fermenters" },
  { name: "Distillation", status: "Running", tone: "run", icon: Cylinder, detail: "2 columns" },
  { name: "Evaporation", status: "Normal", tone: "ok", icon: Wind },
  { name: "DDGS", status: "Running", tone: "run", icon: Factory, detail: "Dryer operating" },
  { name: "Utilities", status: "Normal", tone: "ok", icon: Zap },
];

const FERMENTERS = [
  { label: "Running", value: 8, color: "#22c55e" },
  { label: "Warning", value: 2, color: "#f59e0b" },
  { label: "Idle", value: 1, color: "#94a3b8" },
  { label: "CIP / Cleaning", value: 1, color: "#3b82f6" },
];

const ALERTS = [
  { level: "high", title: "Low Fermentation Efficiency — F-105", time: "10:18 AM", detail: "Current 89.4 %  ·  Target 94.0 %" },
  { level: "warn", title: "High Temperature — F-104", time: "10:05 AM", detail: "Current 36.8 °C  ·  Limit 35.5 °C" },
  { level: "high", title: "Steam ratio above target", time: "09:42 AM", detail: "Current 6.71 MT/KL  ·  Target 6.40" },
  { level: "info", title: "CIP started — Mash cooler", time: "09:15 AM", detail: "Scheduled 90 min cycle" },
  { level: "warn", title: "Grain silo A below reorder", time: "08:50 AM", detail: "Available 182 MT  ·  Reorder 250 MT" },
];

const NOTES = [
  { tone: "warn", text: "Boiler efficiency slightly low — check blowdown and feedwater.", time: "10:10 AM", by: "Mahesh" },
  { tone: "info", text: "Planned maintenance for Distillation Column-Q2 tomorrow 06:00–10:00.", time: "09:40 AM", by: "Shift A" },
  { tone: "ok", text: "Yeast culture transferred to PF-2. Cell count within range.", time: "08:20 AM", by: "Lab" },
];

const NOTIFS = [
  "Low fermentation efficiency on F-105",
  "High temperature on F-104",
  "Steam consumption above target",
  "Silo A below reorder level",
  "CIP started on mash cooler",
  "Column-Q2 maintenance booked",
  "Yeast transfer completed",
  "Power dip recorded at 07:40",
  "Weighbridge ticket pending QC",
];

function greetingFor(date = new Date()) {
  const h = date.getHours();
  if (h < 12) return "Good Morning";
  if (h < 17) return "Good Afternoon";
  return "Good Evening";
}

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

function fmtNow() {
  return new Date().toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Change({ value, invert }) {
  const up = value > 0;
  const good = invert ? !up : up;
  const Icon = up ? TrendingUp : TrendingDown;
  const cls = good ? "text-blue-600" : "text-rose-500";
  return (
    <span className={`inline-flex items-center gap-0.5 text-[11px] font-extrabold tabular-nums ${cls}`}>
      <Icon size={12} strokeWidth={2.6} />
      {Math.abs(value).toFixed(2)}%
    </span>
  );
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

export default function PlantDashboardPage() {
  const { user } = useAuth();
  const [date, setDate] = useState(todayIso);
  const [shift, setShift] = useState("A");
  const [period, setPeriod] = useState("today");
  const [bellOpen, setBellOpen] = useState(false);
  const bellRef = useRef(null);
  const name = firstName(user);
  const org = user?.organizationName || "Digital Distillery";
  const initials = name.slice(0, 1).toUpperCase();
  const view = VIEWS[period] || VIEWS.today;

  useEffect(() => {
    if (!bellOpen) return;
    const onDoc = (e) => {
      if (!bellRef.current?.contains(e.target)) setBellOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [bellOpen]);

  return (
    <div className="min-h-full bg-stone-250 px-4 py-4 sm:px-6 lg:px-7">
      <header className="mb-4 rounded-2xl border border-stone-200/80 bg-white px-5 py-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#2563eb]">Plant dashboard</p>
            <h1 className="mt-0.5 text-2xl font-black tracking-tight text-[#0f2744]">
              {greetingFor()}, {name} 👋
            </h1>
            <p className="mt-0.5 text-sm font-medium text-stone-500">{view.blurb}</p>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2.5">
            <DistillerDatePicker value={date} onChange={setDate} compact className="w-[148px]" />
            <DistillerSelect value={period} onChange={setPeriod} options={PERIODS} compact className="w-[158px]" />
            <DistillerSelect value={shift} onChange={setShift} options={SHIFTS} compact className="w-[210px]" />

            <div className="relative" ref={bellRef}>
              <button
                type="button"
                onClick={() => setBellOpen((v) => !v)}
                className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-stone-200 bg-white text-stone-600 hover:bg-stone-50"
                aria-label="Notifications"
              >
                <Bell size={16} strokeWidth={2.2} />
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-black text-white">
                  {NOTIFS.length}
                </span>
              </button>
              {bellOpen ? (
                <div className="absolute right-0 z-20 mt-2 w-72 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.14)]">
                  <p className="border-b border-stone-100 px-3 py-2 text-[11px] font-extrabold uppercase tracking-wider text-stone-400">
                    Notifications
                  </p>
                  <ul className="max-h-64 divide-y divide-stone-50 overflow-y-auto">
                    {NOTIFS.map((n) => (
                      <li key={n} className="px-3 py-2 text-xs font-semibold text-stone-600">
                        {n}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>

            <button
              type="button"
              title="Help"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-stone-200 bg-white text-stone-600 hover:bg-stone-50"
            >
              <CircleHelp size={16} strokeWidth={2.2} />
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
        <p className="mt-2 text-right text-[10px] font-bold text-stone-400">Last updated: {fmtNow()}</p>
      </header>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-6">
        {view.kpis.map((k, i) => {
          const meta = KPI_META[i];
          const Icon = meta.icon;
          const good = meta.goodWhenDown ? k.delta < 0 : k.delta > 0;
          return (
            <article
              key={k.title}
              className="rounded-2xl border border-stone-200/80 bg-white p-3.5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]"
            >
              <div className="flex items-start justify-between gap-2">
                <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${meta.iconBg}`}>
                  <Icon size={15} strokeWidth={2.2} />
                </span>
                <Change value={k.delta} invert={meta.goodWhenDown} />
              </div>
              <p className="mt-2 text-[10px] font-extrabold uppercase tracking-wider text-stone-400">{k.title}</p>
              <p className="mt-0.5 text-[22px] font-black tabular-nums leading-none text-[#0f2744]">
                {k.value}
                {k.unit ? <span className="ml-1 text-[12px] font-bold text-stone-400">{k.unit}</span> : null}
              </p>
              <p className="mt-1 text-[10px] font-bold text-stone-400">{k.sub}</p>
              <div className="mt-1">
                <Sparkline data={k.spark} color={good ? "#22c55e" : "#94a3b8"} fill={good ? "rgba(34,197,94,0.12)" : "rgba(148,163,184,0.16)"} />
              </div>
            </article>
          );
        })}
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-[minmax(220px,0.95fr)_minmax(340px,1.35fr)_minmax(250px,1fr)_minmax(260px,1.05fr)]">
        <Card title="Plant Status">
          <ol className="space-y-0">
            {PLANT_STAGES.map((s, i) => {
              const Icon = s.icon;
              const last = i === PLANT_STAGES.length - 1;
              return (
                <li key={s.name} className="flex gap-3">
                  <div className="flex w-8 flex-col items-center">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#eef3f9] text-[#2563eb]">
                      <Icon size={14} strokeWidth={2.2} />
                    </span>
                    {last ? null : <span className="my-0.5 w-px flex-1 min-h-[14px] bg-sky-100" />}
                  </div>
                  <div className={`min-w-0 flex-1 ${last ? "pb-0" : "pb-3"}`}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[12px] font-extrabold text-[#0f2744]">{s.name}</p>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-extrabold ${
                          s.tone === "run" ? "bg-sky-500 text-white" : "bg-sky-50 text-[#2563eb]"
                        }`}
                      >
                        {s.status}
                      </span>
                    </div>
                    {s.detail ? <p className="text-[10px] font-semibold text-stone-400">{s.detail}</p> : null}
                  </div>
                </li>
              );
            })}
          </ol>
        </Card>

        <Card title="Production Overview" action={<span className="text-[10px] font-bold text-stone-400">{view.compareA} vs {view.compareB}</span>}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[320px] text-left">
              <thead>
                <tr className="text-[10px] font-extrabold uppercase tracking-wider text-stone-400">
                  <th className="pb-2 font-extrabold">Parameter</th>
                  <th className="pb-2 text-right font-extrabold">{view.compareA}</th>
                  <th className="pb-2 text-right font-extrabold">{view.compareB}</th>
                  <th className="pb-2 text-right font-extrabold">Change</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {view.production.map((row) => (
                  <tr key={row.name}>
                    <td className="py-2 text-[12px] font-bold text-[#0f2744]">{row.name}</td>
                    <td className="py-2 text-right text-[12px] font-extrabold tabular-nums">{row.today}</td>
                    <td className="py-2 text-right text-[12px] font-semibold tabular-nums text-stone-500">{row.yesterday}</td>
                    <td className="py-2 text-right">
                      <Change value={row.change} invert={row.invert} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title="Fermenter Overview">
          <div className="flex flex-col items-center">
            <DonutChart segments={FERMENTERS} total={12} />
            <ul className="mt-1 w-full space-y-1.5">
              {FERMENTERS.map((f) => (
                <li key={f.label} className="flex items-center justify-between text-[11px] font-bold">
                  <span className="flex items-center gap-2 text-stone-600">
                    <span className="h-2 w-2 rounded-full" style={{ background: f.color }} />
                    {f.label}
                  </span>
                  <span className="tabular-nums text-[#0f2744]">{f.value}</span>
                </li>
              ))}
            </ul>
          </div>
        </Card>

        <Card title="Active Alerts" action={<span className="text-[10px] font-extrabold text-rose-500">{ALERTS.length} open</span>}>
          <ul className="space-y-2.5">
            {ALERTS.map((a) => (
              <li key={a.title} className="flex gap-2.5">
                <span
                  className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-black ${
                    a.level === "high"
                      ? "bg-rose-100 text-rose-600"
                      : a.level === "warn"
                        ? "bg-amber-100 text-amber-600"
                        : "bg-sky-100 text-sky-600"
                  }`}
                >
                  !
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

      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-3">
        <Card title="Production Trend" action={<span className="text-[10px] font-bold text-stone-400">{view.chartRange}</span>}>
          <div className="mb-1 flex flex-wrap gap-3 text-[10px] font-bold text-stone-500">
            <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-3 rounded-full bg-[#3b82f6]" /> AA Production</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-3 rounded-full bg-[#22c55e]" /> Efficiency</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-3 rounded-full bg-[#f59e0b]" /> Recovery</span>
          </div>
          <LineChart
            labels={view.labels}
            series={[
              { label: "AA", color: "#3b82f6", data: view.trend.aa },
              { label: "Eff", color: "#22c55e", data: view.trend.eff },
              { label: "Rec", color: "#f59e0b", data: view.trend.rec },
            ]}
          />
        </Card>
        <Card title="Steam Consumption (MT/KL)" action={<span className="text-[10px] font-bold text-stone-400">{view.chartRange}</span>}>
          <BarChart labels={view.labels} data={view.steam} color="#3b82f6" />
        </Card>
        <Card title="Water & Power (Per KL)" action={<span className="text-[10px] font-bold text-stone-400">{view.chartRange}</span>}>
          <div className="mb-1 flex flex-wrap gap-3 text-[10px] font-bold text-stone-500">
            <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-3 rounded-full bg-[#3b82f6]" /> Water</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-3 rounded-full bg-[#eab308]" /> Power</span>
          </div>
          <GroupedBarChart
            labels={view.labels}
            series={[
              { label: "Water", color: "#3b82f6", data: view.water },
              { label: "Power", color: "#eab308", data: view.power },
            ]}
          />
        </Card>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-3">
        <Card title="Raw Material Summary">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] font-extrabold uppercase tracking-wider text-stone-400">
                <th className="pb-2">Material</th>
                <th className="pb-2 text-right">Stock (MT)</th>
                <th className="pb-2 text-right">{view.usedLabel}</th>
                <th className="pb-2 text-right">Available</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {view.grain.map((g) => (
                <tr key={g.name}>
                  <td className="py-2 text-[12px] font-extrabold text-[#0f2744]">{g.name}</td>
                  <td className="py-2 text-right text-[12px] font-bold tabular-nums">{g.stock.toLocaleString()}</td>
                  <td className="py-2 text-right text-[12px] font-semibold tabular-nums text-stone-500">{g.used.toLocaleString()}</td>
                  <td className="py-2 text-right text-[12px] font-black tabular-nums text-[#2563eb]">{g.available.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card title={view.ddgsTitle}>
          <div className="grid grid-cols-2 gap-2.5">
            {view.ddgs.map((b) => (
              <div key={b.label} className="rounded-xl bg-[#f4f7f8] px-3 py-3">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-stone-400">{b.label}</p>
                <p className="mt-1 text-xl font-black tabular-nums text-[#0f2744]">
                  {b.value}
                  <span className="ml-1 text-[11px] font-bold text-stone-400">{b.unit}</span>
                </p>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Important Notes">
          <ul className="space-y-3">
            {NOTES.map((n) => (
              <li key={n.text} className="flex gap-2.5">
                <span
                  className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                    n.tone === "warn" ? "bg-amber-400" : n.tone === "info" ? "bg-sky-400" : "bg-stone-300"
                  }`}
                />
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
        <LayoutDashboard size={12} />
        {org} · File Free QMS by MSG Technologies
      </p>
    </div>
  );
}
