import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Clock3,
  Cog,
  Cylinder,
  Download,
  Droplets,
  Factory,
  FileSpreadsheet,
  FlaskConical,
  RefreshCw,
  Scale,
  Target,
  TestTube2,
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
import { downloadExcelTable } from "../utils/exportReport";
import { LineChart, Sparkline } from "../components/dashboard/MiniCharts";

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

const TABS = [
  { id: "summary", label: "Summary" },
  { id: "fermentation", label: "Fermentation" },
  { id: "distillation", label: "Distillation" },
  { id: "evaporation", label: "Evaporation" },
  { id: "ddgs", label: "DDGS" },
  { id: "utilities", label: "Utilities" },
  { id: "balance", label: "Material Balance" },
];

const SECTION_LINKS = [
  { label: "Liquefaction & Fermentation", to: "/dpr/liquefaction-fermentation", icon: FlaskConical },
  { label: "Distillation", to: "/dpr/distillation", icon: Cylinder },
  { label: "Evaporation Section", to: "/dpr/evaporation", icon: Wind },
  { label: "Decanter Solids", to: "/dpr/decanter-solids", icon: Factory },
  { label: "Chemical Consumption", to: "/dpr/chemical-consumption", icon: TestTube2 },
  { label: "Utilities", to: "/dpr/utilities", icon: Cog },
  { label: "Water Consumption", to: "/dpr/water-consumption", icon: Droplets },
  { label: "Electricity Consumption", to: "/dpr/electricity-consumption", icon: Zap },
  { label: "Plant Running Hours", to: "/dpr/plant-running-hours", icon: Clock3 },
];

const KPI_META = [
  { icon: Droplets, iconBg: "bg-[#e8f0fe] text-[#3b74e8]", goodWhenDown: false },
  { icon: FlaskConical, iconBg: "bg-sky-50 text-[#2563eb]", goodWhenDown: false },
  { icon: Wheat, iconBg: "bg-amber-50 text-amber-600", goodWhenDown: false },
  { icon: Wind, iconBg: "bg-sky-50 text-sky-600", goodWhenDown: true },
  { icon: Zap, iconBg: "bg-yellow-50 text-yellow-600", goodWhenDown: true },
  { icon: Droplets, iconBg: "bg-cyan-50 text-cyan-700", goodWhenDown: true },
];

const FLOW = [
  { name: "Raw Material", icon: Wheat, a: "Grain Distilled", b: "Moisture" },
  { name: "Milling & Liquefaction", icon: Cog, a: "Starch in Flour", b: "Liquefaction Eff." },
  { name: "Fermentation", icon: FlaskConical, a: "Wash Generated", b: "Ethanol (v/v)" },
  { name: "Distillation", icon: Cylinder, a: "AA Produced", b: "Recovery" },
  { name: "Evaporation", icon: Wind, a: "Steam Used", b: "Evap. Efficiency" },
  { name: "DDGS", icon: Factory, a: "DDGS Produced", b: "Moisture" },
];

const VIEWS = {
  today: {
    compareA: "Today",
    compareB: "Yesterday",
    chartRange: "Last 7 days",
    kpis: [
      { title: "AA Production", value: "68.39", unit: "KL", sub: "Target: 70.00 KL", delta: -2.3, spark: [62, 64, 67, 65, 69, 66, 68.39] },
      { title: "Fermentation Efficiency", value: "93.23", unit: "%", sub: "Target: 94.00 %", delta: -0.77, spark: [92.1, 93.4, 94.0, 93.1, 92.8, 93.6, 93.23] },
      { title: "Recovery (L/MT Grain)", value: "441.23", unit: "", sub: "Target: 450.00", delta: -1.95, spark: [438, 442, 448, 444, 440, 446, 441.23] },
      { title: "Steam Consumption", value: "458.35", unit: "MT", sub: "Per KL: 6.31", delta: -1.2, spark: [470, 465, 462, 468, 460, 455, 458.35] },
      { title: "Power Consumption", value: "1,307", unit: "kWh", sub: "Per KL: 18.00", delta: -2.1, spark: [1380, 1340, 1320, 1350, 1310, 1290, 1307] },
      { title: "Water Consumption", value: "580", unit: "m³", sub: "Per KL: 7.99", delta: -3.1, spark: [620, 610, 600, 605, 590, 585, 580] },
    ],
    production: [
      { name: "Crush / Grain Distilled", today: 155.0, yesterday: 148.4, target: 160, unit: "mass", invert: false },
      { name: "AA Production", today: 68.39, yesterday: 70.12, target: 70, unit: "vol", invert: false },
      { name: "Fermentation Efficiency", today: 93.23, yesterday: 94.1, target: 94, unit: "pct", invert: false },
      { name: "Recovery", today: 441.23, yesterday: 448.6, target: 450, unit: "rec", invert: false },
      { name: "Steam (per KL)", today: 6.31, yesterday: 6.39, target: 6.4, unit: "ratio", invert: true },
      { name: "Power (per KL)", today: 18.0, yesterday: 18.38, target: 18.5, unit: "ratio", invert: true },
      { name: "Water (per KL)", today: 7.99, yesterday: 8.24, target: 8.2, unit: "ratio", invert: true },
    ],
    flow: ["155.00 MT", "11.00 %", "66.21 %", "93.23 %", "6,152 m³", "11.32 %", "68.39 KL", "441.23 L/MT", "458.35 MT", "78.12 %", "38.60 MT", "10.80 %"],
    labels: ["22 Apr", "23 Apr", "24 Apr", "25 Apr", "26 Apr", "27 Apr", "28 Apr"],
    aaTrend: [64.2, 66.1, 67.8, 65.4, 69.0, 70.1, 68.39],
    aaTarget: [70, 70, 70, 70, 70, 70, 70],
    steam: [6.42, 6.38, 6.28, 6.45, 6.33, 6.21, 6.31],
    power: [18.8, 18.5, 18.2, 18.6, 18.1, 17.9, 18.0],
    water: [8.4, 8.2, 8.1, 8.3, 8.0, 7.9, 7.99],
    yieldRows: [
      { name: "Fermentation Efficiency", today: "93.23 %", yest: "94.10 %", target: "94.00 %", status: "watch" },
      { name: "Distillation Recovery", today: "441.23", yest: "448.60", target: "450.00", status: "watch" },
      { name: "Overall Plant Efficiency", today: "91.80 %", yest: "92.40 %", target: "93.00 %", status: "watch" },
      { name: "Evaporation Efficiency", today: "78.12 %", yest: "77.40 %", target: "78.00 %", status: "ok" },
    ],
    material: [
      { name: "Grain", in: "156.31 MT", out: "155.00 MT", loss: "1.31 MT", rec: "99.16 %" },
      { name: "Ethanol (AA)", in: "70.12 KL*", out: "68.39 KL", loss: "1.73 KL", rec: "97.53 %" },
      { name: "DDGS", in: "—", out: "38.60 MT", loss: "—", rec: "24.90 %" },
      { name: "CO₂ (est.)", in: "—", out: "52.40 MT", loss: "—", rec: "—" },
    ],
    steamWater: [
      { name: "Steam generated", value: "472.10 MT" },
      { name: "Steam to process", value: "458.35 MT" },
      { name: "Steam loss / vent", value: "13.75 MT" },
      { name: "Fresh water", value: "536.96 m³" },
      { name: "Condensate recycle", value: "43.04 m³" },
      { name: "Total water used", value: "580.00 m³" },
    ],
    deviations: [
      { title: "Low Fermentation Efficiency", detail: "93.23 % vs target 94.00 %", time: "10:18 AM" },
      { title: "AA Production below target", detail: "68.39 KL vs 70.00 KL", time: "09:40 AM" },
      { title: "High Steam Consumption", detail: "6.31 MT/KL vs 6.40 target band", time: "09:10 AM" },
    ],
    note: "Steam consumption slightly high on mash stripper. Recovery lagging target — check spent wash loss. Plant otherwise stable.",
  },
  "1m": {
    compareA: "This month",
    compareB: "Prior month",
    chartRange: "Last 4 weeks",
    kpis: [
      { title: "AA Production", value: "1,986", unit: "KL", sub: "Target: 2,100 KL", delta: -5.43, spark: [480, 502, 495, 509] },
      { title: "Fermentation Efficiency", value: "93.41", unit: "%", sub: "Target: 94.00 %", delta: -0.63, spark: [92.8, 93.2, 93.6, 93.41] },
      { title: "Recovery (L/MT Grain)", value: "443.10", unit: "", sub: "Target: 450.00", delta: -1.53, spark: [439, 442, 445, 443.1] },
      { title: "Steam Consumption", value: "12,540", unit: "MT", sub: "Per KL: 6.31", delta: -1.8, spark: [3180, 3120, 3090, 3150] },
      { title: "Power Consumption", value: "35,820", unit: "kWh", sub: "Per KL: 18.04", delta: -2.4, spark: [9100, 8920, 8780, 9020] },
      { title: "Water Consumption", value: "15,860", unit: "m³", sub: "Per KL: 7.98", delta: -2.9, spark: [4120, 3980, 3890, 3870] },
    ],
    production: [
      { name: "Crush / Grain Distilled", today: 4480, yesterday: 4210, target: 4650, unit: "mass", invert: false },
      { name: "AA Production", today: 1986, yesterday: 2040, target: 2100, unit: "vol", invert: false },
      { name: "Fermentation Efficiency", today: 93.41, yesterday: 93.88, target: 94, unit: "pct", invert: false },
      { name: "Recovery", today: 443.1, yesterday: 448.2, target: 450, unit: "rec", invert: false },
      { name: "Steam (per KL)", today: 6.31, yesterday: 6.42, target: 6.4, unit: "ratio", invert: true },
      { name: "Power (per KL)", today: 18.04, yesterday: 18.46, target: 18.5, unit: "ratio", invert: true },
      { name: "Water (per KL)", today: 7.98, yesterday: 8.22, target: 8.2, unit: "ratio", invert: true },
    ],
    flow: ["4,480 MT", "11.10 %", "66.40 %", "93.41 %", "178,400 m³", "11.28 %", "1,986 KL", "443.10 L/MT", "12,540 MT", "78.40 %", "1,102 MT", "10.60 %"],
    labels: ["W1", "W2", "W3", "W4"],
    aaTrend: [478, 502, 496, 510],
    aaTarget: [525, 525, 525, 525],
    steam: [6.44, 6.36, 6.28, 6.31],
    power: [18.5, 18.2, 17.95, 18.04],
    water: [8.2, 8.05, 7.94, 7.98],
    yieldRows: [
      { name: "Fermentation Efficiency", today: "93.41 %", yest: "93.88 %", target: "94.00 %", status: "watch" },
      { name: "Distillation Recovery", today: "443.10", yest: "448.20", target: "450.00", status: "watch" },
      { name: "Overall Plant Efficiency", today: "92.10 %", yest: "92.60 %", target: "93.00 %", status: "watch" },
      { name: "Evaporation Efficiency", today: "78.40 %", yest: "77.90 %", target: "78.00 %", status: "ok" },
    ],
    material: [
      { name: "Grain", in: "4,518 MT", out: "4,480 MT", loss: "38 MT", rec: "99.16 %" },
      { name: "Ethanol (AA)", in: "2,040 KL*", out: "1,986 KL", loss: "54 KL", rec: "97.35 %" },
      { name: "DDGS", in: "—", out: "1,102 MT", loss: "—", rec: "24.60 %" },
      { name: "CO₂ (est.)", in: "—", out: "1,520 MT", loss: "—", rec: "—" },
    ],
    steamWater: [
      { name: "Steam generated", value: "12,910 MT" },
      { name: "Steam to process", value: "12,540 MT" },
      { name: "Steam loss / vent", value: "370 MT" },
      { name: "Fresh water", value: "14,612 m³" },
      { name: "Condensate recycle", value: "1,248 m³" },
      { name: "Total water used", value: "15,860 m³" },
    ],
    deviations: [
      { title: "Monthly AA below target", detail: "1,986 KL vs 2,100 KL", time: "Week 4" },
      { title: "Recovery lagging 450 L/MT", detail: "443.10 L/MT", time: "Week 3" },
    ],
    note: "Month close: crush on plan, AA short of 2,100 KL. Steam per KL improved vs prior month.",
  },
  "2m": {
    compareA: "Last 2 months",
    compareB: "Prior 2 months",
    chartRange: "Last 8 weeks",
    kpis: [
      { title: "AA Production", value: "4,012", unit: "KL", sub: "Target: 4,200 KL", delta: -4.48, spark: [480, 502, 495, 509, 498, 512, 505, 511] },
      { title: "Fermentation Efficiency", value: "93.18", unit: "%", sub: "Target: 94.00 %", delta: -0.87, spark: [92.6, 93.0, 93.4, 93.1, 92.9, 93.5, 93.2, 93.18] },
      { title: "Recovery (L/MT Grain)", value: "442.05", unit: "", sub: "Target: 450.00", delta: -1.77, spark: [438, 441, 444, 442, 440, 445, 443, 442] },
      { title: "Steam Consumption", value: "25,310", unit: "MT", sub: "Per KL: 6.31", delta: -1.4, spark: [3180, 3120, 3090, 3150, 3110, 3080, 3140, 3160] },
      { title: "Power Consumption", value: "72,440", unit: "kWh", sub: "Per KL: 18.06", delta: -1.9, spark: [9100, 8920, 8780, 9020, 8880, 8740, 8960, 9040] },
      { title: "Water Consumption", value: "32,080", unit: "m³", sub: "Per KL: 8.00", delta: -2.2, spark: [4120, 3980, 3890, 3870, 4010, 3920, 4050, 3980] },
    ],
    production: [
      { name: "Crush / Grain Distilled", today: 9070, yesterday: 8640, target: 9300, unit: "mass", invert: false },
      { name: "AA Production", today: 4012, yesterday: 4180, target: 4200, unit: "vol", invert: false },
      { name: "Fermentation Efficiency", today: 93.18, yesterday: 93.72, target: 94, unit: "pct", invert: false },
      { name: "Recovery", today: 442.05, yesterday: 447.8, target: 450, unit: "rec", invert: false },
      { name: "Steam (per KL)", today: 6.31, yesterday: 6.4, target: 6.4, unit: "ratio", invert: true },
      { name: "Power (per KL)", today: 18.06, yesterday: 18.41, target: 18.5, unit: "ratio", invert: true },
      { name: "Water (per KL)", today: 8.0, yesterday: 8.18, target: 8.2, unit: "ratio", invert: true },
    ],
    flow: ["9,070 MT", "11.08 %", "66.28 %", "93.18 %", "360,200 m³", "11.24 %", "4,012 KL", "442.05 L/MT", "25,310 MT", "78.20 %", "2,210 MT", "10.70 %"],
    labels: ["W1", "W2", "W3", "W4", "W5", "W6", "W7", "W8"],
    aaTrend: [478, 502, 496, 510, 498, 514, 506, 511],
    aaTarget: [525, 525, 525, 525, 525, 525, 525, 525],
    steam: [6.44, 6.36, 6.28, 6.31, 6.38, 6.24, 6.29, 6.31],
    power: [18.55, 18.22, 17.98, 18.04, 18.3, 17.9, 18.1, 18.06],
    water: [8.22, 8.08, 7.96, 8.0, 8.12, 7.94, 8.02, 8.0],
    yieldRows: [
      { name: "Fermentation Efficiency", today: "93.18 %", yest: "93.72 %", target: "94.00 %", status: "watch" },
      { name: "Distillation Recovery", today: "442.05", yest: "447.80", target: "450.00", status: "watch" },
      { name: "Overall Plant Efficiency", today: "91.90 %", yest: "92.50 %", target: "93.00 %", status: "watch" },
      { name: "Evaporation Efficiency", today: "78.20 %", yest: "77.80 %", target: "78.00 %", status: "ok" },
    ],
    material: [
      { name: "Grain", in: "9,148 MT", out: "9,070 MT", loss: "78 MT", rec: "99.15 %" },
      { name: "Ethanol (AA)", in: "4,180 KL*", out: "4,012 KL", loss: "168 KL", rec: "95.98 %" },
      { name: "DDGS", in: "—", out: "2,210 MT", loss: "—", rec: "24.40 %" },
      { name: "CO₂ (est.)", in: "—", out: "3,070 MT", loss: "—", rec: "—" },
    ],
    steamWater: [
      { name: "Steam generated", value: "26,080 MT" },
      { name: "Steam to process", value: "25,310 MT" },
      { name: "Steam loss / vent", value: "770 MT" },
      { name: "Fresh water", value: "29,570 m³" },
      { name: "Condensate recycle", value: "2,510 m³" },
      { name: "Total water used", value: "32,080 m³" },
    ],
    deviations: [
      { title: "Two-month AA short of 4,200 KL", detail: "4,012 KL produced", time: "W8" },
      { title: "Fermentation efficiency below 94 %", detail: "93.18 % average", time: "W7" },
    ],
    note: "Two-month window: utilities per KL improved; AA and recovery still the main gaps to target.",
  },
  all: {
    compareA: "All time",
    compareB: "Last 12 months",
    chartRange: "Last 12 months",
    kpis: [
      { title: "AA Production", value: "24,860", unit: "KL", sub: "Avg / month: 2,072 KL", delta: 3.12, spark: [1980, 2040, 2010, 2110, 2060, 2090, 2140, 2080, 2160, 2120, 2180, 2072] },
      { title: "Fermentation Efficiency", value: "93.52", unit: "%", sub: "Target: 94.00 %", delta: -0.51, spark: [92.9, 93.1, 93.4, 93.6, 93.3, 93.7, 93.5, 93.8, 93.4, 93.6, 93.9, 93.52] },
      { title: "Recovery (L/MT Grain)", value: "444.80", unit: "", sub: "Target: 450.00", delta: -1.16, spark: [438, 440, 442, 445, 443, 446, 444, 447, 445, 446, 448, 444.8] },
      { title: "Steam Consumption", value: "156,400", unit: "MT", sub: "Per KL: 6.29", delta: -2.1, spark: [13200, 12980, 12840, 13110, 12920, 12780, 13040, 12860, 12720, 12950, 12680, 12810] },
      { title: "Power Consumption", value: "447,200", unit: "kWh", sub: "Per KL: 17.99", delta: -2.6, spark: [38200, 37600, 37100, 37900, 37400, 36800, 37700, 37200, 36600, 37500, 36400, 37000] },
      { title: "Water Consumption", value: "198,500", unit: "m³", sub: "Per KL: 7.98", delta: -3.4, spark: [17100, 16800, 16500, 16950, 16640, 16380, 16820, 16520, 16240, 16700, 16180, 16440] },
    ],
    production: [
      { name: "Crush / Grain Distilled", today: 55920, yesterday: 52410, target: 54000, unit: "mass", invert: false },
      { name: "AA Production", today: 24860, yesterday: 24110, target: 25200, unit: "vol", invert: false },
      { name: "Fermentation Efficiency", today: 93.52, yesterday: 93.18, target: 94, unit: "pct", invert: false },
      { name: "Recovery", today: 444.8, yesterday: 441.2, target: 450, unit: "rec", invert: false },
      { name: "Steam (per KL)", today: 6.29, yesterday: 6.42, target: 6.4, unit: "ratio", invert: true },
      { name: "Power (per KL)", today: 17.99, yesterday: 18.46, target: 18.5, unit: "ratio", invert: true },
      { name: "Water (per KL)", today: 7.98, yesterday: 8.26, target: 8.2, unit: "ratio", invert: true },
    ],
    flow: ["55,920 MT", "11.05 %", "66.35 %", "93.52 %", "2.21 Mm³", "11.30 %", "24,860 KL", "444.80 L/MT", "156,400 MT", "78.50 %", "13,580 MT", "10.50 %"],
    labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    aaTrend: [1980, 2040, 2010, 2110, 2060, 2090, 2140, 2080, 2160, 2120, 2180, 2072],
    aaTarget: [2100, 2100, 2100, 2100, 2100, 2100, 2100, 2100, 2100, 2100, 2100, 2100],
    steam: [6.48, 6.42, 6.38, 6.35, 6.33, 6.31, 6.3, 6.28, 6.27, 6.29, 6.26, 6.29],
    power: [18.6, 18.42, 18.28, 18.18, 18.1, 18.04, 18.0, 17.96, 17.94, 18.02, 17.9, 17.99],
    water: [8.28, 8.18, 8.12, 8.08, 8.04, 8.0, 7.98, 7.96, 7.94, 7.99, 7.92, 7.98],
    yieldRows: [
      { name: "Fermentation Efficiency", today: "93.52 %", yest: "93.18 %", target: "94.00 %", status: "ok" },
      { name: "Distillation Recovery", today: "444.80", yest: "441.20", target: "450.00", status: "watch" },
      { name: "Overall Plant Efficiency", today: "92.80 %", yest: "92.10 %", target: "93.00 %", status: "ok" },
      { name: "Evaporation Efficiency", today: "78.50 %", yest: "78.10 %", target: "78.00 %", status: "ok" },
    ],
    material: [
      { name: "Grain", in: "56,410 MT", out: "55,920 MT", loss: "490 MT", rec: "99.13 %" },
      { name: "Ethanol (AA)", in: "25,200 KL*", out: "24,860 KL", loss: "340 KL", rec: "98.65 %" },
      { name: "DDGS", in: "—", out: "13,580 MT", loss: "—", rec: "24.30 %" },
      { name: "CO₂ (est.)", in: "—", out: "19,040 MT", loss: "—", rec: "—" },
    ],
    steamWater: [
      { name: "Steam generated", value: "161,200 MT" },
      { name: "Steam to process", value: "156,400 MT" },
      { name: "Steam loss / vent", value: "4,800 MT" },
      { name: "Fresh water", value: "183,080 m³" },
      { name: "Condensate recycle", value: "15,420 m³" },
      { name: "Total water used", value: "198,500 m³" },
    ],
    deviations: [
      { title: "Lifetime recovery still below 450", detail: "444.80 L/MT", time: "YTD" },
      { title: "Utilities per KL improved vs last year", detail: "Steam 6.29 · Power 17.99", time: "YTD" },
    ],
    note: "Lifetime DPR: utilities trending down per KL. Recovery is the open gap to 450 L/MT grain.",
  },
};

function fmt(n, digits = 2) {
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("en-IN", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

function pct(actual, target, invert) {
  if (!target) return 0;
  const p = invert ? (target / actual) * 100 : (actual / target) * 100;
  return Math.round(p * 100) / 100;
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

function displayMass(n, unit) {
  if (unit === "KL") return `${fmt(n * 1.25)} KL`;
  return `${fmt(n)} MT`;
}

export default function DprOverviewPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [date, setDate] = useState(todayIso);
  const [shift, setShift] = useState("A");
  const [period, setPeriod] = useState("today");
  const [tab, setTab] = useState("summary");
  const [massUnit, setMassUnit] = useState("MT");
  const [flash, setFlash] = useState("");
  const view = VIEWS[period] || VIEWS.today;
  const org = user?.organizationName || "Digital Distillery";
  const calculated = useMemo(
    () =>
      new Date().toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    []
  );

  const ping = (msg) => {
    setFlash(msg);
    window.setTimeout(() => setFlash(""), 2200);
  };

  const exportRows = view.production.map((r) => {
    const ach = pct(r.today, r.target, r.invert);
    return [r.name, fmt(r.today), fmt(r.yesterday), fmt(r.today - r.yesterday), fmt(r.target), `${fmt(ach)} %`];
  });

  const handleExport = (kind) => {
    downloadExcelTable({
      fileName: `DPR_${date}_Shift${shift}_${kind === "dpr" ? "Report" : "Excel"}`,
      title: kind === "dpr" ? "Daily Production Report" : "DPR Export",
      companyName: org,
      headers: ["Parameter", view.compareA, view.compareB, "Change", "Target", "Achievement %"],
      rows: exportRows,
      sheetName: "DPR",
      subtitle: `${PERIODS.find((p) => p.value === period)?.label}  ·  Shift ${shift}  ·  ${massUnit}`,
    });
    ping(kind === "dpr" ? "DPR downloaded." : "Excel exported.");
  };

  const grainLabel = (n) => displayMass(n, massUnit);

  return (
    <div className="min-h-full bg-stone-250 px-4 py-4 sm:px-6 lg:px-7 print:bg-white print:p-0">
      <header className="mb-4 rounded-2xl border border-stone-200/80 bg-white px-5 py-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)] print:shadow-none">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#2563eb]">DPR</p>
            <h1 className="mt-0.5 text-2xl font-black tracking-tight text-[#0f2744]">Daily Production Report (DPR)</h1>
            <p className="mt-0.5 text-sm font-medium text-stone-500">Real-time production, consumption, yield & efficiency summary.</p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2.5 print:hidden">
            <DistillerDatePicker value={date} onChange={setDate} compact className="w-[148px]" />
            <DistillerSelect value={period} onChange={setPeriod} options={PERIODS} compact className="w-[158px]" />
            <DistillerSelect value={shift} onChange={setShift} options={SHIFTS} compact className="w-[210px]" />
            <button type="button" onClick={() => handleExport("dpr")} className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-sky-200 bg-white px-3 text-[12px] font-bold text-[#3b74e8] hover:bg-sky-50">
              <Download size={14} /> Download DPR
            </button>
            <button type="button" onClick={() => handleExport("xlsx")} className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[#3b74e8] px-3 text-[12px] font-bold text-white shadow-sm hover:bg-[#2f63d4]">
              <FileSpreadsheet size={14} /> Export Excel
            </button>
          </div>
        </div>
        {flash ? <p className="mt-2 text-right text-[11px] font-bold text-[#3b74e8] print:hidden">{flash}</p> : null}
      </header>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-6">
        {view.kpis.map((k, i) => {
          const meta = KPI_META[i];
          const Icon = meta.icon;
          const good = meta.goodWhenDown ? k.delta < 0 : k.delta > 0;
          return (
            <article key={k.title} className="rounded-2xl border border-stone-200/80 bg-white p-3.5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
              <div className="flex items-start justify-between gap-2">
                <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${meta.iconBg}`}>
                  <Icon size={15} strokeWidth={2.2} />
                </span>
                <Change value={k.delta} invert={meta.goodWhenDown} />
              </div>
              <p className="mt-2 text-[10px] font-extrabold uppercase tracking-wider text-stone-400">{k.title}</p>
              <p className="mt-0.5 text-[22px] font-black tabular-nums leading-none text-[#0f2744]">
                {k.value}
                {k.unit ? <span className="ml-1 text-[11px] font-bold text-stone-400">{k.unit}</span> : null}
              </p>
              <p className="mt-1 text-[10px] font-bold text-stone-400">{k.sub}</p>
              <Sparkline data={k.spark} color={good ? "#22c55e" : "#3b82f6"} fill={good ? "rgba(34,197,94,0.12)" : "rgba(59,130,246,0.12)"} />
            </article>
          );
        })}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-9 print:hidden">
        {SECTION_LINKS.map((s) => {
          const Icon = s.icon;
          return (
            <button
              key={s.to}
              type="button"
              onClick={() => navigate(s.to)}
              className="flex flex-col items-center gap-1.5 rounded-2xl border border-stone-200/80 bg-white px-2 py-3 text-center shadow-[0_8px_24px_rgba(15,23,42,0.04)] hover:border-[#3b74e8]/40"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#e8f0fe] text-[#2563eb]">
                <Icon size={15} />
              </span>
              <span className="text-[10px] font-extrabold leading-tight text-[#0f2744]">{s.label}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 print:hidden">
        <div className="flex flex-wrap gap-1 rounded-xl border border-stone-200 bg-white p-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`rounded-lg px-3 py-1.5 text-[12px] font-bold ${tab === t.id ? "bg-[#3b74e8] text-white" : "text-stone-500 hover:bg-stone-50"}`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="inline-flex rounded-xl border border-stone-200 bg-white p-0.5">
          {["MT", "KL"].map((u) => (
            <button
              key={u}
              type="button"
              onClick={() => setMassUnit(u)}
              className={`rounded-lg px-3 py-1.5 text-[12px] font-extrabold ${massUnit === u ? "bg-[#0f2744] text-white" : "text-stone-500"}`}
            >
              {u}
            </button>
          ))}
        </div>
      </div>

      {tab === "summary" || tab === "balance" ? (
        <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-[1.25fr_1fr]">
          <Card title="Production Summary" action={<span className="text-[10px] font-bold text-stone-400">{view.compareA} vs {view.compareB}</span>}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-left">
                <thead>
                  <tr className="text-[10px] font-extrabold uppercase tracking-wider text-stone-400">
                    <th className="pb-2">Parameter</th>
                    <th className="pb-2 text-right">{view.compareA}</th>
                    <th className="pb-2 text-right">{view.compareB}</th>
                    <th className="pb-2 text-right">Change</th>
                    <th className="pb-2 text-right">Target</th>
                    <th className="pb-2 text-right">Ach. %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {view.production.map((r) => {
                    const ach = pct(r.today, r.target, r.invert);
                    const show = r.unit === "mass" ? grainLabel(r.today) : r.unit === "vol" ? `${fmt(r.today)} KL` : r.unit === "pct" ? `${fmt(r.today)} %` : fmt(r.today);
                    const showY = r.unit === "mass" ? grainLabel(r.yesterday) : r.unit === "vol" ? `${fmt(r.yesterday)} KL` : r.unit === "pct" ? `${fmt(r.yesterday)} %` : fmt(r.yesterday);
                    const chg = ((r.today - r.yesterday) / (r.yesterday || 1)) * 100;
                    return (
                      <tr key={r.name}>
                        <td className="py-1.5 text-[12px] font-bold text-[#0f2744]">{r.name}</td>
                        <td className="py-1.5 text-right text-[12px] font-extrabold tabular-nums">{show}</td>
                        <td className="py-1.5 text-right text-[12px] font-semibold tabular-nums text-stone-500">{showY}</td>
                        <td className="py-1.5 text-right">
                          <Change value={chg} invert={r.invert} />
                        </td>
                        <td className="py-1.5 text-right text-[12px] font-semibold tabular-nums text-stone-500">
                          {r.unit === "mass" ? grainLabel(r.target) : r.unit === "vol" ? `${fmt(r.target)} KL` : r.unit === "pct" ? `${fmt(r.target)} %` : fmt(r.target)}
                        </td>
                        <td className={`py-1.5 text-right text-[12px] font-extrabold tabular-nums ${ach >= 100 ? "text-blue-600" : "text-rose-500"}`}>
                          {fmt(ach)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          <Card title="Process Flow — Snapshot">
            <ol className="space-y-0">
              {FLOW.map((s, i) => {
                const Icon = s.icon;
                const a = view.flow[i * 2];
                const b = view.flow[i * 2 + 1];
                const last = i === FLOW.length - 1;
                return (
                  <li key={s.name} className="flex gap-3">
                    <div className="flex w-8 flex-col items-center">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#eef3f9] text-[#2563eb]">
                        <Icon size={14} strokeWidth={2.2} />
                      </span>
                      {last ? null : <span className="my-0.5 w-px min-h-[18px] flex-1 bg-sky-100" />}
                    </div>
                    <div className={last ? "" : "pb-3"}>
                      <p className="text-[12px] font-extrabold text-[#0f2744]">{s.name}</p>
                      <p className="text-[11px] font-semibold text-stone-500">
                        {s.a}: {a}
                        <span className="mx-1 text-stone-300">·</span>
                        {s.b}: {b}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </Card>
        </div>
      ) : null}

      {tab === "summary" ? (
        <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-3">
          <Card title="AA Production Trend" action={<span className="text-[10px] font-bold text-stone-400">{view.chartRange}</span>}>
            <div className="mb-1 flex gap-3 text-[10px] font-bold text-stone-500">
              <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-3 rounded-full bg-[#3b82f6]" /> Actual</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-3 rounded-full bg-stone-300" /> Target</span>
            </div>
            <LineChart
              labels={view.labels}
              series={[
                { label: "AA", color: "#3b82f6", data: view.aaTrend },
                { label: "Target", color: "#cbd5e1", data: view.aaTarget },
              ]}
            />
          </Card>
          <Card title="Consumption Trend (Per KL AA)" action={<span className="text-[10px] font-bold text-stone-400">{view.chartRange}</span>}>
            <div className="mb-1 flex flex-wrap gap-3 text-[10px] font-bold text-stone-500">
              <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-3 rounded-full bg-sky-500" /> Steam</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-3 rounded-full bg-yellow-500" /> Power</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-3 rounded-full bg-cyan-600" /> Water</span>
            </div>
            <LineChart
              labels={view.labels}
              series={[
                { label: "Steam", color: "#0ea5e9", data: view.steam },
                { label: "Power", color: "#eab308", data: view.power },
                { label: "Water", color: "#0891b2", data: view.water },
              ]}
            />
          </Card>
          <Card title="Yield & Efficiency">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] font-extrabold uppercase tracking-wider text-stone-400">
                  <th className="pb-2">Parameter</th>
                  <th className="pb-2 text-right">{view.compareA}</th>
                  <th className="pb-2 text-right">Target</th>
                  <th className="pb-2 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {view.yieldRows.map((r) => (
                  <tr key={r.name}>
                    <td className="py-1.5 text-[12px] font-bold text-[#0f2744]">{r.name}</td>
                    <td className="py-1.5 text-right text-[12px] font-extrabold tabular-nums">{r.today}</td>
                    <td className="py-1.5 text-right text-[12px] font-semibold text-stone-500">{r.target}</td>
                    <td className="py-1.5 text-right">
                      <span className={`inline-block h-2.5 w-2.5 rounded-full ${r.status === "ok" ? "bg-sky-500" : "bg-amber-400"}`} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      ) : null}

      {tab === "fermentation" ? (
        <Card className="mt-3" title="Fermentation DPR">
          <p className="mb-3 text-[12px] font-semibold text-stone-500">Wash generated {view.flow[4]} · Ethanol {view.flow[5]} · Efficiency {view.kpis[1].value}%</p>
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] font-extrabold uppercase tracking-wider text-stone-400">
                <th className="pb-2">Parameter</th>
                <th className="pb-2 text-right">{view.compareA}</th>
                <th className="pb-2 text-right">Target</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {view.production.filter((r) => /Fermentation|Crush|AA/.test(r.name)).map((r) => (
                <tr key={r.name}>
                  <td className="py-2 text-[12px] font-bold">{r.name}</td>
                  <td className="py-2 text-right text-[12px] font-extrabold tabular-nums">{fmt(r.today)}</td>
                  <td className="py-2 text-right text-[12px] font-semibold text-stone-500">{fmt(r.target)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ) : null}

      {tab === "distillation" ? (
        <Card className="mt-3" title="Distillation DPR">
          <p className="mb-3 text-[12px] font-semibold text-stone-500">AA {view.flow[6]} · Recovery {view.flow[7]}</p>
          <LineChart
            labels={view.labels}
            series={[
              { label: "AA", color: "#3b82f6", data: view.aaTrend },
              { label: "Target", color: "#cbd5e1", data: view.aaTarget },
            ]}
          />
        </Card>
      ) : null}

      {tab === "evaporation" ? (
        <Card className="mt-3" title="Evaporation DPR">
          <p className="text-[12px] font-semibold text-stone-600">Steam used {view.flow[8]} · Evaporation efficiency {view.flow[9]}</p>
        </Card>
      ) : null}

      {tab === "ddgs" ? (
        <Card className="mt-3" title="DDGS DPR">
          <p className="text-[12px] font-semibold text-stone-600">DDGS produced {view.flow[10]} · Moisture {view.flow[11]}</p>
        </Card>
      ) : null}

      {tab === "utilities" ? (
        <Card className="mt-3" title="Utilities DPR">
          <LineChart
            labels={view.labels}
            series={[
              { label: "Steam", color: "#0ea5e9", data: view.steam },
              { label: "Power", color: "#eab308", data: view.power },
              { label: "Water", color: "#0891b2", data: view.water },
            ]}
          />
        </Card>
      ) : null}

      {tab === "summary" || tab === "balance" ? (
        <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
          <Card title={`Material Balance (${view.compareA})`}>
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] font-extrabold uppercase tracking-wider text-stone-400">
                  <th className="pb-2">Stream</th>
                  <th className="pb-2 text-right">Input</th>
                  <th className="pb-2 text-right">Output</th>
                  <th className="pb-2 text-right">Loss</th>
                  <th className="pb-2 text-right">Recovery</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {view.material.map((r) => (
                  <tr key={r.name}>
                    <td className="py-1.5 text-[12px] font-bold text-[#0f2744]">{r.name}</td>
                    <td className="py-1.5 text-right text-[12px] font-semibold tabular-nums">{r.in}</td>
                    <td className="py-1.5 text-right text-[12px] font-semibold tabular-nums">{r.out}</td>
                    <td className="py-1.5 text-right text-[12px] font-semibold tabular-nums">{r.loss}</td>
                    <td className="py-1.5 text-right text-[12px] font-extrabold text-[#2563eb]">{r.rec}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-[10px] font-bold text-stone-400">* Theoretical input from mash alcohol.</p>
          </Card>
          <Card title={`Steam & Water Balance (${view.compareA})`}>
            <ul className="divide-y divide-stone-100">
              {view.steamWater.map((r) => (
                <li key={r.name} className="flex justify-between py-1.5 text-[12px]">
                  <span className="font-semibold text-stone-500">{r.name}</span>
                  <span className="font-extrabold tabular-nums text-[#0f2744]">{r.value}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      ) : null}

      {tab === "summary" ? (
        <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-3">
          <Card title="Top Deviations">
            <ul className="space-y-2.5">
              {view.deviations.map((d) => (
                <li key={d.title}>
                  <p className="text-[12px] font-extrabold text-[#0f2744]">{d.title}</p>
                  <p className="text-[10px] font-semibold text-stone-400">
                    {d.detail} · {d.time}
                  </p>
                </li>
              ))}
            </ul>
          </Card>
          <Card title="Manager Notes">
            <p className="text-[12px] font-semibold leading-relaxed text-stone-700">{view.note}</p>
            <p className="mt-3 text-[10px] font-bold text-stone-400">— {user?.username || "Shift incharge"}</p>
          </Card>
          <Card title="Quick Actions">
            <div className="grid grid-cols-2 gap-2 print:hidden">
              {[
                { label: "Add Manual Entry", icon: Scale, go: () => navigate("/dpr/liquefaction-fermentation") },
                { label: "Adjust Target", icon: Target, go: () => ping("Targets stay on this DPR until a plant settings page is added.") },
                { label: "Recalculate DPR", icon: RefreshCw, go: () => ping(`Recalculated ${calculated}.`) },
                { label: "Compare Shifts", icon: FlaskConical, go: () => ping("Shift compare uses the shift filter above.") },
                { label: "View Logs", icon: FileSpreadsheet, go: () => navigate("/laboratory/register") },
                { label: "Download DPR", icon: Download, go: () => handleExport("dpr") },
              ].map((a) => {
                const Icon = a.icon;
                return (
                  <button
                    key={a.label}
                    type="button"
                    onClick={a.go}
                    className="flex items-center gap-2 rounded-xl border border-stone-200 bg-[#f8fafc] px-3 py-2.5 text-left hover:border-[#3b74e8]/40"
                  >
                    <Icon size={14} className="text-[#3b74e8]" />
                    <span className="text-[11px] font-extrabold text-[#0f2744]">{a.label}</span>
                  </button>
                );
              })}
            </div>
          </Card>
        </div>
      ) : null}

      <p className="mt-4 pb-2 text-[10px] font-bold text-stone-400">
        {org} · Values are calculated from process logs. Last calculated: {calculated}
      </p>
    </div>
  );
}
