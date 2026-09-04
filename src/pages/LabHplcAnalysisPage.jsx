import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  Download,
  Plus,
  TestTube2,
  TrendingDown,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import DistillerDatePicker from "../components/DistillerDatePicker";
import DistillerSelect from "../components/DistillerSelect";
import { LineChart, Sparkline } from "../components/dashboard/MiniCharts";
import { downloadExcelTable } from "../utils/exportReport";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "sugars", label: "Sugars (DP Analysis)" },
  { id: "byproducts", label: "By-Products" },
  { id: "chromatograms", label: "Chromatograms" },
  { id: "comparison", label: "Sample Comparison" },
  { id: "reports", label: "Reports" },
];

const TIME_POINTS = ["0 Hr", "12 Hr", "24 Hr", "36 Hr", "48 Hr", "Final"];

const SAMPLE_TYPES = [
  { value: "Fermenter", label: "Fermenter" },
  { value: "Prefermenter", label: "Prefermenter" },
  { value: "Liquefaction", label: "Liquefaction" },
];

const FERMENTERS = ["F-01", "F-02", "F-03", "F-04", "F-05", "F-06"].map((v) => ({ value: v, label: v }));
const BATCHES = ["B-260901", "B-260828", "B-260820"].map((v) => ({ value: v, label: v }));
const TIME_OPTS = TIME_POINTS.map((v) => ({ value: v, label: v }));
const PARAM_OPTS = [
  { value: "all-sugars", label: "All Sugars (DP)" },
  { value: "dp1", label: "DP1 (Glucose)" },
  { value: "total", label: "Total Sugars" },
  { value: "all-by", label: "All By-Products" },
];
const PASS_FERMENTERS = ["F-01", "F-02", "F-03", "F-04", "F-05", "F-06"].map((v) => ({ value: v, label: v }));

const SUGAR_KEYS = [
  { key: "dp1", label: "DP1 (Glucose)", color: "#3b82f6" },
  { key: "dp2", label: "DP2 (Maltose)", color: "#22c55e" },
  { key: "dp3", label: "DP3", color: "#f59e0b" },
  { key: "dp4", label: "DP4", color: "#a855f7" },
  { key: "dp5", label: "DP5+", color: "#ef4444" },
  { key: "total", label: "Total Sugars", color: "#0f2744", dashed: true },
];

const BYPRODUCT_KEYS = [
  { key: "glycerol", label: "Glycerol", color: "#3b82f6", unit: "g/L" },
  { key: "lactic", label: "Lactic Acid", color: "#22c55e", unit: "g/L" },
  { key: "acetic", label: "Acetic Acid", color: "#f59e0b", unit: "g/L" },
  { key: "furfural", label: "Furfural", color: "#a855f7", unit: "g/L" },
  { key: "hmf", label: "HMF", color: "#ef4444", unit: "g/L" },
  { key: "ethanol", label: "Ethanol", color: "#0ea5e9", unit: "% v/v" },
];

/** Mock HPLC series for fermenter batch (aligned to TIME_POINTS). */
const HPLC_SERIES = {
  sugars: {
    dp1: [48.2, 36.4, 18.6, 9.2, 3.8, 1.1],
    dp2: [22.4, 17.8, 10.2, 5.4, 2.1, 0.6],
    dp3: [8.6, 6.9, 4.1, 2.2, 1.0, 0.3],
    dp4: [4.2, 3.4, 2.0, 1.1, 0.5, 0.2],
    dp5: [3.1, 2.4, 1.5, 0.8, 0.4, 0.1],
    total: [86.5, 66.9, 36.4, 18.7, 7.8, 2.3],
  },
  byproducts: {
    glycerol: [0.4, 1.8, 3.6, 4.8, 5.4, 5.9],
    lactic: [0.1, 0.4, 0.9, 1.3, 1.6, 1.8],
    acetic: [0.05, 0.2, 0.45, 0.7, 0.85, 0.95],
    furfural: [0.02, 0.04, 0.06, 0.07, 0.08, 0.09],
    hmf: [0.03, 0.05, 0.08, 0.1, 0.11, 0.12],
    ethanol: [0.2, 4.8, 8.6, 11.2, 12.8, 13.4],
  },
};

const SAMPLES = [
  { id: "SMP-250901-001", time: "0 Hr", at: "01 Sep 2025 · 06:15", status: "Completed" },
  { id: "SMP-250901-002", time: "12 Hr", at: "01 Sep 2025 · 18:20", status: "Completed" },
  { id: "SMP-250901-003", time: "24 Hr", at: "02 Sep 2025 · 06:10", status: "Completed" },
  { id: "SMP-250901-004", time: "36 Hr", at: "02 Sep 2025 · 18:05", status: "Completed" },
  { id: "SMP-250901-005", time: "48 Hr", at: "03 Sep 2025 · 06:00", status: "Completed" },
  { id: "SMP-250901-006", time: "Final", at: "03 Sep 2025 · 14:30", status: "Completed" },
];

function firstName(user) {
  return String(user?.username || "Operator").split(/[\s._-]/)[0] || "Operator";
}

function roleLabel(user) {
  const r = String(user?.role || "operator").toLowerCase();
  if (r.includes("admin")) return "Administrator";
  if (r.includes("lab")) return "Lab Analyst";
  return "Operator";
}

function fmt(n, digits = 2) {
  return Number(n).toFixed(digits);
}

function changeMeta(a, b) {
  const delta = Number(b) - Number(a);
  const pct = Number(a) === 0 ? 0 : (delta / Number(a)) * 100;
  return { delta, pct };
}

function ComparisonTable({
  title,
  params,
  series,
  fromIdx,
  toIdx,
  fromLabel,
  toLabel,
  passFermenter,
  onPassFermenter,
}) {
  return (
    <article className="rounded-2xl border border-stone-200/80 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.04)] overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 px-4 py-3">
        <h3 className="text-[13px] font-extrabold text-[#0f2744]">{title}</h3>
        <p className="text-[10px] font-bold text-stone-400">
          {fromLabel} → {toLabel}
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left">
          <thead>
            <tr className="bg-stone-50 text-[10px] font-extrabold uppercase tracking-wider text-stone-400">
              <th className="px-3 py-2.5">Parameter</th>
              <th className="px-3 py-2.5">{fromLabel}</th>
              <th className="px-3 py-2.5">{toLabel}</th>
              <th className="px-3 py-2.5">Change</th>
              <th className="px-3 py-2.5">Change (%)</th>
              <th className="px-3 py-2.5">Trend</th>
              <th className="px-3 py-2.5">Pass Fermenter</th>
            </tr>
          </thead>
          <tbody>
            {params.map((p, rowIdx) => {
              const data = series[p.key] || [];
              const a = data[fromIdx] ?? 0;
              const b = data[toIdx] ?? 0;
              const { delta, pct } = changeMeta(a, b);
              const down = delta < 0;
              const unit = p.unit || "g/L";
              return (
                <tr key={p.key} className="border-t border-stone-100 text-[12px] font-semibold text-stone-700">
                  <td className="px-3 py-2.5 font-extrabold text-[#0f2744]">{p.label}</td>
                  <td className="px-3 py-2.5 tabular-nums">
                    {fmt(a)} <span className="text-[10px] text-stone-400">{unit}</span>
                  </td>
                  <td className="px-3 py-2.5 tabular-nums">
                    {fmt(b)} <span className="text-[10px] text-stone-400">{unit}</span>
                  </td>
                  <td className={`px-3 py-2.5 tabular-nums ${down ? "text-rose-600" : "text-emerald-600"}`}>
                    <span className="inline-flex items-center gap-0.5">
                      {down ? <ArrowDownRight size={12} /> : <ArrowUpRight size={12} />}
                      {fmt(Math.abs(delta))}
                    </span>
                  </td>
                  <td className={`px-3 py-2.5 tabular-nums ${down ? "text-rose-600" : "text-emerald-600"}`}>
                    {down ? "" : "+"}
                    {fmt(pct, 1)}%
                  </td>
                  <td className="px-3 py-2.5 w-28">
                    <Sparkline data={data} color={p.color} fill={`${p.color}22`} />
                  </td>
                  <td className="px-3 py-2.5">
                    {rowIdx === 0 ? (
                      <DistillerSelect
                        value={passFermenter}
                        onChange={onPassFermenter}
                        options={PASS_FERMENTERS}
                        compact
                        className="w-[92px]"
                      />
                    ) : (
                      <span className="text-[11px] font-bold text-stone-400">{passFermenter}</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </article>
  );
}

function TrendPanel({ title, seriesKeys, seriesData, highlightIdx, yUnit = "g/L" }) {
  const chartSeries = seriesKeys.map((k) => ({
    label: k.label,
    color: k.color,
    dashed: Boolean(k.dashed),
    data: seriesData[k.key] || [],
  }));
  const allVals = chartSeries.flatMap((s) => s.data);
  const yMax = allVals.length ? Math.max(...allVals) * 1.08 : 1;

  return (
    <article className="rounded-2xl border border-stone-200/80 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-[13px] font-extrabold text-[#0f2744]">{title}</h3>
          <p className="text-[10px] font-bold text-stone-400">
            Concentration ({yUnit}) vs fermentation time
            {highlightIdx != null && highlightIdx >= 0 ? (
              <span className="ml-1.5 text-[#2563eb]">· Selected: {TIME_POINTS[highlightIdx]}</span>
            ) : null}
          </p>
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {seriesKeys.map((k) => (
            <span key={k.key} className="inline-flex items-center gap-1.5 text-[10px] font-bold text-stone-500">
              <span
                className="h-2 w-2 rounded-full"
                style={{
                  background: k.dashed ? "transparent" : k.color,
                  boxShadow: k.dashed ? `inset 0 0 0 1.5px ${k.color}` : undefined,
                }}
              />
              {k.label}
            </span>
          ))}
        </div>
      </div>
      <div className="w-full overflow-hidden">
        <LineChart
          series={chartSeries}
          labels={TIME_POINTS}
          width={900}
          height={260}
          domain={[0, yMax]}
          showDots
          highlightIndex={highlightIdx}
          className="min-h-[260px]"
        />
      </div>
    </article>
  );
}

export default function LabHplcAnalysisPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState("sugars");
  const [batch, setBatch] = useState("B-260901");
  const [dateFrom, setDateFrom] = useState("2025-09-01");
  const [dateTo, setDateTo] = useState("2025-09-08");
  const [sampleType, setSampleType] = useState("Fermenter");
  const [fermenter, setFermenter] = useState("F-03");
  const [timePoint, setTimePoint] = useState("24 Hr");
  const [parameter, setParameter] = useState("all-sugars");
  const [viewMode, setViewMode] = useState("trend");
  const [passFermenter, setPassFermenter] = useState("F-04");
  const [compareTo, setCompareTo] = useState("Final");

  const name = firstName(user);
  const initials = name.slice(0, 1).toUpperCase();
  const fromIdx = TIME_POINTS.indexOf(timePoint);
  const toIdx = TIME_POINTS.indexOf(compareTo);
  const selectedSample = SAMPLES.find((s) => s.time === timePoint) || SAMPLES[2];

  const totalAt = HPLC_SERIES.sugars.total[fromIdx] ?? 0;
  const totalPrev = HPLC_SERIES.sugars.total[Math.max(0, fromIdx - 1)] ?? totalAt;
  const sugarsFalling = totalAt < totalPrev;

  const sugarParams = useMemo(() => {
    if (parameter === "dp1") return SUGAR_KEYS.filter((k) => k.key === "dp1");
    if (parameter === "total") return SUGAR_KEYS.filter((k) => k.key === "total");
    return SUGAR_KEYS;
  }, [parameter]);

  const showSugars = tab === "sugars" || tab === "overview" || tab === "comparison";
  // Mock shows by-products under Sugars (DP) as well — keep both visible there.
  const showBy = tab === "byproducts" || tab === "sugars" || tab === "overview" || tab === "comparison";

  const downloadReport = () => {
    const rows = [
      ...SUGAR_KEYS.map((p) => {
        const a = HPLC_SERIES.sugars[p.key][fromIdx];
        const b = HPLC_SERIES.sugars[p.key][toIdx];
        const { delta, pct } = changeMeta(a, b);
        return [p.label, fmt(a), fmt(b), fmt(delta), `${fmt(pct, 1)}%`, "g/L", passFermenter];
      }),
      ...BYPRODUCT_KEYS.map((p) => {
        const a = HPLC_SERIES.byproducts[p.key][fromIdx];
        const b = HPLC_SERIES.byproducts[p.key][toIdx];
        const { delta, pct } = changeMeta(a, b);
        return [p.label, fmt(a), fmt(b), fmt(delta), `${fmt(pct, 1)}%`, p.unit, passFermenter];
      }),
    ];
    downloadExcelTable({
      sheetName: "HPLC Analysis",
      fileName: `HPLC_${batch}_${fermenter}_${timePoint.replace(/\s/g, "")}`,
      headers: ["Parameter", timePoint, compareTo, "Change", "Change %", "Unit", "Pass Fermenter"],
      rows,
    });
  };

  return (
    <div className="min-h-full bg-stone-250 px-4 py-4 sm:px-6 lg:px-7">
      <header className="mb-4 rounded-2xl border border-stone-200/80 bg-white px-5 py-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#2563eb]">Analysis</p>
            <h1 className="mt-0.5 text-2xl font-black tracking-tight text-[#0f2744]">HPLC Analysis</h1>
            <p className="mt-0.5 text-sm font-medium text-stone-500">Detailed carbohydrate & by-product analysis.</p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2.5">
            <DistillerSelect value={batch} onChange={setBatch} options={BATCHES} compact className="w-[140px]" />
            <div className="flex items-center gap-1.5">
              <DistillerDatePicker value={dateFrom} onChange={setDateFrom} compact className="w-[138px]" />
              <span className="text-[11px] font-bold text-stone-400">→</span>
              <DistillerDatePicker value={dateTo} onChange={setDateTo} compact className="w-[138px]" />
            </div>
            <button
              type="button"
              onClick={() => navigate("/laboratory/register")}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-emerald-600 px-3 text-[12px] font-bold text-white shadow-sm hover:bg-emerald-700"
            >
              <Plus size={14} strokeWidth={2.6} />
              New Sample
            </button>
            <button
              type="button"
              className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50"
              aria-label="Notifications"
            >
              <Bell size={15} />
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-black text-white">
                2
              </span>
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

        <div className="mt-4 flex flex-wrap gap-1 border-b border-stone-100 pb-0">
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`-mb-px border-b-2 px-3.5 py-2.5 text-[12px] font-extrabold transition ${
                  active
                    ? "border-emerald-600 text-emerald-700"
                    : "border-transparent text-stone-500 hover:text-[#0f2744]"
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </header>

      <div className="mb-3 flex flex-wrap items-end gap-2.5 rounded-2xl border border-stone-200/80 bg-white p-3 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
        <label className="block">
          <span className="mb-1 block text-[9px] font-extrabold uppercase tracking-wider text-stone-400">Sample Type</span>
          <DistillerSelect value={sampleType} onChange={setSampleType} options={SAMPLE_TYPES} compact className="w-[140px]" />
        </label>
        <label className="block">
          <span className="mb-1 block text-[9px] font-extrabold uppercase tracking-wider text-stone-400">Fermenter</span>
          <DistillerSelect value={fermenter} onChange={setFermenter} options={FERMENTERS} compact className="w-[100px]" />
        </label>
        <label className="block">
          <span className="mb-1 block text-[9px] font-extrabold uppercase tracking-wider text-stone-400">Batch No.</span>
          <DistillerSelect value={batch} onChange={setBatch} options={BATCHES} compact className="w-[130px]" />
        </label>
        <label className="block">
          <span className="mb-1 block text-[9px] font-extrabold uppercase tracking-wider text-stone-400">Time Point</span>
          <DistillerSelect value={timePoint} onChange={setTimePoint} options={TIME_OPTS} compact className="w-[110px]" />
        </label>
        <label className="block">
          <span className="mb-1 block text-[9px] font-extrabold uppercase tracking-wider text-stone-400">Parameter</span>
          <DistillerSelect value={parameter} onChange={setParameter} options={PARAM_OPTS} compact className="w-[160px]" />
        </label>
        <label className="block">
          <span className="mb-1 block text-[9px] font-extrabold uppercase tracking-wider text-stone-400">Compare To</span>
          <DistillerSelect value={compareTo} onChange={setCompareTo} options={TIME_OPTS} compact className="w-[110px]" />
        </label>
        <div className="flex h-9 overflow-hidden rounded-xl border border-stone-200">
          {[
            { id: "trend", label: "Trend View" },
            { id: "compare", label: "Compare View" },
          ].map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setViewMode(m.id)}
              className={`px-3 text-[11px] font-extrabold ${
                viewMode === m.id ? "bg-emerald-600 text-white" : "bg-white text-stone-500 hover:bg-stone-50"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={downloadReport}
          className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 text-[12px] font-bold text-stone-700 hover:bg-stone-50"
        >
          <Download size={14} />
          Download Report
        </button>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-5">
        <article className="rounded-2xl border border-stone-200/80 bg-white p-3.5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-stone-400">Sample Type</p>
          <p className="mt-1 text-[16px] font-black text-[#0f2744]">
            {sampleType} {fermenter}
          </p>
          <p className="text-[11px] font-semibold text-stone-500">Batch: {batch}</p>
        </article>
        <article className="rounded-2xl border border-stone-200/80 bg-white p-3.5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-stone-400">Selected Time Point</p>
          <p className="mt-1 text-[16px] font-black text-[#0f2744]">{timePoint}</p>
          <p className="text-[11px] font-semibold text-stone-500">
            {selectedSample.id} · {selectedSample.at}
          </p>
        </article>
        <article className="rounded-2xl border border-stone-200/80 bg-white p-3.5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-stone-400">Total Sugars</p>
          <p className="mt-1 text-[22px] font-black tabular-nums leading-none text-[#0f2744]">{fmt(totalAt)} g/L</p>
        </article>
        <article className="rounded-2xl border border-stone-200/80 bg-white p-3.5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-stone-400">Trend</p>
          <p className={`mt-1 inline-flex items-center gap-1 text-[15px] font-black ${sugarsFalling ? "text-rose-600" : "text-emerald-600"}`}>
            {sugarsFalling ? <TrendingDown size={16} /> : null}
            Sugars {sugarsFalling ? "Decreasing" : "Increasing"}
          </p>
          <p className="text-[11px] font-semibold text-stone-500">vs previous time point</p>
        </article>
        <article className="rounded-2xl border border-stone-200/80 bg-white p-3.5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-stone-400">Samples Analyzed</p>
          <p className="mt-1 text-[22px] font-black tabular-nums leading-none text-[#0f2744]">{SAMPLES.length}</p>
          <p className="text-[11px] font-semibold text-stone-500">0 Hr to Final</p>
        </article>
      </div>

      {tab === "chromatograms" || tab === "reports" ? (
        <div className="mb-4 rounded-2xl border border-dashed border-stone-300 bg-white px-6 py-16 text-center shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
          <TestTube2 className="mx-auto mb-3 text-stone-300" size={36} />
          <p className="text-sm font-extrabold text-[#0f2744]">{tab === "chromatograms" ? "Chromatograms" : "Reports"}</p>
          <p className="mt-1 text-xs font-semibold text-stone-500">
            {tab === "chromatograms"
              ? "Peak overlays and retention-time views will appear here."
              : "Batch HPLC report templates and export history will appear here."}
          </p>
        </div>
      ) : (
        <>
          {showSugars ? (
            <div className={`mb-4 grid gap-3 ${viewMode === "trend" ? "lg:grid-cols-2" : ""}`}>
              {viewMode === "trend" ? (
                <TrendPanel
                  title={`Sugars (DP) Trend — ${sampleType} ${fermenter} | Batch ${batch}`}
                  seriesKeys={sugarParams}
                  seriesData={HPLC_SERIES.sugars}
                  highlightIdx={fromIdx >= 0 ? fromIdx : 2}
                  yUnit="g/L"
                />
              ) : null}
              <ComparisonTable
                title="Time Point Comparison (Sugars)"
                params={sugarParams}
                series={HPLC_SERIES.sugars}
                fromIdx={fromIdx >= 0 ? fromIdx : 2}
                toIdx={toIdx >= 0 ? toIdx : TIME_POINTS.length - 1}
                fromLabel={timePoint}
                toLabel={compareTo}
                passFermenter={passFermenter}
                onPassFermenter={setPassFermenter}
              />
            </div>
          ) : null}

          {showBy ? (
            <div className={`mb-4 grid gap-3 ${viewMode === "trend" ? "lg:grid-cols-2" : ""}`}>
              {viewMode === "trend" ? (
                <TrendPanel
                  title={`By-Products Trend — ${sampleType} ${fermenter} | Batch ${batch}`}
                  seriesKeys={BYPRODUCT_KEYS}
                  seriesData={HPLC_SERIES.byproducts}
                  highlightIdx={fromIdx >= 0 ? fromIdx : 2}
                  yUnit="g/L · Ethanol % v/v"
                />
              ) : null}
              <ComparisonTable
                title="Time Point Comparison (By-Products)"
                params={BYPRODUCT_KEYS}
                series={HPLC_SERIES.byproducts}
                fromIdx={fromIdx >= 0 ? fromIdx : 2}
                toIdx={toIdx >= 0 ? toIdx : TIME_POINTS.length - 1}
                fromLabel={timePoint}
                toLabel={compareTo}
                passFermenter={passFermenter}
                onPassFermenter={setPassFermenter}
              />
            </div>
          ) : null}
        </>
      )}

      <section className="rounded-2xl border border-stone-200/80 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-[13px] font-extrabold text-[#0f2744]">
            Recent Samples — {sampleType} {fermenter} | Batch {batch}
          </h3>
          <p className="text-[10px] font-bold text-stone-400">{SAMPLES.length} samples</p>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-1">
          {SAMPLES.map((s) => {
            const active = s.time === timePoint;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setTimePoint(s.time)}
                className={`min-w-[168px] shrink-0 rounded-2xl border px-3.5 py-3 text-left transition ${
                  active
                    ? "border-emerald-500 bg-emerald-50 shadow-sm"
                    : "border-stone-200 bg-white hover:border-stone-300"
                }`}
              >
                <p className="text-[11px] font-extrabold text-[#0f2744]">{s.id}</p>
                <p className="mt-0.5 text-[12px] font-black text-stone-700">{s.time}</p>
                <p className="mt-0.5 text-[10px] font-semibold text-stone-400">{s.at}</p>
                <span className="mt-2 inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-emerald-700">
                  {s.status}
                </span>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
