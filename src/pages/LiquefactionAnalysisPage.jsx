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

const IODINE_OPTIONS = ["POSITIVE", "NEGATIVE"];
const FERMENTERS = ["F1", "F2", "F3", "F4", "F5", "F6"];

const TANK_SUBCOLS = [
  { suffix: "Temp", label: "Temp" },
  { suffix: "Level", label: "Level" },
  { suffix: "Sg", label: "Specific gravity" },
  { suffix: "Ph", label: "pH" },
];

function tankCols(prefix, extra = []) {
  return [
    ...TANK_SUBCOLS.map((s) => ({
      key: `${prefix}${s.suffix}`,
      label: s.label,
      avg: true,
    })),
    ...extra,
  ];
}

/** Liquefaction flat + grouped column model */
const FLOW_COLS = [
  { key: "flourTph", label: "Flour (TPH)", avg: true },
  { key: "thinSlopLph", label: "Thin slop (LPH)", avg: true },
  { key: "processWaterLph", label: "Process water (LPH)", avg: true },
  { key: "lessCondensateLph", label: "Less condensate (LPH)", avg: true },
  { key: "leesLph", label: "Lees (LPH)", avg: true },
];

const AFTER_IODINE_COLS = [
  { key: "slurryFlourRate", label: "Slurry flour rate", avg: true },
];

const ENZYME_COLS = [
  { key: "enzymeBrand", label: "Enzyme brand", avg: false, input: "text" },
  { key: "enzymeQty", label: "Enzyme qty", avg: true },
];

const ST_COLS = tankCols("st");
const LT1_COLS = tankCols("lt1");
const LT2_COLS = tankCols("lt2", [
  { key: "lt2Ds", label: "DS", avg: true },
  { key: "lt2Rs", label: "RS", avg: true },
  {
    key: "lt2Iodine",
    label: "Iodine test",
    type: "select",
    options: IODINE_OPTIONS,
    avg: false,
  },
]);

const PASS_FERMENTER_COL = {
  key: "passFermenter",
  label: "Pass Fermenter",
  type: "select",
  options: FERMENTERS,
  avg: false,
};

const LIQ_GROUPS = [
  { id: "flow", label: "Process rates", cols: FLOW_COLS, tone: "bg-[#2563eb]" },
  { id: "slurry", label: "Slurry", cols: AFTER_IODINE_COLS, tone: "bg-[#1d4ed8]" },
  { id: "enzyme", label: "Enzyme", cols: ENZYME_COLS, tone: "bg-[#2563eb]" },
  { id: "st", label: "ST", cols: ST_COLS, tone: "bg-[#3b74e8]" },
  { id: "lt1", label: "LT1", cols: LT1_COLS, tone: "bg-[#3b74e8]" },
  { id: "lt2", label: "LT2", cols: LT2_COLS, tone: "bg-[#1d4ed8]" },
  { id: "pass", label: "Pass", cols: [PASS_FERMENTER_COL], tone: "bg-[#0f2744]" },
];

const LIQUEFACTION_COLS = LIQ_GROUPS.flatMap((g) => g.cols);

const HPLC_COLS = [
  { key: "dp4Pct", label: "DP4+ (% w/w)", avg: true },
  { key: "dp3Pct", label: "DP3 (% w/w)", avg: true },
  { key: "dp2Pct", label: "DP2 (% w/w)", avg: true },
  { key: "glucosePct", label: "Glucose (% w/w)", avg: true },
  { key: "fructosePct", label: "Fructose (% w/w)", avg: true },
  { key: "lacticAcidPct", label: "Lactic acid (% w/w)", avg: true },
  { key: "glycerolPct", label: "Glycerol (% w/w)", avg: true },
  { key: "aceticAcidPct", label: "Acetic acid (% w/w)", avg: true },
  { key: "ethanolPct", label: "Ethanol (% v/v)", avg: true },
  {
    key: "passFermenter",
    label: "Pass Fermenter",
    type: "select",
    options: FERMENTERS,
    avg: false,
  },
];

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

function allFieldKeys() {
  return [...LIQUEFACTION_COLS, ...HPLC_COLS].map((c) => c.key);
}

function emptyFields() {
  return Object.fromEntries(allFieldKeys().map((k) => [k, ""]));
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
  const iodine =
    row.iodineTest === "PASS"
      ? "POSITIVE"
      : row.iodineTest === "FAIL"
        ? "NEGATIVE"
        : row.iodineTest ?? "";
  return {
    ...base,
    ...row,
    slNo,
    id: row.id && String(row.id).startsWith("r-") ? row.id : base.id,
    date: row.date || date,
    time: row.time || "",
    iodineTest: iodine,
    lt2Ds: row.lt2Ds ?? row.dsPct ?? "",
    lt2Rs: row.lt2Rs ?? row.rs ?? "",
    lt2Iodine: row.lt2Iodine ?? "",
    lt2Ph: row.lt2Ph ?? row.ph ?? "",
    slurryFlourRate: row.slurryFlourRate ?? "",
    dp3Pct: row.dp3Pct ?? row.maltotriosePct ?? "",
    dp2Pct: row.dp2Pct ?? row.maltosePct ?? "",
    // ethanolPct kept; label is now % v/v
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

function CellEditor({ col, value, onChange }) {
  if (col.type === "select") {
    return (
      <DistillerSelect
        compact
        value={value || ""}
        onChange={onChange}
        options={[{ value: "", label: "Select" }, ...(col.options || [])]}
        placeholder="Select"
      />
    );
  }
  return (
    <input
      className={cellInput}
      inputMode={col.input === "text" ? undefined : "decimal"}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder={col.label}
    />
  );
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
  const activeKey = sheetKey(view, hplcKind);
  const hplcKindLabel = hplcKind === "slurry" ? "Slurry" : "Water";
  const isLiq = view === "liquefaction";
  const dataCols = isLiq ? LIQUEFACTION_COLS : HPLC_COLS;
  const reportLabel = isLiq ? "Liquefaction" : `HPLC · ${hplcKindLabel}`;
  const groupLabel = isLiq ? "Liquefaction data" : `HPLC · ${hplcKindLabel}`;
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
      [row.time, row.date, row.passFermenter, ...dataCols.map((c) => row[c.key])]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [rows, search, dataCols]);

  const handleExport = () => {
    const headers = isLiq
      ? [
          "Sl. No.",
          "Date",
          "Time",
          ...LIQ_GROUPS.flatMap((g) => g.cols.map((c) => (g.id === "st" || g.id === "lt1" || g.id === "lt2" ? `${g.label} ${c.label}` : c.label))),
        ]
      : ["Sl. No.", "Date", "Time", ...HPLC_COLS.map((c) => c.label)];

    downloadExcelTable({
      fileName: `${reportLabel.replace(/[·\s]+/g, "_")}_${filterDate}.xlsx`,
      title: `${reportLabel} current readings`,
      companyName: orgName,
      headers,
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
      if (!col.avg || col.type === "select") {
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
          searchPlaceholder="Search time, fermenter, readings…"
          onAddRow={addRow}
        />

        <div className="overflow-x-auto">
          <table className="min-w-[2200px] w-full text-left text-[12px] border-collapse">
            <thead>
              {isLiq ? (
                <>
                  <tr className="bg-[#0f2744] text-white font-extrabold uppercase tracking-wider text-[10px]">
                    <th rowSpan={3} className="px-2 py-2.5 border-r border-white/10 w-12 text-center">
                      Sl. No.
                    </th>
                    <th colSpan={2} rowSpan={2} className="px-3 py-2.5 text-center border-r border-white/10">
                      Current readings
                    </th>
                    {LIQ_GROUPS.map((g) => (
                      <th
                        key={g.id}
                        colSpan={g.cols.length}
                        className={`px-3 py-2.5 text-center border-r border-white/10 ${g.tone}`}
                      >
                        {g.label}
                      </th>
                    ))}
                    <th rowSpan={3} className="px-2 py-2.5 w-10" />
                  </tr>
                  <tr className="bg-[#163056] text-white font-extrabold uppercase tracking-wider text-[9px]">
                    {LIQ_GROUPS.map((g) =>
                      g.id === "st" || g.id === "lt1" || g.id === "lt2" ? (
                        <th
                          key={`${g.id}-sub`}
                          colSpan={g.cols.length}
                          className="px-2 py-1.5 text-center border-r border-white/10 bg-[#1e3a5f]"
                        >
                          {g.label} parameters
                        </th>
                      ) : (
                        g.cols.map((col) => (
                          <th
                            key={col.key}
                            rowSpan={2}
                            className="px-2 py-2 border-r border-white/10 bg-[#1d4ed8] min-w-[100px] text-center align-bottom"
                          >
                            {col.label}
                          </th>
                        ))
                      )
                    )}
                  </tr>
                  <tr className="bg-[#1e3a5f] text-white font-extrabold uppercase tracking-wider text-[9px]">
                    <th className="px-3 py-2 border-r border-white/10 min-w-[148px]">Date</th>
                    <th className="px-3 py-2 border-r border-white/10 min-w-[138px]">Time</th>
                    {LIQ_GROUPS.filter((g) => g.id === "st" || g.id === "lt1" || g.id === "lt2").flatMap((g) =>
                      g.cols.map((col) => (
                        <th
                          key={col.key}
                          className="px-2 py-2 border-r border-white/10 bg-[#2563eb] min-w-[96px] text-center"
                        >
                          {col.label}
                        </th>
                      ))
                    )}
                  </tr>
                </>
              ) : (
                <>
                  <tr className="bg-[#0f2744] text-white font-extrabold uppercase tracking-wider text-[10px]">
                    <th rowSpan={2} className="px-2 py-2.5 border-r border-white/10 w-12 text-center">
                      Sl. No.
                    </th>
                    <th colSpan={2} className="px-3 py-2.5 text-center border-r border-white/10">
                      Current readings
                    </th>
                    <th colSpan={HPLC_COLS.length} className="px-3 py-2.5 text-center border-r border-white/10 bg-[#1d4ed8]">
                      {groupLabel}
                    </th>
                    <th rowSpan={2} className="px-2 py-2.5 w-10" />
                  </tr>
                  <tr className="bg-[#163056] text-white font-extrabold uppercase tracking-wider text-[10px]">
                    <th className="px-3 py-2 border-r border-white/10 min-w-[148px]">Date</th>
                    <th className="px-3 py-2 border-r border-white/10 min-w-[138px]">Time</th>
                    {HPLC_COLS.map((col) => (
                      <th
                        key={col.key}
                        className="px-2 py-2 border-r border-white/10 bg-[#2563eb] min-w-[110px] text-center"
                      >
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </>
              )}
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
                        <td
                          key={col.key}
                          className={`px-1.5 py-1.5 ${
                            col.key === "passFermenter" ? "bg-[#e8f0fe]" : "bg-[#eef3f9]"
                          }`}
                        >
                          <CellEditor
                            col={col}
                            value={row[col.key]}
                            onChange={(v) => updateRow(row.id, col.key, v)}
                          />
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
