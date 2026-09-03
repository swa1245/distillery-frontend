import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  CalendarClock,
  Droplets,
  FlaskConical,
  Gauge,
  Microscope,
  Plus,
  Search,
  Thermometer,
  Waves,
  Wheat,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import DistillerDatePicker from "../components/DistillerDatePicker";
import DistillerSelect from "../components/DistillerSelect";
import { todayIso } from "../utils/datedSheetStore";
import { LineChart, Sparkline } from "../components/dashboard/MiniCharts";
import vesselSrc from "../assets/fermenter-vessel.png";

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

const TREND_RANGES = [
  { value: "24h", label: "24 Hours" },
  { value: "48h", label: "48 Hours" },
  { value: "7d", label: "7 Days" },
];

const STATUS_STYLE = {
  Running: "bg-emerald-50 text-emerald-700",
  Warning: "bg-amber-50 text-amber-700",
  Idle: "bg-stone-100 text-stone-500",
  CIP: "bg-sky-50 text-sky-700",
};

const FERMENTERS = [
  {
    id: "F1",
    vol: 54,
    fill: 68,
    status: "Running",
    ethanol: 11.35,
    batch: "FB-01",
    temp: 32.4,
    ph: 4.48,
    doPpm: 0.25,
    brix: 2.1,
    rs: 1.8,
    viability: 94,
    cells: 12.5,
    foam: "Low",
    start: "27 Apr 2025, 08:30",
    hours: "29h 15m",
    end: "Tomorrow 11:15",
    grain: 15.6,
    ds: 39.0,
    yeast: 0.8,
    feedstock: "Rice",
    starch: 66.2,
    moisture: 11.0,
    theory: 6.92,
    practical: 6.45,
    eff: 93.23,
    logs: [
      ["06:00 AM", "32.1", "4.52", "10.80", "2.10", "11.8", "93", "0.28", "Ramesh", "Normal"],
      ["10:00 AM", "32.3", "4.50", "11.10", "1.95", "12.1", "94", "0.26", "Ramesh", "Normal"],
      ["02:00 PM", "32.4", "4.48", "11.35", "1.80", "12.5", "94", "0.25", "Mahesh", "Normal"],
    ],
  },
  {
    id: "F2",
    vol: 54,
    fill: 74,
    status: "Running",
    ethanol: 11.18,
    batch: "FB-02",
    temp: 32.8,
    ph: 4.42,
    doPpm: 0.22,
    brix: 1.85,
    rs: 1.55,
    viability: 92,
    cells: 13.1,
    foam: "Med",
    start: "Yesterday 14:00",
    hours: "41h 00m",
    end: "Today 18:00",
    grain: 15.8,
    ds: 38.6,
    yeast: 0.8,
    feedstock: "Maize",
    starch: 66.5,
    moisture: 10.8,
    theory: 6.98,
    practical: 6.40,
    eff: 91.7,
    logs: [
      ["06:00 AM", "32.6", "4.46", "10.90", "1.70", "12.8", "92", "0.24", "Mahesh", "Watch foam"],
      ["02:00 PM", "32.8", "4.42", "11.18", "1.55", "13.1", "92", "0.22", "Mahesh", "Foam med"],
    ],
  },
  {
    id: "F3",
    vol: 54,
    fill: 81,
    status: "Warning",
    ethanol: 10.62,
    batch: "FB-03",
    temp: 34.1,
    ph: 4.28,
    doPpm: 0.18,
    brix: 1.4,
    rs: 1.2,
    viability: 88,
    cells: 11.2,
    foam: "High",
    start: "Yesterday 08:00",
    hours: "47h 10m",
    end: "Today 12:00",
    grain: 16.0,
    ds: 38.2,
    yeast: 0.85,
    feedstock: "Rice",
    starch: 65.8,
    moisture: 11.2,
    theory: 6.90,
    practical: 6.05,
    eff: 87.7,
    logs: [
      ["08:00 AM", "33.6", "4.32", "10.40", "1.35", "11.0", "89", "0.19", "Ramesh", "Temp high"],
      ["02:00 PM", "34.1", "4.28", "10.62", "1.20", "11.2", "88", "0.18", "Priya", "Warning"],
    ],
  },
  {
    id: "F4",
    vol: 54,
    fill: 52,
    status: "Running",
    ethanol: 9.84,
    batch: "FB-04",
    temp: 31.9,
    ph: 4.62,
    doPpm: 0.31,
    brix: 3.4,
    rs: 2.8,
    viability: 95,
    cells: 10.4,
    foam: "Low",
    start: "Today 04:00",
    hours: "11h 20m",
    end: "Tomorrow 08:00",
    grain: 15.4,
    ds: 39.2,
    yeast: 0.8,
    feedstock: "Broken Rice",
    starch: 66.1,
    moisture: 11.1,
    theory: 6.88,
    practical: "—",
    eff: "—",
    logs: [
      ["06:00 AM", "31.6", "4.68", "9.20", "3.10", "9.8", "95", "0.34", "Amit", "Filling"],
      ["02:00 PM", "31.9", "4.62", "9.84", "2.80", "10.4", "95", "0.31", "Amit", "Normal"],
    ],
  },
  {
    id: "F5",
    vol: 54,
    fill: 88,
    status: "Running",
    ethanol: 11.48,
    batch: "FB-05",
    temp: 32.2,
    ph: 4.45,
    doPpm: 0.21,
    brix: 1.55,
    rs: 1.1,
    viability: 93,
    cells: 13.4,
    foam: "Low",
    start: "Yesterday 02:00",
    hours: "37h 40m",
    end: "Today 16:00",
    grain: 15.7,
    ds: 38.8,
    yeast: 0.82,
    feedstock: "Rice",
    starch: 66.4,
    moisture: 10.9,
    theory: 6.95,
    practical: 6.52,
    eff: 93.8,
    logs: [
      ["10:00 AM", "32.0", "4.46", "11.30", "1.20", "13.2", "93", "0.22", "Priya", "Normal"],
      ["02:00 PM", "32.2", "4.45", "11.48", "1.10", "13.4", "93", "0.21", "Priya", "Near drop"],
    ],
  },
  {
    id: "F6",
    vol: 54,
    fill: 0,
    status: "CIP",
    ethanol: 0,
    batch: "—",
    temp: 28.0,
    ph: 6.8,
    doPpm: 0,
    brix: 0,
    rs: 0,
    viability: 0,
    cells: 0,
    foam: "—",
    start: "Today 10:00",
    hours: "02h 10m CIP",
    end: "Today 16:00",
    grain: 0,
    ds: 0,
    yeast: 0,
    feedstock: "—",
    starch: "—",
    moisture: "—",
    theory: "—",
    practical: "—",
    eff: "—",
    logs: [["10:00 AM", "28.0", "6.80", "—", "—", "—", "—", "—", "Ramesh", "CIP started"]],
  },
];

const ALERTS = [
  { level: "high", title: "F3 — Ethanol low", time: "10:18 AM", detail: "10.62 % v/v vs 11.50 target" },
  { level: "warn", title: "F3 — Temperature high", time: "10:05 AM", detail: "34.1 °C vs 33.0 limit" },
  { level: "warn", title: "F2 — Foam detected", time: "09:40 AM", detail: "Foam level medium" },
  { level: "info", title: "F6 — CIP in progress", time: "10:00 AM", detail: "Cycle due 16:00" },
  { level: "info", title: "F5 — Near drop", time: "09:12 AM", detail: "Ethanol 11.48 % · RS 1.10 %" },
];

const TREND = {
  "24h": {
    labels: ["06:00", "10:00", "14:00", "18:00", "22:00", "02:00"],
    etoh: [10.8, 11.0, 11.2, 11.28, 11.32, 11.35],
    temp: [31.8, 32.1, 32.3, 32.4, 32.2, 32.4],
    ph: [4.6, 4.55, 4.5, 4.48, 4.47, 4.48],
    brix: [3.1, 2.7, 2.4, 2.2, 2.15, 2.1],
  },
  "48h": {
    labels: ["-48h", "-36h", "-24h", "-18h", "-12h", "-6h", "Now"],
    etoh: [8.4, 9.2, 10.1, 10.6, 11.0, 11.2, 11.35],
    temp: [31.4, 31.8, 32.0, 32.2, 32.5, 32.3, 32.4],
    ph: [4.8, 4.7, 4.62, 4.55, 4.5, 4.48, 4.48],
    brix: [8.2, 6.4, 4.8, 3.6, 2.8, 2.3, 2.1],
  },
  "7d": {
    labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    etoh: [11.1, 11.2, 11.28, 11.18, 11.4, 11.25, 11.32],
    temp: [32.0, 32.2, 32.4, 32.6, 32.1, 32.3, 32.4],
    ph: [4.5, 4.48, 4.46, 4.5, 4.52, 4.48, 4.48],
    brix: [2.4, 2.2, 2.1, 2.3, 2.0, 2.15, 2.1],
  },
};

const PERIOD_KPI = {
  today: {
    active: "8 / 12",
    eff: "92.8",
    etoh: "11.32",
    wash: "6,152",
    aa: "68.39",
    alerts: 5,
  },
  "1m": {
    active: "4 / 6",
    eff: "93.41",
    etoh: "11.28",
    wash: "178,400",
    aa: "1,986",
    alerts: 18,
  },
  "2m": {
    active: "4 / 6",
    eff: "93.18",
    etoh: "11.24",
    wash: "360,200",
    aa: "4,012",
    alerts: 34,
  },
  all: {
    active: "4 / 6",
    eff: "93.52",
    etoh: "11.30",
    wash: "2.21 Mm³",
    aa: "24,860",
    alerts: 5,
  },
};

function firstName(user) {
  const raw = String(user?.username || "Operator").trim();
  return raw.split(/\s+/)[0].replace(/^./, (c) => c.toUpperCase());
}

function roleLabel(user) {
  const r = String(user?.role || "User");
  if (r.toLowerCase() === "admin") return "Fermentation Incharge";
  return r.replace(/_/g, " ");
}

function Card({ title, children, className = "", action, id }) {
  return (
    <section id={id} className={`rounded-2xl border border-stone-200/80 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)] ${className}`}>
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

function FermenterIcon({ className = "h-11 w-9" }) {
  return (
    <svg viewBox="0 0 36 44" className={className} fill="none" aria-hidden>
      <rect x="13" y="1.5" width="10" height="5" rx="1.4" fill="#22c55e" />
      <path
        d="M9 8.5h18c1.7 0 3 1.3 3 3v20.5c0 3.6-2.9 6.5-6.5 6.5h-11C8.9 38.5 6 35.6 6 32V11.5c0-1.7 1.3-3 3-3Z"
        stroke="#22c55e"
        strokeWidth="2.2"
      />
      <path d="M8.2 24.5h19.6v7.6c0 2.5-2 4.5-4.5 4.5h-10.6c-2.5 0-4.5-2-4.5-4.5v-7.6Z" fill="#22c55e" opacity="0.35" />
      <path d="M8.4 24.5c2.4-.9 4.6.8 7 .8s4.4-1.7 6.8-.8 4.4.8 6.6-.4" stroke="#22c55e" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function AlertBadgeIcon({ className = "h-9 w-9" }) {
  return (
    <svg viewBox="0 0 36 36" className={className} aria-hidden>
      <path
        d="M18 4.2 33.2 31.4c.55 1-.18 2.2-1.33 2.2H4.13c-1.15 0-1.88-1.2-1.33-2.2L18 4.2Z"
        fill="#ef4444"
      />
      <rect x="16.6" y="13.2" width="2.8" height="10.2" rx="1.2" fill="#fff" />
      <circle cx="18" cy="27.1" r="1.55" fill="#fff" />
    </svg>
  );
}

function WashTankIcon({ className = "h-11 w-10" }) {
  return (
    <svg viewBox="0 0 40 36" className={className} fill="none" aria-hidden>
      <rect x="4" y="3" width="32" height="30" rx="4" stroke="#14b8a6" strokeWidth="2.2" />
      <path d="M6 16.5h28v12.5c0 2-1.6 3.6-3.6 3.6H9.6C7.6 32.6 6 31 6 29V16.5Z" fill="#14b8a6" opacity="0.28" />
      <path d="M6.5 16.5c3.5-1.4 6.5 1.2 10 1.2s6.5-2.6 10-1.2 6.2 1.2 9.5-.6" stroke="#14b8a6" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function TankGraphic({ fill }) {
  const clamped = Math.max(0, Math.min(100, Number(fill) || 0));
  return (
    <div className="flex items-center gap-2">
      <img src={vesselSrc} alt="Fermenter vessel" className="h-[210px] w-[118px] object-contain" />
      <div className="relative h-[168px] w-9">
        <div className="absolute bottom-0 left-1.5 top-0 w-px bg-stone-200" />
        {[100, 75, 50, 25, 0].map((p) => (
          <span
            key={p}
            className="absolute left-0 -translate-y-1/2 pl-3 text-[9px] font-extrabold tabular-nums text-stone-400"
            style={{ top: `${100 - p}%` }}
          >
            {p}%
          </span>
        ))}
        <span
          className="absolute left-0 h-px w-7 bg-emerald-500"
          style={{ bottom: `${clamped}%` }}
        />
      </div>
    </div>
  );
}

export default function FermentationOverviewPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [date, setDate] = useState(todayIso);
  const [shift, setShift] = useState("A");
  const [period, setPeriod] = useState("today");
  const [trendRange, setTrendRange] = useState("48h");
  const [selectedId, setSelectedId] = useState("F1");
  const [q, setQ] = useState("");
  const kpi = PERIOD_KPI[period] || PERIOD_KPI.today;
  const trend = TREND[trendRange] || TREND["48h"];
  const selected = FERMENTERS.find((f) => f.id === selectedId) || FERMENTERS[0];
  const name = firstName(user);
  const initials = name.slice(0, 1).toUpperCase();

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return FERMENTERS;
    return FERMENTERS.filter((f) => f.id.toLowerCase().includes(s) || f.status.toLowerCase().includes(s) || f.batch.toLowerCase().includes(s));
  }, [q]);

  const metrics = [
    { label: "Ethanol (v/v)", value: `${selected.ethanol.toFixed(2)} %`, sub: "Target: 11.50 %", bad: selected.ethanol < 11, icon: Droplets, iconClass: "bg-sky-50 text-sky-600" },
    { label: "Temperature", value: `${selected.temp.toFixed(1)} °C`, sub: "Target: 30 – 33", bad: selected.temp > 33, icon: Thermometer, iconClass: "bg-orange-50 text-orange-600" },
    { label: "pH", value: selected.ph.toFixed(2), sub: "Target: 4.4 – 4.8", icon: FlaskConical, iconClass: "bg-violet-50 text-violet-600" },
    { label: "DO", value: `${selected.doPpm} ppm`, sub: "Target: 0.20 – 0.40", icon: Activity, iconClass: "bg-cyan-50 text-cyan-700" },
    { label: "Residual Sugar", value: `${selected.rs} %`, sub: "Target: ≤ 2.0", icon: Wheat, iconClass: "bg-amber-50 text-amber-600" },
    { label: "Viability", value: `${selected.viability} %`, sub: "Target: ≥ 90 %", bad: selected.viability < 90, icon: Gauge, iconClass: "bg-emerald-50 text-emerald-600" },
    { label: "Cell Count", value: `${selected.cells} B/mL`, sub: "Target: 10 – 14", icon: Microscope, iconClass: "bg-indigo-50 text-indigo-600" },
    { label: "Foam Level", value: selected.foam, sub: "Target: Low", bad: selected.foam === "High", icon: Waves, iconClass: "bg-teal-50 text-teal-700" },
    {
      label: "Efficiency",
      value: selected.eff === "—" ? "—" : `${selected.eff} %`,
      sub: "Target: ≥ 94 %",
      bad: selected.eff !== "—" && Number(selected.eff) < 94,
      icon: Gauge,
      iconClass: selected.eff !== "—" && Number(selected.eff) < 94 ? "bg-rose-500 text-white" : "bg-emerald-50 text-emerald-600",
    },
    { label: "Expected End", value: selected.end, sub: `Batch ${selected.batch}`, icon: CalendarClock, iconClass: "bg-sky-50 text-[#2563eb]" },
  ];

  return (
    <div className="min-h-full bg-stone-250 px-4 py-4 sm:px-6 lg:px-7">
      <header className="mb-4 rounded-2xl border border-stone-200/80 bg-white px-5 py-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#2563eb]">Fermentation</p>
            <h1 className="mt-0.5 text-2xl font-black tracking-tight text-[#0f2744]">Fermenter Overview</h1>
            <p className="mt-0.5 text-sm font-medium text-stone-500">Live tanks, batch detail, trends, and latest logs.</p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2.5">
            <DistillerDatePicker value={date} onChange={setDate} compact className="w-[148px]" />
            <DistillerSelect value={period} onChange={setPeriod} options={PERIODS} compact className="w-[158px]" />
            <DistillerSelect value={shift} onChange={setShift} options={SHIFTS} compact className="w-[210px]" />
            <button
              type="button"
              onClick={() => navigate("/fermentation/analysis")}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[#3b74e8] px-3 text-[12px] font-bold text-white shadow-sm hover:bg-[#2f63d4]"
            >
              <Plus size={14} strokeWidth={2.6} />
              Add Log
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
      </header>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-6">
        {[
          {
            title: "Active Fermenters",
            value: kpi.active,
            sub: <span className="text-emerald-600">In Operation</span>,
            visual: <FermenterIcon />,
          },
          {
            title: "Avg. Fermentation Efficiency",
            value: `${kpi.eff} %`,
            sub: (
              <>
                Target: <span className="text-rose-500">94.0%</span>
              </>
            ),
            visual: <Sparkline data={[92.1, 92.6, 93.1, 92.4, 92.9, 92.8]} color="#8b5cf6" fill="rgba(139,92,246,0.22)" />,
          },
          {
            title: "Avg. Ethanol (v/v)",
            value: `${kpi.etoh} %`,
            sub: (
              <>
                Target: <span className="text-emerald-600">11.50%</span>
              </>
            ),
            visual: <Droplets size={34} strokeWidth={1.8} className="text-sky-500" />,
          },
          {
            title: "Total Wash in Fermentation",
            value: `${kpi.wash} m³`,
            sub: <span className="text-stone-400">{period === "today" ? "Today" : "This period"}</span>,
            visual: <WashTankIcon />,
          },
          {
            title: "Total AA Production",
            value: `${kpi.aa} KL`,
            sub: <span className="text-stone-400">{period === "today" ? "Today" : "This period"}</span>,
            visual: <Sparkline data={[62, 64, 67, 65, 69, 68.39]} color="#f59e0b" fill="rgba(245,158,11,0.22)" />,
          },
          {
            title: "Active Alerts",
            value: String(kpi.alerts),
            sub: (
              <button
                type="button"
                onClick={() => document.getElementById("recent-alerts")?.scrollIntoView({ behavior: "smooth" })}
                className="font-semibold text-[#2563eb] hover:underline"
              >
                View All
              </button>
            ),
            visual: <AlertBadgeIcon />,
          },
        ].map((k) => (
          <article key={k.title} className="flex items-start justify-between gap-2 rounded-2xl border border-stone-200/80 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
            <div className="min-w-0">
              <p className="text-[12px] font-semibold text-[#0f2744]">{k.title}</p>
              <p className="mt-1.5 text-[22px] font-black tabular-nums leading-none text-[#0f2744]">{k.value}</p>
              <p className="mt-2 text-[12px] font-medium text-stone-500">{k.sub}</p>
            </div>
            <div className="mt-1 w-[88px] shrink-0 text-right [&>svg]:ml-auto">{k.visual}</div>
          </article>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-[260px_1fr]">
        <Card title="Fermenter List">
          <div className="relative mb-2">
            <Search size={13} className="absolute left-2.5 top-2.5 text-stone-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search F1…"
              className="h-9 w-full rounded-xl border border-stone-200 pl-8 pr-3 text-[12px] font-semibold outline-none focus:border-[#3b74e8]"
            />
          </div>
          <ul className="space-y-1">
            {list.map((f) => (
              <li key={f.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(f.id)}
                  className={`flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-left ${
                    selectedId === f.id ? "bg-[#e8f0fe] ring-1 ring-[#3b74e8]/30" : "hover:bg-stone-50"
                  }`}
                >
                  <span>
                    <span className="block text-[13px] font-extrabold text-[#0f2744]">{f.id}</span>
                    <span className="text-[10px] font-bold text-stone-400">
                      {f.batch} · {f.fill}%
                    </span>
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-[9px] font-extrabold ${STATUS_STYLE[f.status]}`}>{f.status}</span>
                </button>
              </li>
            ))}
          </ul>
        </Card>

        <Card
          title={`Fermenter Details — ${selected.id}`}
          action={<span className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold ${STATUS_STYLE[selected.status]}`}>{selected.status}</span>}
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
            <div className="flex justify-center lg:w-[168px] lg:shrink-0">
              <TankGraphic fill={selected.fill} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
                {metrics.map((m) => {
                  const Icon = m.icon;
                  return (
                    <div key={m.label} className="flex items-start justify-between gap-2 rounded-xl bg-[#f4f7f8] px-3 py-2.5">
                      <div className="min-w-0">
                        <p className="text-[10px] font-extrabold uppercase tracking-wider text-stone-400">{m.label}</p>
                        <p className="mt-0.5 text-[15px] font-black tabular-nums text-[#0f2744]">{m.value}</p>
                        <p className={`text-[10px] font-bold ${m.bad ? "text-rose-500" : "text-blue-600"}`}>{m.sub}</p>
                      </div>
                      {Icon ? (
                        <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${m.iconClass}`}>
                          <Icon size={15} />
                        </span>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-6 rounded-xl bg-[#f4f6f8] px-4 py-3">
            <div>
              <p className="text-[11px] font-semibold text-stone-400">Start Time</p>
              <p className="mt-0.5 text-[13px] font-extrabold text-[#0f2744]">{selected.start}</p>
            </div>
            <div className="text-right">
              <p className="text-[11px] font-semibold text-stone-400">Fermentation Time</p>
              <p className="mt-0.5 text-[13px] font-extrabold text-[#0f2744]">{selected.hours}</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-3">
        <Card
          title="Parameter Trends"
          action={<DistillerSelect value={trendRange} onChange={setTrendRange} options={TREND_RANGES} compact className="w-[120px]" />}
        >
          <div className="mb-1 flex flex-wrap gap-2 text-[10px] font-bold text-stone-500">
            <span className="inline-flex items-center gap-1"><span className="h-1.5 w-3 rounded-full bg-[#3b82f6]" /> Ethanol</span>
            <span className="inline-flex items-center gap-1"><span className="h-1.5 w-3 rounded-full bg-[#ef4444]" /> Temp</span>
            <span className="inline-flex items-center gap-1"><span className="h-1.5 w-3 rounded-full bg-[#22c55e]" /> pH</span>
          </div>
          <LineChart
            labels={trend.labels}
            series={[
              { label: "EtOH", color: "#3b82f6", data: trend.etoh },
              { label: "Temp", color: "#ef4444", data: trend.temp },
              { label: "pH", color: "#22c55e", data: trend.ph },
            ]}
          />
        </Card>

        <Card title="Batch Summary">
          <ul className="divide-y divide-stone-100 text-[12px]">
            {[
              ["Batch ID", selected.batch],
              ["Feed stock", selected.feedstock],
              ["Starch %", selected.starch],
              ["Moisture %", selected.moisture],
              ["Theoretical yield", selected.theory === "—" ? "—" : `${selected.theory} KL`],
              ["Practical yield", selected.practical === "—" ? "—" : `${selected.practical} KL`],
              ["Fermentation efficiency", selected.eff === "—" ? "—" : `${selected.eff} %`],
            ].map(([k, v]) => (
              <li key={k} className="flex justify-between py-1.5">
                <span className="font-semibold text-stone-500">{k}</span>
                <span className="font-extrabold text-[#0f2744]">{v}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card id="recent-alerts" title="Recent Alerts">
          <ul className="space-y-2.5">
            {ALERTS.map((a) => (
              <li key={a.title} className="flex gap-2.5">
                <span
                  className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                    a.level === "high" ? "bg-rose-100 text-rose-600" : a.level === "warn" ? "bg-amber-100 text-amber-600" : "bg-sky-100 text-sky-600"
                  }`}
                >
                  <AlertTriangle size={12} />
                </span>
                <div>
                  <p className="text-[12px] font-extrabold text-[#0f2744]">{a.title}</p>
                  <p className="text-[10px] font-semibold text-stone-400">
                    {a.detail} · {a.time}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card className="mt-3" title={`Latest Logs — ${selected.id}`}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left">
            <thead>
              <tr className="text-[10px] font-extrabold uppercase tracking-wider text-stone-400">
                {["Time", "Temp (°C)", "pH", "Ethanol %", "RS %", "Cells", "Viability %", "DO", "Operator", "Remarks"].map((h) => (
                  <th key={h} className="pb-2 pr-3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {selected.logs.map((row) => (
                <tr key={row[0] + row[9]}>
                  {row.map((c, i) => (
                    <td key={i} className={`py-2 pr-3 text-[12px] font-semibold ${i === 0 || i === 8 ? "font-extrabold text-[#0f2744]" : "tabular-nums text-stone-700"}`}>
                      {c}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <p className="mt-4 flex items-center gap-1.5 pb-2 text-[10px] font-bold text-stone-400">
        <FlaskConical size={12} />
        {user?.organizationName || "Digital Distillery"} · Fermenter overview · F1–F6
      </p>
    </div>
  );
}
