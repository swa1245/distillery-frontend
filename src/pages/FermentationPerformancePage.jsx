import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Download,
  Droplets,
  Eye,
  FlaskConical,
  Gauge,
  Info,
  Recycle,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Wheat,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import DistillerDatePicker from "../components/DistillerDatePicker";
import DistillerSelect from "../components/DistillerSelect";
import { downloadExcelTable } from "../utils/exportReport";
import { DonutChart, LineChart, StackedHBar } from "../components/dashboard/MiniCharts";

const FERMENTERS = ["F-101", "F-102", "F-103", "F-104", "F-105", "F-106"];
const FEEDSTOCKS = ["Grain (Broken Rice)", "Maize", "Rice", "All Feedstock"];
const BATCH_RANGES = ["Last 10 Batches", "Last 5 Batches", "Last 20 Batches"];
const SHIFTS = ["All Shifts", "Shift A", "Shift B", "Shift C"];
const BYPRODUCTS = [
  { value: "glycerol", label: "Glycerol" },
  { value: "lactic", label: "Lactic Acid" },
  { value: "acetic", label: "Acetic Acid" },
];
const TREND_METRICS = [
  { value: "sg", label: "Specific Gravity (SG)" },
  { value: "temp", label: "Temperature (°C)" },
  { value: "ph", label: "pH" },
];

const BATCH_LABELS = ["B01", "B02", "B03", "B04", "B05", "B06", "B07", "B08", "B09", "B10"];

const EFF = [90.4, 91.2, 92.1, 91.8, 93.0, 92.6, 86.4, 91.5, 92.8, 93.4];
const GLYCEROL = [4.1, 4.3, 4.6, 4.4, 4.8, 5.0, 6.2, 5.1, 4.7, 4.4];
const LACTIC = [0.9, 1.0, 1.1, 1.0, 1.2, 1.3, 2.1, 1.2, 1.1, 1.0];
const ACETIC = [0.6, 0.7, 0.7, 0.8, 0.7, 0.8, 1.1, 0.8, 0.7, 0.7];
const SG = [1.082, 1.074, 1.066, 1.058, 1.05, 1.042, 1.038, 1.03, 1.024, 1.018];
const TEMP = [31.8, 32.0, 32.2, 32.1, 32.4, 32.6, 33.4, 32.3, 32.2, 32.1];
const PH = [4.62, 4.58, 4.54, 4.5, 4.48, 4.46, 4.32, 4.47, 4.48, 4.49];

const SUGAR_BARS = [
  { label: "B01", ethanol: 90.2, byproduct: 5.1, loss: 4.7 },
  { label: "B02", ethanol: 90.8, byproduct: 5.0, loss: 4.2 },
  { label: "B03", ethanol: 91.4, byproduct: 4.8, loss: 3.8 },
  { label: "B04", ethanol: 91.1, byproduct: 5.0, loss: 3.9 },
  { label: "B05", ethanol: 92.0, byproduct: 4.6, loss: 3.4 },
  { label: "B06", ethanol: 91.6, byproduct: 4.9, loss: 3.5 },
  { label: "B07", ethanol: 86.2, byproduct: 7.4, loss: 6.4 },
  { label: "B08", ethanol: 91.3, byproduct: 5.0, loss: 3.7 },
  { label: "B09", ethanol: 92.2, byproduct: 4.6, loss: 3.2 },
  { label: "B10", ethanol: 92.8, byproduct: 4.4, loss: 2.8 },
];

function fmtPct(n) {
  return `${Number(n).toFixed(1)}%`;
}

function sugarBreakdown(batchNo) {
  const bar = SUGAR_BARS.find((b) => b.label === batchNo) || SUGAR_BARS.at(-1);
  const infected = batchNo === "B07";
  const gly = infected ? 3.8 : +(bar.byproduct * 0.636).toFixed(1);
  const lac = infected ? 2.1 : +(bar.byproduct * 0.227).toFixed(1);
  const ace = infected ? 1.1 : +(bar.byproduct * 0.136).toFixed(1);
  const others = +Math.max(0, bar.byproduct - gly - lac - ace).toFixed(1);
  return {
    detail: [
      { name: "Ethanol (Yield)", pct: fmtPct(bar.ethanol), color: "#22c55e" },
      { name: "Glycerol", pct: fmtPct(gly), color: "#f59e0b" },
      { name: "Lactic Acid", pct: fmtPct(lac), color: "#fb923c" },
      { name: "Acetic Acid", pct: fmtPct(ace), color: "#fdba74" },
      { name: "Others", pct: fmtPct(others), color: "#fbbf24" },
      { name: "Unaccounted / Loss", pct: fmtPct(bar.loss), color: "#ef4444" },
    ],
    donut: [
      { label: "Ethanol", value: bar.ethanol, color: "#22c55e" },
      { label: "By-products", value: bar.byproduct, color: "#f59e0b" },
      { label: "Loss", value: bar.loss, color: "#ef4444" },
    ],
  };
}

const TABLE = [
  { no: "B10", start: "24-05-25", end: "02-06-25", hours: 52, iSg: 1.082, fSg: 1.018, etoh: 13.4, eff: 93.4, rs: 0.6, gly: 4.4, lac: 1.0, ace: 0.7, byp: 4.4, loss: 2.8, status: "Completed" },
  { no: "B09", start: "14-05-25", end: "23-05-25", hours: 51, iSg: 1.080, fSg: 1.020, etoh: 13.3, eff: 92.8, rs: 0.7, gly: 4.7, lac: 1.1, ace: 0.7, byp: 4.6, loss: 3.2, status: "Completed" },
  { no: "B08", start: "04-05-25", end: "13-05-25", hours: 53, iSg: 1.078, fSg: 1.022, etoh: 13.1, eff: 91.5, rs: 0.8, gly: 5.1, lac: 1.2, ace: 0.8, byp: 5.0, loss: 3.7, status: "Completed" },
  { no: "B07", start: "24-04-25", end: "03-05-25", hours: 56, iSg: 1.076, fSg: 1.028, etoh: 12.4, eff: 86.4, rs: 1.4, gly: 6.2, lac: 2.1, ace: 1.1, byp: 7.4, loss: 6.4, status: "Alert" },
  { no: "B06", start: "14-04-25", end: "23-04-25", hours: 52, iSg: 1.081, fSg: 1.019, etoh: 13.2, eff: 92.6, rs: 0.7, gly: 5.0, lac: 1.3, ace: 0.8, byp: 4.9, loss: 3.5, status: "Completed" },
  { no: "B05", start: "04-04-25", end: "13-04-25", hours: 50, iSg: 1.083, fSg: 1.017, etoh: 13.5, eff: 93.0, rs: 0.6, gly: 4.8, lac: 1.2, ace: 0.7, byp: 4.6, loss: 3.4, status: "Completed" },
  { no: "B04", start: "25-03-25", end: "03-04-25", hours: 52, iSg: 1.079, fSg: 1.021, etoh: 13.0, eff: 91.8, rs: 0.8, gly: 4.4, lac: 1.0, ace: 0.8, byp: 5.0, loss: 3.9, status: "Completed" },
  { no: "B03", start: "15-03-25", end: "24-03-25", hours: 51, iSg: 1.080, fSg: 1.019, etoh: 13.2, eff: 92.1, rs: 0.7, gly: 4.6, lac: 1.1, ace: 0.7, byp: 4.8, loss: 3.8, status: "Completed" },
  { no: "B02", start: "05-03-25", end: "14-03-25", hours: 53, iSg: 1.078, fSg: 1.023, etoh: 12.9, eff: 91.2, rs: 0.9, gly: 4.3, lac: 1.0, ace: 0.7, byp: 5.0, loss: 4.2, status: "Completed" },
  { no: "B01", start: "23-02-25", end: "04-03-25", hours: 54, iSg: 1.077, fSg: 1.024, etoh: 12.8, eff: 90.4, rs: 0.9, gly: 4.1, lac: 0.9, ace: 0.6, byp: 5.1, loss: 4.7, status: "Completed" },
];

const ALERTS = [
  { level: "high", title: "Efficiency dropped in Batch B07", detail: "86.4% vs 90% target" },
  { level: "warn", title: "Lactic Acid is high in Batch B07", detail: "2.1 g/L — check infection" },
  { level: "warn", title: "Glycerol trend increasing", detail: "Peak 6.2 g/L in B07" },
  { level: "info", title: "Residual sugar above target", detail: "B07 RS 1.4% vs 0.8% typical" },
];

const SUGAR_KEYS = [
  { key: "ethanol", color: "#22c55e", label: "Ethanol (Yield)" },
  { key: "byproduct", color: "#f59e0b", label: "By-products" },
  { key: "loss", color: "#ef4444", label: "Unaccounted / Loss" },
];

function Card({ title, children, action, className = "", id }) {
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

function Field({ label, children }) {
  return (
    <label className="block min-w-[150px] flex-1">
      <span className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-stone-500">{label}</span>
      {children}
    </label>
  );
}

function Delta({ value, invert = false }) {
  const up = value >= 0;
  const good = invert ? !up : up;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[11px] font-extrabold ${good ? "text-emerald-600" : "text-rose-600"}`}>
      <Icon size={12} strokeWidth={2.6} />
      {up ? "+" : "-"}
      {Math.abs(value).toFixed(1)}% vs Prev 10 Batches
    </span>
  );
}

export default function FermentationPerformancePage() {
  const { user } = useAuth();
  const orgName = user?.organizationName || "Digital Distillery";
  const [fermenter, setFermenter] = useState("F-101");
  const [feedstock, setFeedstock] = useState("Grain (Broken Rice)");
  const [batchRange, setBatchRange] = useState("Last 10 Batches");
  const [fromDate, setFromDate] = useState("2025-05-24");
  const [toDate, setToDate] = useState("2025-06-02");
  const [shift, setShift] = useState("All Shifts");
  const [byproduct, setByproduct] = useState("glycerol");
  const [trendMetric, setTrendMetric] = useState("sg");
  const [selectedBatch, setSelectedBatch] = useState("B10");
  const [updatedAt] = useState("02-Jun-2025 10:30 AM");

  const batchCount = batchRange.includes("5") ? 5 : batchRange.includes("20") ? 10 : 10;
  const sliceStart = BATCH_LABELS.length - batchCount;
  const labels = BATCH_LABELS.slice(sliceStart);
  const byproductAll = byproduct === "lactic" ? LACTIC : byproduct === "acetic" ? ACETIC : GLYCEROL;
  const trendAll = trendMetric === "temp" ? TEMP : trendMetric === "ph" ? PH : SG;
  const byproductSeries = byproductAll.slice(sliceStart);
  const trendSeries = trendAll.slice(sliceStart);
  const trendDomain = trendMetric === "sg" ? [1.01, 1.09] : trendMetric === "temp" ? [31, 34] : [4.2, 4.7];
  const sugarBars = SUGAR_BARS.slice(sliceStart);
  const tableRows = TABLE.filter((r) => labels.includes(r.no));
  const activeBatch = labels.includes(selectedBatch) ? selectedBatch : labels.at(-1);
  const { detail, donut } = sugarBreakdown(activeBatch);

  const kpis = useMemo(
    () => [
      { title: "Avg. Fermentation Efficiency", value: "91.8%", icon: FlaskConical, iconBg: "bg-violet-50 text-violet-600", delta: 1.2 },
      { title: "Avg. Ethanol (v/v)", value: "13.2%", icon: Wheat, iconBg: "bg-emerald-50 text-emerald-600", delta: 0.3 },
      { title: "Avg. Productivity", value: "4.8 g/L/h", icon: Gauge, iconBg: "bg-sky-50 text-[#2563eb]", delta: -0.1 },
      { title: "Avg. Residual Sugar", value: "0.8%", icon: Droplets, iconBg: "bg-amber-50 text-amber-600", delta: -0.2 },
      { title: "Sugar Loss (Unaccounted)", value: "4.6%", icon: AlertTriangle, iconBg: "bg-rose-50 text-rose-600", delta: -0.8 },
      { title: "By-product Yield", value: "4.4%", icon: Recycle, iconBg: "bg-teal-50 text-teal-700", delta: -0.3, invert: true },
    ],
    []
  );

  const handleExport = () => {
    downloadExcelTable({
      fileName: `Fermentation_Performance_${fermenter}.xlsx`,
      title: "Fermentation Performance Dashboard",
      companyName: orgName,
      headers: [
        "Batch No.",
        "Start Date",
        "End Date",
        "Fermentation Time (h)",
        "Initial SG",
        "Final SG",
        "Ethanol (% v/v)",
        "Efficiency (%)",
        "Residual Sugar (%)",
        "Glycerol (g/L)",
        "Lactic Acid (g/L)",
        "Acetic Acid (g/L)",
        "By-product (%)",
        "Sugar Loss (%)",
        "Status",
      ],
      rows: tableRows.map((r) => [
        r.no,
        r.start,
        r.end,
        r.hours,
        r.iSg,
        r.fSg,
        r.etoh,
        r.eff,
        r.rs,
        r.gly,
        r.lac,
        r.ace,
        r.byp,
        r.loss,
        r.status,
      ]),
      sheetName: "Performance",
      subtitle: `${fermenter}  ·  ${feedstock}  ·  ${batchRange}  ·  ${shift}`,
    });
  };

  return (
    <div className="min-h-full bg-stone-250 px-4 py-4 sm:px-6 lg:px-7">
      <header className="mb-3 rounded-2xl border border-stone-200/80 bg-white px-5 py-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-[#0f2744] uppercase">
              Fermentation Performance Dashboard
            </h1>
            <p className="mt-0.5 text-sm font-medium text-stone-500">
              Real-time overview of fermenter performance, by-product generation and sugar utilization.
            </p>
          </div>
          <button
            type="button"
            onClick={handleExport}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[#2563eb] px-3 text-[12px] font-bold text-white shadow-sm hover:bg-[#1d4ed8]"
          >
            <Download size={14} strokeWidth={2.4} />
            Export Report
          </button>
        </div>

        <div className="mt-3 flex flex-wrap items-end gap-2.5">
          <Field label="Fermenter">
            <DistillerSelect compact value={fermenter} onChange={setFermenter} options={FERMENTERS} />
          </Field>
          <Field label="Feedstock">
            <DistillerSelect compact value={feedstock} onChange={setFeedstock} options={FEEDSTOCKS} />
          </Field>
          <Field label="Batch Range">
            <DistillerSelect compact value={batchRange} onChange={setBatchRange} options={BATCH_RANGES} />
          </Field>
          <Field label="Date Range">
            <div className="flex items-center gap-1.5">
              <DistillerDatePicker compact value={fromDate} onChange={setFromDate} className="w-[138px]" />
              <span className="text-[11px] font-bold text-stone-400">~</span>
              <DistillerDatePicker compact value={toDate} onChange={setToDate} className="w-[138px]" />
            </div>
          </Field>
          <Field label="Shift">
            <DistillerSelect compact value={shift} onChange={setShift} options={SHIFTS} />
          </Field>
        </div>
        <p className="mt-2 flex items-center justify-end gap-1.5 text-[11px] font-semibold text-stone-400">
          <RefreshCw size={11} />
          Last Updated: {updatedAt}
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-6">
        {kpis.map((k) => (
          <article key={k.title} className="rounded-2xl border border-stone-200/80 bg-white p-3.5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
            <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${k.iconBg}`}>
              <k.icon size={15} />
            </span>
            <p className="mt-2 text-[10px] font-extrabold uppercase tracking-wider text-stone-400">{k.title}</p>
            <p className="mt-1 text-[22px] font-black tabular-nums leading-none text-[#0f2744]">{k.value}</p>
            <p className="mt-1.5">
              <Delta value={k.delta} invert={k.invert} />
            </p>
          </article>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-3">
        <Card title={`Fermentation Efficiency – ${batchRange}`}>
          <LineChart
            labels={labels}
            series={[{ label: "Eff", color: "#2563eb", data: EFF.slice(sliceStart) }]}
            domain={[80, 100]}
            target={90}
            targetLabel="Target (90%)"
            showDots
          />
        </Card>
        <Card
          title={`By-product Generation – ${batchRange}`}
          action={<DistillerSelect compact value={byproduct} onChange={setByproduct} options={BYPRODUCTS} className="w-[140px]" />}
        >
          <LineChart
            labels={labels}
            series={[{ label: "By-product", color: "#7c3aed", data: byproductSeries }]}
            domain={[0, 8]}
            showDots
          />
        </Card>
        <Card
          title={`Process Trends – ${batchRange}`}
          action={<DistillerSelect compact value={trendMetric} onChange={setTrendMetric} options={TREND_METRICS} className="w-[190px]" />}
        >
          <LineChart
            labels={labels}
            series={[{ label: "Trend", color: "#2563eb", data: trendSeries }]}
            domain={trendDomain}
            showDots
          />
        </Card>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-3">
        <Card title={`Sugar Distribution – Batch Wise (${batchRange})`}>
          <div className="mb-2 flex flex-wrap gap-2 text-[10px] font-bold text-stone-500">
            {SUGAR_KEYS.map((k) => (
              <span key={k.key} className="inline-flex items-center gap-1">
                <span className="h-2 w-2 rounded-sm" style={{ background: k.color }} />
                {k.label}
              </span>
            ))}
          </div>
          <StackedHBar rows={sugarBars} keys={SUGAR_KEYS} />
        </Card>

        <Card title={`Sugar Distribution – Batch ${activeBatch} (Details)`}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <DonutChart segments={donut} total={100} centerValue="100%" centerLabel="Total" />
            <div className="min-w-0 flex-1">
              <div className="mb-1.5 flex items-center justify-between text-[9px] font-extrabold uppercase tracking-wider text-stone-400">
                <span>Component</span>
                <span>% of Fermentable Sugar</span>
              </div>
              <ul className="space-y-1.5 text-[11px]">
                {detail.map((row) => (
                  <li key={row.name} className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 font-semibold text-stone-600">
                      <span className="h-2 w-2 rounded-sm" style={{ background: row.color }} />
                      {row.name}
                    </span>
                    <span className="font-extrabold tabular-nums text-[#0f2744]">{row.pct}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Card>

        <Card title="Insights & Alerts">
          <ul className="space-y-2.5">
            {ALERTS.map((a) => (
              <li key={a.title} className="flex gap-2.5">
                <span
                  className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                    a.level === "high"
                      ? "bg-rose-100 text-rose-600"
                      : a.level === "warn"
                        ? "bg-amber-100 text-amber-600"
                        : "bg-sky-100 text-[#2563eb]"
                  }`}
                >
                  {a.level === "info" ? <Info size={12} /> : <AlertTriangle size={12} />}
                </span>
                <div>
                  <p className="text-[12px] font-extrabold text-[#0f2744]">{a.title}</p>
                  <p className="text-[10px] font-semibold text-stone-400">{a.detail}</p>
                </div>
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="mt-3 w-full text-right text-[11px] font-bold text-[#2563eb] hover:underline"
            onClick={() => document.getElementById("batch-comparison")?.scrollIntoView({ behavior: "smooth" })}
          >
            View All Alerts →
          </button>
        </Card>
      </div>

      <Card id="batch-comparison" className="mt-3" title={`Batch Comparison – ${fermenter} (${batchRange})`}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1280px] text-left">
            <thead>
              <tr className="text-[10px] font-extrabold uppercase tracking-wider text-stone-400">
                {[
                  "Batch No.",
                  "Start Date",
                  "End Date",
                  "Ferm. Time (h)",
                  "Initial SG",
                  "Final SG",
                  "Ethanol (% v/v)",
                  "Efficiency (%)",
                  "Residual Sugar (%)",
                  "Glycerol (g/L)",
                  "Lactic Acid (g/L)",
                  "Acetic Acid (g/L)",
                  "By-product (%)",
                  "Sugar Loss (%)",
                  "Status",
                  "Action",
                ].map((h) => (
                  <th key={h} className="pb-2 pr-3 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {tableRows.map((r) => (
                <tr
                  key={r.no}
                  className={`cursor-pointer ${activeBatch === r.no ? "bg-sky-50/70" : "hover:bg-stone-50"}`}
                  onClick={() => setSelectedBatch(r.no)}
                >
                  <td className="py-2 pr-3 text-[12px] font-extrabold text-[#0f2744]">{r.no}</td>
                  <td className="py-2 pr-3 text-[12px] font-semibold tabular-nums text-stone-700">{r.start}</td>
                  <td className="py-2 pr-3 text-[12px] font-semibold tabular-nums text-stone-700">{r.end}</td>
                  <td className="py-2 pr-3 text-[12px] font-semibold tabular-nums text-stone-700">{r.hours}</td>
                  <td className="py-2 pr-3 text-[12px] font-semibold tabular-nums text-stone-700">{r.iSg}</td>
                  <td className="py-2 pr-3 text-[12px] font-semibold tabular-nums text-stone-700">{r.fSg}</td>
                  <td className="py-2 pr-3 text-[12px] font-semibold tabular-nums text-stone-700">{r.etoh}</td>
                  <td className="py-2 pr-3 text-[12px] font-extrabold tabular-nums text-[#0f2744]">{r.eff}</td>
                  <td className="py-2 pr-3 text-[12px] font-semibold tabular-nums text-stone-700">{r.rs}</td>
                  <td className="py-2 pr-3 text-[12px] font-semibold tabular-nums text-stone-700">{r.gly}</td>
                  <td className="py-2 pr-3 text-[12px] font-semibold tabular-nums text-stone-700">{r.lac}</td>
                  <td className="py-2 pr-3 text-[12px] font-semibold tabular-nums text-stone-700">{r.ace}</td>
                  <td className="py-2 pr-3 text-[12px] font-semibold tabular-nums text-stone-700">{r.byp}</td>
                  <td className="py-2 pr-3 text-[12px] font-semibold tabular-nums text-stone-700">{r.loss}</td>
                  <td className="py-2 pr-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-extrabold ${
                        r.status === "Completed" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                      }`}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="py-2 pr-3">
                    <button
                      type="button"
                      className="rounded-md p-1 text-[#2563eb] hover:bg-sky-50"
                      aria-label={`View ${r.no}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedBatch(r.no);
                      }}
                    >
                      <Eye size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-[11px] font-semibold text-stone-400">
          Note: All values are averages/total for selected batch range. Click on any batch to view detailed analysis.
        </p>
      </Card>

      <p className="mt-4 flex items-center gap-1.5 pb-2 text-[10px] font-bold text-stone-400">
        <FlaskConical size={12} />
        {orgName} · Fermentation performance dashboard
      </p>
    </div>
  );
}
