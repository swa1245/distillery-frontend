import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Droplets, FileSpreadsheet, Save, Trash2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { downloadExcelTable } from "../utils/exportReport";
import { formatDisplayDate as formatSavedDate, todayIso } from "../utils/datedSheetStore";
import ReportFilterBar from "../components/ReportFilterBar";
import DistillerDatePicker from "../components/DistillerDatePicker";
import DistillerTimePicker from "../components/DistillerTimePicker";
import DistillerSelect from "../components/DistillerSelect";

const STORAGE_KEY = "distiller_liquefaction_table";

const cellInput =
  "w-full min-w-[4.5rem] rounded-md border border-sky-100 bg-white px-1.5 py-1.5 text-[12px] font-semibold text-stone-800 outline-none focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb]/20";

const IODINE_TEST_OPTIONS = ["PASS", "FAIL"];

const LIQUEFACTION_COLS = [
  { key: "flourTph", label: "Flour (TPH)" },
  { key: "thinSlopLph", label: "Thin slop (LPH)" },
  { key: "processWaterLph", label: "Process water (LPH)" },
  { key: "lessCondensateLph", label: "Less condensate (LPH)" },
  { key: "leesLph", label: "Lees (LPH)" },
  { key: "dsPct", label: "DS (%)" },
  { key: "gravityFlt", label: "Gravity in FLT" },
  { key: "ph", label: "pH" },
  { key: "rs", label: "RS" },
  { key: "iodineTest", label: "Iodine test", type: "select", options: IODINE_TEST_OPTIONS },
];

const HPLC_COLS = [
  { key: "dp4Pct", label: "DP4+ (% w/w)" },
  { key: "dp3Pct", label: "DP3 (% w/w)" },
  { key: "dp2Pct", label: "DP2 (% w/w)" },
  { key: "glucosePct", label: "Glucose (% w/w)" },
  { key: "fructosePct", label: "Fructose (% w/w)" },
  { key: "lacticAcidPct", label: "Lactic acid (% w/w)" },
  { key: "glycerolPct", label: "Glycerol (% w/w)" },
  { key: "aceticAcidPct", label: "Acetic acid (% w/w)" },
  { key: "ethanolPct", label: "Ethanol (% w/w)" },
];

const VIEWS = {
  liquefaction: {
    label: "Liquefaction",
    group: "Liquefaction data",
    cols: LIQUEFACTION_COLS,
    headerClass: "bg-[#2563eb]",
    subHeaderClass: "bg-[#3b74e8]",
    cellClass: "bg-[#eef3f9]",
  },
  hplc: {
    label: "HPLC",
    group: "HPLC data",
    cols: HPLC_COLS,
    headerClass: "bg-[#1d4ed8]",
    subHeaderClass: "bg-[#2563eb]",
    cellClass: "bg-[#e8f0fe]",
  },
};

const VIEW_OPTIONS = [
  { value: "liquefaction", label: "Liquefaction" },
  { value: "hplc", label: "HPLC" },
];

const HPLC_KIND_OPTIONS = [
  { value: "water", label: "Water" },
  { value: "slurry", label: "Slurry" },
];

function sheetKey(view, hplcKind) {
  if (view === "hplc") return hplcKind === "slurry" ? "hplcSlurry" : "hplcWater";
  return "liquefaction";
}

function emptyFields() {
  return Object.fromEntries([...LIQUEFACTION_COLS, ...HPLC_COLS].map((c) => [c.key, ""]));
}

function num(v) {
  const n = Number(String(v ?? "").replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : 0;
}

function roundQty(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

function formatAvg(values) {
  const nums = values.map(num).filter((n, i) => String(values[i] ?? "").trim() !== "" && Number.isFinite(n));
  if (!nums.length) return "—";
  return roundQty(nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(2);
}

function formatDisplayDate(iso) {
  const m = String(iso || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return iso || "";
  return `${m[3]}/${m[2]}/${m[1].slice(2)}`;
}

function blankRow(slNo, date = todayIso()) {
  return {
    id: `r-${Date.now()}-${slNo}-${Math.random().toString(36).slice(2, 7)}`,
    slNo,
    date,
    time: "",
    ...emptyFields(),
  };
}

function hydrateRow(row, date, slNo) {
  const base = blankRow(slNo, date);
  return {
    ...base,
    ...row,
    slNo,
    id: row.id && String(row.id).startsWith("r-") ? row.id : base.id,
    date: row.date || date,
    time: row.time || "",
    dp3Pct: row.dp3Pct ?? row.maltotriosePct ?? "",
    dp2Pct: row.dp2Pct ?? row.maltosePct ?? "",
  };
}

function loadViewStore() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (raw?.views && typeof raw.views === "object") {
      return {
        liquefaction: raw.views.liquefaction || {},
        hplcWater: raw.views.hplcWater || raw.views.hplc || {},
        hplcSlurry: raw.views.hplcSlurry || raw.views.hplcGlucose || {},
      };
    }
    if (raw?.sheets && typeof raw.sheets === "object" && !Array.isArray(raw.sheets)) {
      const first = Object.values(raw.sheets)[0];
      if (Array.isArray(first) || first == null) {
        return { liquefaction: raw.sheets, hplcWater: {}, hplcSlurry: {} };
      }
    }
  } catch {
    /* ignore */
  }
  return { liquefaction: {}, hplcWater: {}, hplcSlurry: {} };
}

function saveViewStore(views) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ views }));
}

function listViewDates(views, view) {
  return Object.keys(views?.[view] || {}).sort((a, b) => b.localeCompare(a));
}

export default function LiquefactionAnalysisPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [view, setView] = useState("liquefaction");
  const [hplcKind, setHplcKind] = useState("water");
  const [filterDate, setFilterDate] = useState(todayIso);
  const [search, setSearch] = useState("");
  const [savedDates, setSavedDates] = useState([]);
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState("");
  const [statusType, setStatusType] = useState("ok");
  const orgName = user?.organizationName || "Digital Distillery";
  const spec = VIEWS[view];
  const activeKey = sheetKey(view, hplcKind);
  const hplcKindLabel = hplcKind === "slurry" ? "Slurry" : "Water";
  const reportLabel = view === "hplc" ? `HPLC · ${hplcKindLabel}` : spec.label;
  const groupLabel = view === "hplc" ? `HPLC · ${hplcKindLabel}` : spec.group;
  const dataCols = spec.cols;
  const colCount = 3 + dataCols.length + 1;

  const refreshDates = (key = activeKey) => setSavedDates(listViewDates(loadViewStore(), key));

  const hydrateRows = (list, date) => {
    if (!Array.isArray(list) || !list.length) return [];
    return list.map((row, i) => hydrateRow(row, date, i + 1));
  };

  useEffect(() => {
    const store = loadViewStore();
    setRows(hydrateRows(store[activeKey]?.[filterDate], filterDate));
    refreshDates(activeKey);
  }, [filterDate, activeKey]);

  const flash = (message, type = "ok") => {
    setStatus(message);
    setStatusType(type);
    window.setTimeout(() => setStatus(""), 2800);
  };

  const handleSave = () => {
    const store = loadViewStore();
    store[activeKey] = store[activeKey] || {};
    store[activeKey][filterDate] = rows.map((row) => ({ ...row, date: row.date || filterDate }));
    saveViewStore(store);
    refreshDates();
    flash("Report saved.");
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) =>
      [row.time, row.date, ...dataCols.map((c) => row[c.key])].join(" ").toLowerCase().includes(q)
    );
  }, [rows, search, dataCols]);

  const handleExport = () => {
    downloadExcelTable({
      fileName: `${reportLabel.replace(/[·\s]+/g, "_")}_${filterDate}.xlsx`,
      title: `${reportLabel} current readings`,
      companyName: orgName,
      headers: ["Sl. No.", "Date", "Time", ...dataCols.map((c) => c.label)],
      rows: filtered.map((row) => [row.slNo, formatDisplayDate(row.date), row.time, ...dataCols.map((c) => row[c.key])]),
      sheetName: reportLabel.replace(" · ", " ").slice(0, 31),
      subtitle: `${groupLabel}  ·  ${formatSavedDate(filterDate)}  ·  ${filtered.length} ${
        filtered.length === 1 ? "entry" : "entries"
      }`,
    });
    flash("Report exported.");
  };

  const updateRow = (id, field, value) => {
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, [field]: value } : row)));
  };

  const addRow = () => {
    const slNo = rows.length ? Math.max(...rows.map((r) => Number(r.slNo) || 0)) + 1 : 1;
    setRows((prev) => [...prev, blankRow(slNo, filterDate)]);
  };

  const removeRow = (id) => {
    setRows((prev) => prev.filter((row) => row.id !== id).map((row, i) => ({ ...row, slNo: i + 1 })));
  };

  const averages = useMemo(() => {
    const next = {};
    for (const col of dataCols) {
      if (col.type === "select") {
        next[col.key] = "—";
        continue;
      }
      next[col.key] = formatAvg(filtered.map((row) => row[col.key]));
    }
    return next;
  }, [filtered, dataCols]);

  return (
    <div className="w-full min-h-full px-4 sm:px-6 lg:px-8 py-5">
      <button
        type="button"
        onClick={() => navigate("/milling-liquefaction")}
        className="mb-4 inline-flex items-center gap-1.5 text-xs font-bold text-[#2563eb] hover:underline"
      >
        <ArrowLeft size={14} strokeWidth={2.4} />
        Milling & Liquefaction
      </button>

      <section className="w-full overflow-hidden rounded-2xl border border-sky-200/80 bg-white shadow-[0_8px_28px_rgba(15,39,68,0.08)]">
        <div className="bg-[#2563eb] px-5 py-5 sm:px-7 sm:py-6 text-white">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20">
                <Droplets size={22} strokeWidth={2.2} />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-sky-100">
                  Liquefaction
                </p>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight leading-tight">
                  Liquefaction Analysis Report
                </h1>
                <p className="mt-0.5 text-xs font-semibold text-white/70 truncate">
                  {orgName} · {reportLabel}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="rounded-xl bg-white/12 px-3.5 py-2 ring-1 ring-white/15">
                <p className="text-[9px] font-extrabold uppercase tracking-wider text-sky-100/80">Entries</p>
                <p className="text-lg font-black tabular-nums leading-tight">{rows.length}</p>
              </div>
              <button
                type="button"
                onClick={handleExport}
                className="inline-flex items-center gap-2 rounded-xl bg-white/12 px-3.5 py-2 text-sm font-bold text-white ring-1 ring-white/20 hover:bg-white/20"
              >
                <FileSpreadsheet size={16} strokeWidth={2.4} />
                Export report
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-3.5 py-2 text-sm font-bold text-[#2563eb] shadow-sm hover:bg-sky-50"
              >
                <Save size={16} strokeWidth={2.4} />
                Save report
              </button>
            </div>
          </div>
        </div>

        {status ? (
          <div
            className={`px-5 py-2 text-xs font-bold sm:px-7 ${
              statusType === "ok" ? "bg-sky-50 text-[#2563eb]" : "bg-rose-50 text-rose-700"
            }`}
          >
            {status}
          </div>
        ) : null}

        <ReportFilterBar
          date={filterDate}
          onDateChange={setFilterDate}
          savedDates={savedDates}
          formatDate={formatSavedDate}
          typeLabel="Report"
          typeValue={view}
          typeOptions={VIEW_OPTIONS}
          typeStyle="buttons"
          onTypeChange={setView}
          subTypeLabel={view === "hplc" ? "HPLC" : undefined}
          subTypeValue={hplcKind}
          subTypeOptions={view === "hplc" ? HPLC_KIND_OPTIONS : []}
          onSubTypeChange={setHplcKind}
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search time or readings…"
          onAddRow={addRow}
        />

        <div className="overflow-x-auto">
          <table className="min-w-[1480px] w-full text-left text-[12px] border-collapse">
            <thead>
              <tr className="bg-[#0f2744] text-white font-extrabold uppercase tracking-wider text-[10px]">
                <th rowSpan={2} className="px-2 py-2.5 border-r border-white/10 w-12 text-center">
                  Sl. No.
                </th>
                <th colSpan={2} className="px-3 py-2.5 text-center border-r border-white/10">
                  Current readings
                </th>
                <th colSpan={dataCols.length} className={`px-3 py-2.5 text-center border-r border-white/10 ${spec.headerClass}`}>
                  {groupLabel}
                </th>
                <th rowSpan={2} className="px-2 py-2.5 w-10" />
              </tr>
              <tr className="bg-[#163056] text-white font-extrabold uppercase tracking-wider text-[10px]">
                <th className="px-3 py-2 border-r border-white/10 min-w-[148px]">Date</th>
                <th className="px-3 py-2 border-r border-white/10 min-w-[138px]">Time</th>
                {dataCols.map((col) => (
                  <th
                    key={col.key}
                    className={`px-2 py-2 border-r border-white/10 ${spec.subHeaderClass} min-w-[110px] text-center`}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={colCount} className="px-4 py-12 text-center text-sm font-bold text-stone-400">
                    No readings yet. Click Add row.
                  </td>
                </tr>
              ) : (
                <>
                  {filtered.map((row) => (
                    <tr key={row.id} className="bg-white">
                      <td className="px-2 py-1.5 text-center font-bold tabular-nums text-stone-500">{row.slNo}</td>
                      <td className="px-1.5 py-1.5 min-w-[148px]">
                        <DistillerDatePicker compact value={row.date} onChange={(v) => updateRow(row.id, "date", v)} />
                      </td>
                      <td className="px-1.5 py-1.5 min-w-[138px]">
                        <DistillerTimePicker
                          compact
                          value={row.time}
                          onChange={(v) => updateRow(row.id, "time", v)}
                          placeholder="Time"
                        />
                      </td>
                      {dataCols.map((col) => (
                        <td key={col.key} className={`px-1.5 py-1.5 ${spec.cellClass}`}>
                          {col.type === "select" ? (
                            <DistillerSelect
                              compact
                              value={row[col.key] || ""}
                              onChange={(v) => updateRow(row.id, col.key, v)}
                              options={[{ value: "", label: "Select" }, ...(col.options || [])]}
                              placeholder="Select"
                            />
                          ) : (
                            <input
                              className={cellInput}
                              inputMode="decimal"
                              value={row[col.key]}
                              onChange={(e) => updateRow(row.id, col.key, e.target.value)}
                            />
                          )}
                        </td>
                      ))}
                      <td className="px-1 py-1.5 text-center">
                        <button
                          type="button"
                          onClick={() => removeRow(row.id)}
                          className="rounded-md p-1.5 text-stone-400 hover:bg-rose-50 hover:text-rose-600"
                          aria-label="Delete row"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-[#eef3f9] font-bold">
                    <td colSpan={3} className="px-3 py-2.5 text-[#0f2744]">
                      Average
                    </td>
                    {dataCols.map((col) => (
                      <td key={col.key} className="px-2 py-2 tabular-nums text-[#2563eb]">
                        {averages[col.key]}
                      </td>
                    ))}
                    <td />
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
