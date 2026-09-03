import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CircleAlert,
  Cog,
  Download,
  Droplets,
  Eye,
  FlaskConical,
  Maximize2,
  Package,
  Plus,
  Recycle,
  TrendingUp,
  Wheat,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import DistillerDatePicker from "../components/DistillerDatePicker";
import DistillerSelect from "../components/DistillerSelect";
import { todayIso } from "../utils/datedSheetStore";
import { downloadExcelTable } from "../utils/exportReport";
import { LineChart } from "../components/dashboard/MiniCharts";

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

const KPI_ICONS = [
  { icon: Wheat, bg: "bg-amber-50 text-amber-600" },
  { icon: Package, bg: "bg-stone-100 text-stone-600" },
  { icon: Droplets, bg: "bg-sky-50 text-sky-600" },
  { icon: FlaskConical, bg: "bg-violet-50 text-violet-600" },
  { icon: TrendingUp, bg: "bg-sky-50 text-[#2563eb]" },
  { icon: Recycle, bg: "bg-cyan-50 text-cyan-700" },
  { icon: Recycle, bg: "bg-blue-50 text-[#3b74e8]" },
];

const EQUIPMENT = [
  { name: "Mill-01", status: "Running", tone: "run", load: 88 },
  { name: "Mill-02", status: "Standby", tone: "wait", load: 0 },
  { name: "Liquifier-01", status: "Running", tone: "run", load: 76 },
  { name: "Liquifier-02", status: "Running", tone: "run", load: 82 },
  { name: "Mash Pump-01", status: "Running", tone: "run", load: 64 },
  { name: "Steam Control Valve", status: "Auto", tone: "auto", load: 41 },
];

const TABS = [
  { id: "logs", label: "Milling & Liquefaction Logs" },
  { id: "enzyme", label: "Enzyme Dosing Log" },
  { id: "mass", label: "Mass Balance History" },
  { id: "alarms", label: "Alarms & Events" },
];

const LOG_HEADS = [
  "Time",
  "Grain Distilled (MT)",
  "Starch (%)",
  "Moisture (%)",
  "Temp (°C)",
  "pH",
  "Viscosity (cP)",
  "Total Solids (%)",
  "Efficiency (%)",
  "Steam (Ton)",
  "Thin Slop (m³)",
  "Condensate (m³)",
  "Operator",
];

const VIEWS = {
  today: {
    kpis: [
      { title: "Grain Distilled", value: "155.00", unit: "MT", agreed: "Agreed: 155 MT" },
      { title: "Starch in Flour", value: "66.21", unit: "%", agreed: "Agreed: 68 %" },
      { title: "Moisture in Flour", value: "11.00", unit: "%", agreed: "Agreed: 11 %" },
      { title: "Theoretical Yield", value: "68.39", unit: "KL", agreed: "Agreed: 68.39 KL" },
      { title: "Liquefaction Efficiency", value: "93.23", unit: "%", agreed: "Agreed: 94 %" },
      { title: "Thin Slop Recycle", value: "0.00", unit: "m³", agreed: "Agreed: 0 m³" },
      { title: "Condensate Recycle", value: "43.04", unit: "m³", agreed: "Agreed: 43.04 m³" },
    ],
    feed: [
      ["Grain Distilled", "155.00 MT"],
      ["Grain Used", "156.31 MT"],
      ["Starch Content", "66.21 %"],
      ["Moisture", "11.00 %"],
      ["Dry Matter", "89.00 %"],
      ["Starch in Flour (calc.)", "103.49 MT"],
      ["Average Particle Size", "650 µm"],
      ["Flour Temp", "29.2 °C"],
    ],
    liq: [
      ["Liquifier Volume", "156.00 KL"],
      ["Temp", "93.23 °C"],
      ["Cooking Time", "20 min"],
      ["pH at outlet", "5.72"],
      ["Total Solids in Mash", "32.50 %"],
      ["Viscosity", "152 cP"],
      ["Liquefaction Efficiency", "93.23 %", "good"],
      ["Enzyme Dosing", "13.74 KG"],
    ],
    recycle: [
      ["Thin Slop Recycle", "0.00 m³", "0.00 %"],
      ["Process Condensate Recycle", "43.04 m³", "16.12 %"],
      ["Fresh Water", "223.96 m³", "83.88 %"],
      ["Total Water", "267.00 m³", "100 %"],
      ["Steam to Liquefaction", "51.10 Ton", "0.68 Ton/KL"],
    ],
    mass: {
      input: [
        ["Starch in Flour", "103.49"],
        ["Enzyme Solids", "0.31"],
        ["Recycle Solids", "0.00"],
      ],
      inputTotal: "103.80",
      output: [["Liquified Mash Solids", "103.15"]],
      loss: "0.65",
      balance: "99.37 %",
    },
    logs: [
      ["06:00 AM", "52.00", "66.10", "11.20", "92.8", "5.70", "148", "32.2", "93.10", "17.20", "0.00", "14.20", "Ramesh"],
      ["02:00 PM", "51.40", "66.40", "10.90", "93.4", "5.74", "154", "32.6", "93.40", "16.90", "0.00", "14.50", "Mahesh"],
      ["10:00 PM", "51.60", "66.13", "10.90", "93.5", "5.72", "154", "32.7", "93.19", "17.00", "0.00", "14.34", "Ramesh"],
    ],
    enzyme: [
      ["06:00 AM", "Alpha amylase", "4.60 KG", "Liquifier-01", "Ramesh"],
      ["02:00 PM", "Alpha amylase", "4.52 KG", "Liquifier-01", "Mahesh"],
      ["10:00 PM", "Alpha amylase", "4.62 KG", "Liquifier-02", "Ramesh"],
    ],
    massHist: [
      ["06:00 AM", "34.60", "34.48", "0.12", "99.65 %"],
      ["02:00 PM", "34.52", "34.35", "0.17", "99.51 %"],
      ["10:00 PM", "34.68", "34.32", "0.36", "98.96 %"],
    ],
    alarms: [
      ["09:18 AM", "Warn", "Starch in flour below agreed 68 %", "66.21 %"],
      ["11:40 AM", "Info", "Mill-02 on standby", "Load 0 %"],
    ],
  },
  "1m": {
    kpis: [
      { title: "Grain Distilled", value: "4,480", unit: "MT", agreed: "Agreed: 4,650 MT" },
      { title: "Starch in Flour", value: "66.40", unit: "%", agreed: "Agreed: 68 %" },
      { title: "Moisture in Flour", value: "11.10", unit: "%", agreed: "Agreed: 11 %" },
      { title: "Theoretical Yield", value: "1,986", unit: "KL", agreed: "Agreed: 2,100 KL" },
      { title: "Liquefaction Efficiency", value: "93.41", unit: "%", agreed: "Agreed: 94 %" },
      { title: "Thin Slop Recycle", value: "12.40", unit: "m³", agreed: "Agreed: 0–20 m³" },
      { title: "Condensate Recycle", value: "1,248", unit: "m³", agreed: "Avg 41.6 m³/day" },
    ],
    feed: [
      ["Grain Distilled", "4,480 MT"],
      ["Grain Used", "4,518 MT"],
      ["Starch Content", "66.40 %"],
      ["Moisture", "11.10 %"],
      ["Dry Matter", "88.90 %"],
      ["Starch in Flour (calc.)", "2,992 MT"],
      ["Average Particle Size", "648 µm"],
      ["Flour Temp", "29.0 °C"],
    ],
    liq: [
      ["Liquifier Volume", "4,520 KL"],
      ["Temp", "93.10 °C"],
      ["Cooking Time", "20 min"],
      ["pH at outlet", "5.70"],
      ["Total Solids in Mash", "32.40 %"],
      ["Viscosity", "150 cP"],
      ["Liquefaction Efficiency", "93.41 %", "good"],
      ["Enzyme Dosing", "398 KG"],
    ],
    recycle: [
      ["Thin Slop Recycle", "12.40 m³", "0.16 %"],
      ["Process Condensate Recycle", "1,248 m³", "16.05 %"],
      ["Fresh Water", "6,520 m³", "83.79 %"],
      ["Total Water", "7,780 m³", "100 %"],
      ["Steam to Liquefaction", "1,482 Ton", "0.75 Ton/KL"],
    ],
    mass: {
      input: [
        ["Starch in Flour", "2,992"],
        ["Enzyme Solids", "9.0"],
        ["Recycle Solids", "1.2"],
      ],
      inputTotal: "3,002.2",
      output: [["Liquified Mash Solids", "2,984"]],
      loss: "18.2",
      balance: "99.39 %",
    },
    logs: [
      ["Week 1", "1,102", "66.2", "11.1", "93.0", "5.70", "149", "32.3", "93.20", "368", "2.10", "308", "Shift A"],
      ["Week 2", "1,128", "66.5", "11.0", "93.2", "5.72", "151", "32.5", "93.50", "372", "3.40", "314", "Shift B"],
      ["Week 3", "1,116", "66.4", "11.2", "93.1", "5.69", "150", "32.4", "93.38", "370", "3.80", "312", "Shift A"],
      ["Week 4", "1,134", "66.5", "11.1", "93.1", "5.71", "150", "32.4", "93.56", "372", "3.10", "314", "Shift C"],
    ],
    enzyme: [
      ["Week 1", "Alpha amylase", "98 KG", "Liquifier-01 / 02", "Lab"],
      ["Week 2", "Alpha amylase", "101 KG", "Liquifier-01 / 02", "Lab"],
      ["Week 3", "Alpha amylase", "99 KG", "Liquifier-01 / 02", "Lab"],
      ["Week 4", "Alpha amylase", "100 KG", "Liquifier-01 / 02", "Lab"],
    ],
    massHist: [
      ["Week 1", "738.2", "733.8", "4.4", "99.40 %"],
      ["Week 2", "754.1", "749.6", "4.5", "99.40 %"],
      ["Week 3", "746.0", "741.8", "4.2", "99.44 %"],
      ["Week 4", "763.9", "758.8", "5.1", "99.33 %"],
    ],
    alarms: [
      ["12 Aug", "Warn", "Monthly starch avg below 68 %", "66.40 %"],
      ["19 Aug", "Info", "Thin slop recycle used on 3 days", "12.40 m³"],
    ],
  },
  "2m": {
    kpis: [
      { title: "Grain Distilled", value: "9,070", unit: "MT", agreed: "Agreed: 9,300 MT" },
      { title: "Starch in Flour", value: "66.28", unit: "%", agreed: "Agreed: 68 %" },
      { title: "Moisture in Flour", value: "11.08", unit: "%", agreed: "Agreed: 11 %" },
      { title: "Theoretical Yield", value: "4,012", unit: "KL", agreed: "Agreed: 4,200 KL" },
      { title: "Liquefaction Efficiency", value: "93.18", unit: "%", agreed: "Agreed: 94 %" },
      { title: "Thin Slop Recycle", value: "28.60", unit: "m³", agreed: "Agreed: 0–40 m³" },
      { title: "Condensate Recycle", value: "2,510", unit: "m³", agreed: "Avg 41.8 m³/day" },
    ],
    feed: [
      ["Grain Distilled", "9,070 MT"],
      ["Grain Used", "9,148 MT"],
      ["Starch Content", "66.28 %"],
      ["Moisture", "11.08 %"],
      ["Dry Matter", "88.92 %"],
      ["Starch in Flour (calc.)", "6,050 MT"],
      ["Average Particle Size", "652 µm"],
      ["Flour Temp", "29.1 °C"],
    ],
    liq: [
      ["Liquifier Volume", "9,140 KL"],
      ["Temp", "93.05 °C"],
      ["Cooking Time", "20 min"],
      ["pH at outlet", "5.71"],
      ["Total Solids in Mash", "32.35 %"],
      ["Viscosity", "151 cP"],
      ["Liquefaction Efficiency", "93.18 %", "good"],
      ["Enzyme Dosing", "804 KG"],
    ],
    recycle: [
      ["Thin Slop Recycle", "28.60 m³", "0.18 %"],
      ["Process Condensate Recycle", "2,510 m³", "16.08 %"],
      ["Fresh Water", "13,090 m³", "83.74 %"],
      ["Total Water", "15,629 m³", "100 %"],
      ["Steam to Liquefaction", "2,992 Ton", "0.75 Ton/KL"],
    ],
    mass: {
      input: [
        ["Starch in Flour", "6,050"],
        ["Enzyme Solids", "18.2"],
        ["Recycle Solids", "2.8"],
      ],
      inputTotal: "6,071.0",
      output: [["Liquified Mash Solids", "6,032"]],
      loss: "39.0",
      balance: "99.36 %",
    },
    logs: [
      ["Weeks 1–2", "2,230", "66.2", "11.1", "93.0", "5.70", "150", "32.3", "93.10", "740", "6.2", "622", "Ops"],
      ["Weeks 3–4", "2,250", "66.4", "11.0", "93.2", "5.72", "151", "32.5", "93.30", "746", "7.1", "628", "Ops"],
      ["Weeks 5–6", "2,280", "66.3", "11.1", "93.1", "5.71", "151", "32.4", "93.20", "752", "7.8", "630", "Ops"],
      ["Weeks 7–8", "2,310", "66.2", "11.1", "92.9", "5.70", "152", "32.3", "93.12", "754", "7.5", "630", "Ops"],
    ],
    enzyme: [
      ["Weeks 1–2", "Alpha amylase", "198 KG", "Both liquifiers", "Lab"],
      ["Weeks 3–4", "Alpha amylase", "201 KG", "Both liquifiers", "Lab"],
      ["Weeks 5–6", "Alpha amylase", "203 KG", "Both liquifiers", "Lab"],
      ["Weeks 7–8", "Alpha amylase", "202 KG", "Both liquifiers", "Lab"],
    ],
    massHist: [
      ["Weeks 1–2", "1,492", "1,482", "10.0", "99.33 %"],
      ["Weeks 3–4", "1,508", "1,498", "10.0", "99.34 %"],
      ["Weeks 5–6", "1,524", "1,514", "10.0", "99.34 %"],
      ["Weeks 7–8", "1,547", "1,538", "9.0", "99.42 %"],
    ],
    alarms: [
      ["04 Aug", "Warn", "Efficiency below 94 % for 6 days", "93.18 %"],
      ["18 Aug", "Info", "Condensate recycle above plan", "2,510 m³"],
    ],
  },
  all: {
    kpis: [
      { title: "Grain Distilled", value: "55,920", unit: "MT", agreed: "Lifetime" },
      { title: "Starch in Flour", value: "66.35", unit: "%", agreed: "Lifetime avg" },
      { title: "Moisture in Flour", value: "11.05", unit: "%", agreed: "Lifetime avg" },
      { title: "Theoretical Yield", value: "24,860", unit: "KL", agreed: "Lifetime" },
      { title: "Liquefaction Efficiency", value: "93.52", unit: "%", agreed: "Agreed: 94 %" },
      { title: "Thin Slop Recycle", value: "186", unit: "m³", agreed: "Lifetime" },
      { title: "Condensate Recycle", value: "15,420", unit: "m³", agreed: "Lifetime" },
    ],
    feed: [
      ["Grain Distilled", "55,920 MT"],
      ["Grain Used", "56,410 MT"],
      ["Starch Content", "66.35 %"],
      ["Moisture", "11.05 %"],
      ["Dry Matter", "88.95 %"],
      ["Starch in Flour (calc.)", "37,280 MT"],
      ["Average Particle Size", "649 µm"],
      ["Flour Temp", "29.1 °C"],
    ],
    liq: [
      ["Liquifier Volume", "56,200 KL"],
      ["Temp", "93.20 °C"],
      ["Cooking Time", "20 min"],
      ["pH at outlet", "5.71"],
      ["Total Solids in Mash", "32.45 %"],
      ["Viscosity", "150 cP"],
      ["Liquefaction Efficiency", "93.52 %", "good"],
      ["Enzyme Dosing", "4,960 KG"],
    ],
    recycle: [
      ["Thin Slop Recycle", "186 m³", "0.20 %"],
      ["Process Condensate Recycle", "15,420 m³", "16.10 %"],
      ["Fresh Water", "80,240 m³", "83.70 %"],
      ["Total Water", "95,846 m³", "100 %"],
      ["Steam to Liquefaction", "18,420 Ton", "0.74 Ton/KL"],
    ],
    mass: {
      input: [
        ["Starch in Flour", "37,280"],
        ["Enzyme Solids", "112"],
        ["Recycle Solids", "18"],
      ],
      inputTotal: "37,410",
      output: [["Liquified Mash Solids", "37,180"]],
      loss: "230",
      balance: "99.38 %",
    },
    logs: [
      ["Q1", "13,620", "66.2", "11.1", "93.0", "5.70", "150", "32.3", "93.30", "4,520", "42", "3,780", "Ops"],
      ["Q2", "14,080", "66.4", "11.0", "93.2", "5.72", "149", "32.5", "93.55", "4,610", "48", "3,860", "Ops"],
      ["Q3", "14,210", "66.4", "11.0", "93.3", "5.71", "151", "32.5", "93.62", "4,640", "46", "3,890", "Ops"],
      ["Q4", "14,010", "66.4", "11.1", "93.2", "5.71", "150", "32.4", "93.61", "4,650", "50", "3,890", "Ops"],
    ],
    enzyme: [
      ["Q1", "Alpha amylase", "1,210 KG", "Both liquifiers", "Lab"],
      ["Q2", "Alpha amylase", "1,240 KG", "Both liquifiers", "Lab"],
      ["Q3", "Alpha amylase", "1,255 KG", "Both liquifiers", "Lab"],
      ["Q4", "Alpha amylase", "1,255 KG", "Both liquifiers", "Lab"],
    ],
    massHist: [
      ["Q1", "9,180", "9,122", "58", "99.37 %"],
      ["Q2", "9,410", "9,352", "58", "99.38 %"],
      ["Q3", "9,490", "9,432", "58", "99.39 %"],
      ["Q4", "9,330", "9,274", "56", "99.40 %"],
    ],
    alarms: [
      ["Mar", "Info", "Mill-02 standby hours reduced", "—"],
      ["Jul", "Warn", "Starch still below 68 % agreed", "66.35 %"],
    ],
  },
};

const TREND = {
  "24h": {
    labels: ["06:00", "10:00", "14:00", "18:00", "22:00", "02:00"],
    temp: [92.6, 93.0, 93.4, 93.2, 93.1, 93.23],
    ph: [5.68, 5.70, 5.74, 5.72, 5.71, 5.72],
    visc: [146, 149, 154, 152, 151, 152],
    ts: [32.1, 32.3, 32.6, 32.5, 32.4, 32.5],
  },
  "48h": {
    labels: ["26 Apr 14:00", "26 Apr 22:00", "27 Apr 06:00", "27 Apr 14:00", "27 Apr 22:00", "28 Apr 06:00", "28 Apr 14:00"],
    temp: [92.4, 92.8, 93.0, 93.3, 93.1, 92.9, 93.23],
    ph: [5.66, 5.69, 5.71, 5.74, 5.72, 5.70, 5.72],
    visc: [144, 148, 150, 155, 152, 150, 152],
    ts: [32.0, 32.2, 32.4, 32.7, 32.5, 32.3, 32.5],
  },
  "7d": {
    labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    temp: [92.8, 93.0, 93.2, 93.1, 93.4, 93.0, 93.23],
    ph: [5.68, 5.70, 5.72, 5.71, 5.74, 5.70, 5.72],
    visc: [148, 150, 152, 151, 154, 150, 152],
    ts: [32.2, 32.3, 32.5, 32.4, 32.6, 32.3, 32.5],
  },
};

const PERIOD_TREND = {
  "1m": {
    labels: ["W1", "W2", "W3", "W4"],
    temp: [92.8, 93.1, 93.0, 93.1],
    ph: [5.68, 5.72, 5.70, 5.71],
    visc: [148, 151, 150, 150],
    ts: [32.2, 32.5, 32.4, 32.4],
  },
  "2m": {
    labels: ["W1", "W2", "W3", "W4", "W5", "W6", "W7", "W8"],
    temp: [92.6, 92.9, 93.1, 93.0, 93.2, 93.0, 92.9, 93.05],
    ph: [5.67, 5.70, 5.72, 5.71, 5.73, 5.70, 5.69, 5.71],
    visc: [147, 150, 152, 151, 153, 150, 151, 151],
    ts: [32.1, 32.3, 32.5, 32.4, 32.6, 32.4, 32.3, 32.35],
  },
  all: {
    labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    temp: [92.7, 92.9, 93.0, 93.1, 93.2, 93.1, 93.3, 93.2, 93.1, 93.2, 93.0, 93.2],
    ph: [5.68, 5.69, 5.70, 5.71, 5.72, 5.71, 5.73, 5.72, 5.71, 5.72, 5.70, 5.71],
    visc: [148, 149, 150, 151, 152, 150, 153, 151, 150, 151, 149, 150],
    ts: [32.2, 32.3, 32.4, 32.4, 32.5, 32.4, 32.6, 32.5, 32.4, 32.5, 32.3, 32.45],
  },
};

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
      {title || action ? (
        <div className="mb-3 flex items-center justify-between gap-2">
          {title ? <h2 className="text-[13px] font-extrabold tracking-tight text-[#0f2744]">{title}</h2> : <span />}
          {action}
        </div>
      ) : null}
      {children}
    </section>
  );
}

function KvList({ rows }) {
  return (
    <ul className="divide-y divide-stone-100">
      {rows.map((row) => (
        <li key={row[0]} className="flex items-baseline justify-between gap-3 py-1.5">
          <span className="text-[12px] font-semibold text-stone-500">{row[0]}</span>
          <span className={`text-right text-[12px] font-extrabold tabular-nums ${row[2] === "good" ? "text-blue-600" : "text-[#0f2744]"}`}>
            {row[1]}
            {row[2] && row[2] !== "good" ? (
              <span className="ml-1.5 text-[10px] font-bold text-blue-600">{row[2]}</span>
            ) : null}
          </span>
        </li>
      ))}
    </ul>
  );
}

const STATUS = {
  run: "bg-sky-50 text-blue-700",
  wait: "bg-sky-50 text-sky-700",
  auto: "bg-stone-100 text-stone-600",
};

export default function MillingOverviewPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [date, setDate] = useState(todayIso);
  const [shift, setShift] = useState("A");
  const [period, setPeriod] = useState("today");
  const [trendRange, setTrendRange] = useState("48h");
  const [tab, setTab] = useState("logs");
  const [page, setPage] = useState(1);
  const view = VIEWS[period] || VIEWS.today;
  const trend = period === "today" ? TREND[trendRange] || TREND["48h"] : PERIOD_TREND[period] || TREND["48h"];
  const name = firstName(user);
  const initials = name.slice(0, 1).toUpperCase();
  const periodLabel = PERIODS.find((p) => p.value === period)?.label || "Today";

  const logRows = view.logs;
  const pageSize = 5;
  const pages = Math.max(1, Math.ceil(logRows.length / pageSize));
  const shown = logRows.slice((page - 1) * pageSize, page * pageSize);

  const handleExport = () => {
    downloadExcelTable({
      title: "Milling & Liquefaction Overview",
      headers: LOG_HEADS,
      rows: view.logs,
      sheetName: "Milling Liquefaction",
      subtitle: `${periodLabel}  ·  Shift ${shift}`,
    });
  };

  const chartRangeLabel = useMemo(() => {
    if (period === "today") return TREND_RANGES.find((r) => r.value === trendRange)?.label || "48 Hours";
    if (period === "1m") return "Last 4 weeks";
    if (period === "2m") return "Last 8 weeks";
    return "Last 12 months";
  }, [period, trendRange]);

  return (
    <div className="min-h-full bg-stone-250 px-4 py-4 sm:px-6 lg:px-7">
      <header className="mb-4 rounded-2xl border border-stone-200/80 bg-white px-5 py-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#2563eb]">Milling & Liquefaction</p>
            <h1 className="mt-0.5 text-2xl font-black tracking-tight text-[#0f2744]">Milling & Liquefaction Overview</h1>
            <p className="mt-0.5 text-sm font-medium text-stone-500">
              Grain grind, mash cook, recycle, and mass balance in one view.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2.5">
            <DistillerDatePicker value={date} onChange={setDate} compact className="w-[148px]" />
            <DistillerSelect
              value={period}
              onChange={(v) => {
                setPeriod(v);
                setPage(1);
              }}
              options={PERIODS}
              compact
              className="w-[158px]"
            />
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
              onClick={() => navigate("/milling-liquefaction/liquefaction")}
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

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-7">
        {view.kpis.map((k, i) => {
          const meta = KPI_ICONS[i];
          const Icon = meta.icon;
          return (
            <article key={k.title} className="rounded-2xl border border-stone-200/80 bg-white p-3.5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
              <div className="flex items-start justify-between gap-2">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-stone-400">{k.title}</p>
                <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${meta.bg}`}>
                  <Icon size={15} strokeWidth={2.2} />
                </span>
              </div>
              <p className="mt-1 text-[22px] font-black tabular-nums leading-none text-[#0f2744]">
                {k.value}
                <span className="ml-1 text-[11px] font-bold text-stone-400">{k.unit}</span>
              </p>
              <p className="mt-2 text-[10px] font-bold text-stone-400">{k.agreed}</p>
            </article>
          );
        })}
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-4">
        <Card title="Feed & Milling Details">
          <KvList rows={view.feed} />
        </Card>
        <Card title="Liquefaction Parameters">
          <KvList rows={view.liq} />
        </Card>
        <Card title="Recycle & Process Inputs">
          <KvList rows={view.recycle} />
        </Card>
        <Card title="Mass Balance (Liquefaction)">
          <p className="mb-1 text-[10px] font-extrabold uppercase tracking-wider text-stone-400">Input (MT)</p>
          <KvList rows={view.mass.input.map(([n, v]) => [n, v])} />
          <div className="mt-1 flex justify-between border-t border-stone-100 pt-1.5 text-[12px] font-extrabold">
            <span>Total Input</span>
            <span className="tabular-nums">{view.mass.inputTotal}</span>
          </div>
          <p className="mb-1 mt-3 text-[10px] font-extrabold uppercase tracking-wider text-stone-400">Output (MT)</p>
          <KvList rows={view.mass.output} />
          <div className="mt-1 flex justify-between text-[12px] font-bold text-stone-500">
            <span>Losses / Unaccounted</span>
            <span className="tabular-nums">{view.mass.loss}</span>
          </div>
          <div className="mt-3 rounded-xl bg-sky-50 px-3 py-2 text-center text-[12px] font-extrabold text-blue-700">
            Balance: {view.mass.balance}
          </div>
        </Card>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-[1.7fr_0.7fr]">
        <Card
          title="Liquefaction Trend"
          action={
            <div className="flex items-center gap-2">
              {period === "today" ? (
                <DistillerSelect value={trendRange} onChange={setTrendRange} options={TREND_RANGES} compact className="w-[120px]" />
              ) : (
                <span className="text-[10px] font-bold text-stone-400">{chartRangeLabel}</span>
              )}
              <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-stone-200 text-stone-400">
                <Maximize2 size={14} />
              </span>
            </div>
          }
        >
          <div className="mb-1 flex flex-wrap gap-3 text-[10px] font-bold text-stone-500">
            <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-3 rounded-full bg-[#ef4444]" /> Temperature (°C)</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-3 rounded-full bg-[#3b82f6]" /> pH</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-3 rounded-full bg-[#22c55e]" /> Viscosity (cP)</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-3 rounded-full bg-[#f59e0b]" /> Total Solids (%)</span>
          </div>
          <LineChart
            labels={trend.labels}
            series={[
              { label: "Temp", color: "#ef4444", data: trend.temp },
              { label: "pH", color: "#3b82f6", data: trend.ph },
              { label: "Visc", color: "#22c55e", data: trend.visc },
              { label: "TS", color: "#f59e0b", data: trend.ts },
            ]}
          />
        </Card>

        <Card title="Equipment Status">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] font-extrabold uppercase tracking-wider text-stone-400">
                <th className="pb-2">Equipment</th>
                <th className="pb-2">Status</th>
                <th className="pb-2 text-right">Load %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {EQUIPMENT.map((e) => (
                <tr key={e.name}>
                  <td className="py-2 text-[12px] font-bold text-[#0f2744]">{e.name}</td>
                  <td className="py-2">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-extrabold ${STATUS[e.tone]}`}>
                      {e.status}
                    </span>
                  </td>
                  <td className="py-2 text-right text-[12px] font-extrabold tabular-nums">{e.load}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>

      <Card className="mt-3">
        <div className="-mt-1 mb-3 flex flex-wrap gap-1 border-b border-stone-100 pb-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setTab(t.id);
                setPage(1);
              }}
              className={`rounded-lg px-3 py-1.5 text-[12px] font-bold ${
                tab === t.id ? "bg-[#3b74e8] text-white" : "text-stone-500 hover:bg-stone-50"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "logs" ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left">
              <thead>
                <tr className="text-[10px] font-extrabold uppercase tracking-wider text-stone-400">
                  {LOG_HEADS.map((h) => (
                    <th key={h} className="pb-2 pr-3">
                      {h}
                    </th>
                  ))}
                  <th className="pb-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {shown.map((row) => (
                  <tr key={row[0]}>
                    {row.map((cell, i) => (
                      <td key={`${row[0]}-${LOG_HEADS[i]}`} className={`py-2 pr-3 text-[12px] ${i === 0 || i === 12 ? "font-extrabold text-[#0f2744]" : "font-semibold tabular-nums text-stone-700"}`}>
                        {cell}
                      </td>
                    ))}
                    <td className="py-2">
                      <button type="button" className="text-[#3b74e8]" title="View details">
                        <Eye size={15} strokeWidth={2.3} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-3 flex items-center justify-between text-[11px] font-bold text-stone-400">
              <p>
                Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, logRows.length)} of {logRows.length} entries
              </p>
              <div className="flex gap-1">
                <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} className="rounded-lg border border-stone-200 px-2 py-1 hover:bg-stone-50">
                  Prev
                </button>
                <button type="button" onClick={() => setPage((p) => Math.min(pages, p + 1))} className="rounded-lg border border-stone-200 px-2 py-1 hover:bg-stone-50">
                  Next
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {tab === "enzyme" ? (
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] font-extrabold uppercase tracking-wider text-stone-400">
                <th className="pb-2">Time</th>
                <th className="pb-2">Enzyme</th>
                <th className="pb-2">Dose</th>
                <th className="pb-2">Equipment</th>
                <th className="pb-2">Operator</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {view.enzyme.map((r) => (
                <tr key={r[0]}>
                  {r.map((c) => (
                    <td key={c} className="py-2 text-[12px] font-semibold text-stone-700">
                      {c}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}

        {tab === "mass" ? (
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] font-extrabold uppercase tracking-wider text-stone-400">
                <th className="pb-2">Time</th>
                <th className="pb-2 text-right">Input (MT)</th>
                <th className="pb-2 text-right">Output (MT)</th>
                <th className="pb-2 text-right">Loss</th>
                <th className="pb-2 text-right">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {view.massHist.map((r) => (
                <tr key={r[0]}>
                  <td className="py-2 text-[12px] font-extrabold text-[#0f2744]">{r[0]}</td>
                  <td className="py-2 text-right text-[12px] font-semibold tabular-nums">{r[1]}</td>
                  <td className="py-2 text-right text-[12px] font-semibold tabular-nums">{r[2]}</td>
                  <td className="py-2 text-right text-[12px] font-semibold tabular-nums">{r[3]}</td>
                  <td className="py-2 text-right text-[12px] font-extrabold text-blue-600">{r[4]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}

        {tab === "alarms" ? (
          <ul className="space-y-2.5">
            {view.alarms.map((a) => (
              <li key={a[2]} className="flex gap-2.5">
                <span className={`mt-0.5 flex h-6 w-6 items-center justify-center rounded-full ${a[1] === "Warn" ? "bg-amber-100 text-amber-600" : "bg-sky-100 text-sky-600"}`}>
                  <CircleAlert size={13} />
                </span>
                <div>
                  <p className="text-[12px] font-extrabold text-[#0f2744]">{a[2]}</p>
                  <p className="text-[10px] font-bold text-stone-400">
                    {a[0]} · {a[1]} · {a[3]}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </Card>

      <p className="mt-4 flex items-center gap-1.5 pb-2 text-[10px] font-bold text-stone-400">
        <Cog size={12} />
        {user?.organizationName || "Digital Distillery"} · Milling & liquefaction overview
      </p>
    </div>
  );
}
