import { useEffect, useMemo, useState } from "react";
import { FileSpreadsheet, Microscope, Save, Trash2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { downloadExcelTable } from "../utils/exportReport";
import {
  formatDisplayDate as formatSavedDate,
  todayIso,
} from "../utils/datedSheetStore";
import ReportFilterBar from "../components/ReportFilterBar";
import DistillerDatePicker from "../components/DistillerDatePicker";
import DistillerHourPicker from "../components/DistillerHourPicker";
import DistillerTimePicker from "../components/DistillerTimePicker";
import DistillerSelect from "../components/DistillerSelect";

const STORAGE_KEY = "distiller_cell_culturing_table";

const cellInput =
  "w-full min-w-[4.5rem] rounded-md border border-sky-100 bg-white px-1.5 py-1.5 text-[12px] font-semibold text-stone-800 outline-none focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb]/20";

const PF_OPTIONS = ["1", "2"];
const STAGE_OPTIONS = ["Setup", "Transfer"];
const FERMENTERS = ["F1", "F2", "F3", "F4", "F5", "F6"];

const PASS_FERMENTER_COL = {
  key: "passFermenter",
  label: "Pass Fermenter",
  type: "select",
  options: FERMENTERS,
};

/** Prefermenter log columns — match plant sheet (Setup / Transfer). */
const PREFERMENTER_COLS = [
  { key: "spGr", label: "SP Gr." },
  { key: "temp", label: "Temp." },
  { key: "ph", label: "pH" },
  { key: "yeast", label: "Yeast" },
  { key: "ga", label: "GA", text: true },
  { key: "urea", label: "Urea" },
  { key: "antiBiotic", label: "Anti Biotic", text: true },
  { key: "booster", label: "Booster", text: true },
  { key: "cellCount", label: "Cell Count" },
  { key: "levelPct", label: "Level %" },
  { key: "rsPct", label: "RS%" },
  { key: "alcPct", label: "Alc %" },
];

/** Input dosing / chemicals — plant product list. */
const INPUT_COLS = [
  { key: "distillaseCs", label: "Distillase CS" },
  { key: "promoterG", label: "Promoter G" },
  { key: "sctLactroll", label: "SCT - Lactroll" },
  { key: "angelYeast", label: "Angel Yeast" },
  { key: "ureaInput", label: "Urea" },
  { key: "nutroboost", label: "Nutroboost" },
  { key: "smbs", label: "Smbs" },
  { key: "mgso4", label: "Mgso4" },
];

const HPLC_COLS = [
  { key: "dp4PlusPct", label: "DP4+ [% w/v]" },
  { key: "dp4Pct", label: "DP4 [% w/v]" },
  { key: "dp3Pct", label: "DP3 [% w/v]" },
  { key: "dp2Pct", label: "DP2 [% w/v]" },
  { key: "dp1Pct", label: "DP1 [% w/v]" },
  { key: "lacticAcidPct", label: "Lactic acid [% w/v]" },
  { key: "glycerolPct", label: "Glycerol [% w/v]" },
  { key: "aceticAcidPct", label: "Acetic acid [% w/v]" },
  { key: "ethanolPct", label: "Ethanol [% v/v]" },
];

const CULTURE_COLS = [...PREFERMENTER_COLS, ...INPUT_COLS];
const ALL_DATA_COLS = [...CULTURE_COLS, ...HPLC_COLS];
/** sl + stage + date + time + pf + culture + pass + del */
const PF_COL_COUNT = 5 + CULTURE_COLS.length + 1 + 1;
/** sl + date + time + pf + hplc + pass + del */
const HPLC_COL_COUNT = 4 + HPLC_COLS.length + 1 + 1;

const VIEW_OPTIONS = [
  { value: "culturing", label: "Prefermenter" },
  { value: "hplc", label: "HPLC" },
];

function sheetKey(view) {
  return view === "hplc" ? "hplc" : "culturing";
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
    stage: "",
    date,
    time: "",
    timeH: "",
    pfNumber: "",
    passFermenter: "",
    ...Object.fromEntries(ALL_DATA_COLS.map((c) => [c.key, ""])),
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
    stage: row.stage || "",
    time: row.time || row.timeH || "",
    timeH: row.timeH ?? row.time ?? "",
    pfNumber: row.pfNumber != null ? String(row.pfNumber) : "",
    passFermenter: row.passFermenter ?? "",
    spGr: row.spGr ?? row.gravity ?? "",
    temp: row.temp ?? row.temperatureC ?? "",
    ph: row.ph ?? "",
    yeast: row.yeast ?? row.yeastKg ?? "",
    ga: row.ga ?? row.gaKg ?? "",
    urea: row.urea ?? row.ureaKg ?? "",
    antiBiotic: row.antiBiotic ?? row.antimicrobialKg ?? "",
    booster: row.booster ?? "",
    cellCount: row.cellCount ?? row.yeastCount ?? "",
    levelPct: row.levelPct ?? row.pfLevelPct ?? "",
    rsPct: row.rsPct ?? "",
    alcPct: row.alcPct ?? row.ethanolPct ?? "",
    distillaseCs: row.distillaseCs ?? "",
    promoterG: row.promoterG ?? "",
    sctLactroll: row.sctLactroll ?? "",
    angelYeast: row.angelYeast ?? row.yeastKg ?? "",
    ureaInput: row.ureaInput ?? row.ureaKg ?? "",
    nutroboost: row.nutroboost ?? "",
    smbs: row.smbs ?? "",
    mgso4: row.mgso4 ?? row.mgso4Kg ?? "",
  };
}

function loadViewStore() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (raw?.views && typeof raw.views === "object") {
      return {
        culturing: raw.views.culturing || {},
        hplc: raw.views.hplc || raw.views.hplcWater || raw.views.hplcGlucose || {},
      };
    }
    if (raw?.sheets && typeof raw.sheets === "object" && !Array.isArray(raw.sheets)) {
      const first = Object.values(raw.sheets)[0];
      if (Array.isArray(first) || first == null) {
        return { culturing: raw.sheets, hplc: {} };
      }
    }
  } catch {
    /* ignore */
  }
  return { culturing: {}, hplc: {} };
}

function saveViewStore(views) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ views }));
}

function listViewDates(views, key) {
  return Object.keys(views?.[key] || {}).sort((a, b) => b.localeCompare(a));
}

export default function CellCulturingPage() {
  const { user } = useAuth();
  const [view, setView] = useState("culturing");
  const [filterDate, setFilterDate] = useState(todayIso);
  const [typeFilter, setTypeFilter] = useState("");
  const [search, setSearch] = useState("");
  const [savedDates, setSavedDates] = useState([]);
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState("");
  const [statusType, setStatusType] = useState("ok");
  const orgName = user?.organizationName || "Digital Distillery";
  const isHplc = view === "hplc";
  const activeKey = sheetKey(view);
  const reportLabel = isHplc ? "HPLC" : "Prefermenter";

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
    return rows.filter((row) => {
      if (typeFilter && row.pfNumber !== typeFilter) return false;
      if (!q) return true;
      return [row.stage, row.time, row.timeH, row.pfNumber, row.passFermenter, row.ga, row.angelYeast, row.antiBiotic, row.booster]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [rows, search, typeFilter]);

  const handleExport = () => {
    const headers = isHplc
      ? [
          "Sl. No.",
          "Date",
          "Time [h]",
          "Prefermenter No",
          ...HPLC_COLS.map((c) => c.label),
          "Pass Fermenter",
        ]
      : [
          "Sl. No.",
          "Setup / Transfer",
          "Date",
          "Time",
          "Prefermenter No",
          ...PREFERMENTER_COLS.map((c) => c.label),
          ...INPUT_COLS.map((c) => c.label),
          "Pass Fermenter",
        ];
    const exportRows = filtered.map((row) =>
      isHplc
        ? [
            row.slNo,
            formatDisplayDate(row.date),
            row.timeH,
            row.pfNumber,
            ...HPLC_COLS.map((c) => row[c.key]),
            row.passFermenter,
          ]
        : [
            row.slNo,
            row.stage,
            formatDisplayDate(row.date),
            row.time,
            row.pfNumber,
            ...CULTURE_COLS.map((c) => row[c.key]),
            row.passFermenter,
          ]
    );
    downloadExcelTable({
      fileName: `${reportLabel.replace(/[·\s]+/g, "_")}_${filterDate}.xlsx`,
      title: reportLabel,
      companyName: orgName,
      headers,
      rows: exportRows,
      sheetName: reportLabel.replace(" · ", " ").slice(0, 31),
      subtitle: `${reportLabel}  ·  ${formatSavedDate(filterDate)}  ·  ${filtered.length} ${
        filtered.length === 1 ? "entry" : "entries"
      }`,
    });
    flash("Report exported.");
  };

  const updateRow = (id, field, value) => {
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, [field]: value } : row)));
  };

  const addRow = () => {
    const startSl = rows.length ? Math.max(...rows.map((r) => Number(r.slNo) || 0)) + 1 : 1;
    const setup = blankRow(startSl, filterDate);
    const transfer = blankRow(startSl + 1, filterDate);
    setup.stage = "Setup";
    transfer.stage = "Transfer";
    if (typeFilter) {
      setup.pfNumber = typeFilter;
      transfer.pfNumber = typeFilter;
    }
    // Same prefermenter no. on both if one already has a default from last pair
    const lastPf = rows[rows.length - 1]?.pfNumber;
    if (!typeFilter && lastPf) {
      setup.pfNumber = lastPf;
      transfer.pfNumber = lastPf;
    }
    setRows((prev) => [...prev, setup, transfer]);
  };

  const removeRow = (id) => {
    setRows((prev) => prev.filter((row) => row.id !== id).map((row, i) => ({ ...row, slNo: i + 1 })));
  };

  const averages = useMemo(() => {
    const next = {};
    for (const col of CULTURE_COLS) {
      next[col.key] = col.text ? "—" : formatAvg(filtered.map((row) => row[col.key]));
    }
    return next;
  }, [filtered]);

  const hplcAverages = useMemo(() => {
    const next = {};
    for (const col of HPLC_COLS) {
      next[col.key] = formatAvg(filtered.map((row) => row[col.key]));
    }
    return next;
  }, [filtered]);

  const renderDataCell = (row, col, tint) => (
    <td key={col.key} className={`px-1.5 py-1.5 ${tint}`}>
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
          inputMode={col.text ? "text" : "decimal"}
          value={row[col.key]}
          onChange={(e) => updateRow(row.id, col.key, e.target.value)}
        />
      )}
    </td>
  );

  const renderPassFermenterCell = (row) => (
    <td className="px-1.5 py-1.5 min-w-[120px] bg-[#e8f0fe]">
      <DistillerSelect
        compact
        value={row.passFermenter || ""}
        onChange={(v) => updateRow(row.id, "passFermenter", v)}
        options={[{ value: "", label: "Select" }, ...FERMENTERS]}
        placeholder="Select"
      />
    </td>
  );

  return (
    <div className="w-full min-h-full px-4 sm:px-6 lg:px-8 py-5">
      <section className="w-full overflow-hidden rounded-2xl border border-sky-200/80 bg-white shadow-[0_8px_28px_rgba(15,39,68,0.08)]">
        <div className="bg-[#2563eb] px-5 py-5 sm:px-7 sm:py-6 text-white">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20">
                <Microscope size={22} strokeWidth={2.2} />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-sky-100">
                  Fermentation
                </p>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight leading-tight">
                  Prefermenter Report
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
          selectLabel="Prefermenter No"
          selectValue={typeFilter}
          selectOptions={PF_OPTIONS}
          onSelectChange={setTypeFilter}
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search Setup, Transfer, PF…"
          onAddRow={addRow}
        />

        {isHplc ? (
          <div className="overflow-x-auto">
            <table className="min-w-[1480px] w-full text-left text-[11px] border-collapse">
              <thead>
                <tr className="bg-[#0f2744] text-white font-extrabold uppercase tracking-wider text-[10px]">
                  <th rowSpan={2} className="px-2 py-2.5 border-r border-white/10 w-12 text-center">
                    Sl. No.
                  </th>
                  <th rowSpan={2} className="px-3 py-2.5 border-r border-white/10 min-w-[148px]">
                    Date
                  </th>
                  <th rowSpan={2} className="px-3 py-2.5 border-r border-white/10 min-w-[110px]">
                    Time [h]
                  </th>
                  <th rowSpan={2} className="px-3 py-2.5 border-r border-white/10 min-w-[110px]">
                    Prefermenter No
                  </th>
                  <th colSpan={HPLC_COLS.length} className="px-3 py-2.5 text-center border-r border-white/10 bg-[#5b6570]">
                    HPLC
                  </th>
                  <th rowSpan={2} className="px-3 py-2.5 border-r border-white/10 min-w-[120px] bg-[#0f2744]">
                    Pass Fermenter
                  </th>
                  <th rowSpan={2} className="px-2 py-2.5 w-10" />
                </tr>
                <tr className="bg-[#163056] text-white font-extrabold uppercase tracking-wider text-[10px]">
                  {HPLC_COLS.map((col) => (
                    <th key={col.key} className="px-2 py-2 border-r border-white/10 bg-[#6b7380] min-w-[108px] text-center">
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={HPLC_COL_COUNT} className="px-4 py-12 text-center text-sm font-bold text-stone-400">
                      No readings yet. Click Add row.
                    </td>
                  </tr>
                ) : (
                  <>
                    {filtered.map((row) => (
                      <tr key={row.id} className="bg-white align-top">
                        <td className="px-2 py-1.5 text-center font-bold tabular-nums text-stone-500">{row.slNo}</td>
                        <td className="px-1.5 py-1.5 min-w-[148px]">
                          <DistillerDatePicker compact value={row.date} onChange={(v) => updateRow(row.id, "date", v)} />
                        </td>
                        <td className="px-1.5 py-1.5 min-w-[110px]">
                          <DistillerHourPicker
                            compact
                            value={row.timeH}
                            onChange={(v) => updateRow(row.id, "timeH", v)}
                            placeholder="Hours"
                          />
                        </td>
                        <td className="px-1.5 py-1.5 min-w-[110px]">
                          <DistillerSelect
                            compact
                            value={row.pfNumber}
                            onChange={(v) => updateRow(row.id, "pfNumber", v)}
                            options={[{ value: "", label: "Select" }, ...PF_OPTIONS]}
                            placeholder="PF"
                          />
                        </td>
                        {HPLC_COLS.map((col) => renderDataCell(row, col, "bg-[#f4f5f6]"))}
                        {renderPassFermenterCell(row)}
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
                      <td colSpan={4} className="px-3 py-2.5 text-[#0f2744]">
                        Average
                      </td>
                      {HPLC_COLS.map((col) => (
                        <td key={col.key} className="px-2 py-2 tabular-nums text-[#2563eb]">
                          {hplcAverages[col.key] || ""}
                        </td>
                      ))}
                      <td />
                      <td />
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[2100px] w-full text-left text-[11px] border-collapse">
              <thead>
                <tr className="bg-[#0f2744] text-white font-extrabold uppercase tracking-wider text-[10px]">
                  <th rowSpan={2} className="px-2 py-2.5 border-r border-white/10 w-12 text-center">
                    Sl. No.
                  </th>
                  <th rowSpan={2} className="px-3 py-2.5 border-r border-white/10 min-w-[120px] bg-[#1d4ed8]">
                    Setup / Transfer
                  </th>
                  <th rowSpan={2} className="px-3 py-2.5 border-r border-white/10 min-w-[148px]">
                    Date
                  </th>
                  <th rowSpan={2} className="px-3 py-2.5 border-r border-white/10 min-w-[128px]">
                    Time
                  </th>
                  <th rowSpan={2} className="px-3 py-2.5 border-r border-white/10 min-w-[120px]">
                    Prefermenter No
                  </th>
                  <th
                    colSpan={PREFERMENTER_COLS.length}
                    className="px-3 py-2.5 text-center border-r border-white/10 bg-[#2563eb]"
                  >
                    Prefermenter log
                  </th>
                  <th
                    colSpan={INPUT_COLS.length}
                    className="px-3 py-2.5 text-center border-r border-white/10 bg-[#3b74e8]"
                  >
                    Input data
                  </th>
                  <th rowSpan={2} className="px-3 py-2.5 border-r border-white/10 min-w-[120px] bg-[#0f2744]">
                    Pass Fermenter
                  </th>
                  <th rowSpan={2} className="px-2 py-2.5 w-10" />
                </tr>
                <tr className="bg-[#163056] text-white font-extrabold uppercase tracking-wider text-[10px]">
                  {PREFERMENTER_COLS.map((col) => (
                    <th
                      key={col.key}
                      className="px-2 py-2 border-r border-white/10 bg-[#1d4ed8] min-w-[96px] text-center"
                    >
                      {col.label}
                    </th>
                  ))}
                  {INPUT_COLS.map((col) => (
                    <th
                      key={col.key}
                      className="px-2 py-2 border-r border-white/10 bg-[#2563eb] min-w-[100px] text-center"
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={PF_COL_COUNT} className="px-4 py-12 text-center text-sm font-bold text-stone-400">
                      No readings yet. Click Add row to create Setup + Transfer.
                    </td>
                  </tr>
                ) : (
                  <>
                    {filtered.map((row) => (
                      <tr
                        key={row.id}
                        className={`align-top ${row.stage === "Transfer" ? "bg-sky-50/40" : "bg-white"}`}
                      >
                        <td className="px-2 py-1.5 text-center font-bold tabular-nums text-stone-500">{row.slNo}</td>
                        <td className="px-1.5 py-1.5 min-w-[120px] bg-[#eef3f9]">
                          <DistillerSelect
                            compact
                            value={row.stage}
                            onChange={(v) => updateRow(row.id, "stage", v)}
                            options={[{ value: "", label: "Select" }, ...STAGE_OPTIONS]}
                            placeholder="Stage"
                          />
                        </td>
                        <td className="px-1.5 py-1.5 min-w-[148px]">
                          <DistillerDatePicker compact value={row.date} onChange={(v) => updateRow(row.id, "date", v)} />
                        </td>
                        <td className="px-1.5 py-1.5 min-w-[128px]">
                          <DistillerTimePicker
                            compact
                            value={row.time}
                            onChange={(v) => updateRow(row.id, "time", v)}
                            placeholder="Time"
                          />
                        </td>
                        <td className="px-1.5 py-1.5 min-w-[120px]">
                          <DistillerSelect
                            compact
                            value={row.pfNumber}
                            onChange={(v) => updateRow(row.id, "pfNumber", v)}
                            options={[{ value: "", label: "Select" }, ...PF_OPTIONS]}
                            placeholder="No"
                          />
                        </td>
                        {PREFERMENTER_COLS.map((col) => renderDataCell(row, col, "bg-[#f7faf7]"))}
                        {INPUT_COLS.map((col) => renderDataCell(row, col, "bg-[#eef3f9]"))}
                        {renderPassFermenterCell(row)}
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
                      <td colSpan={5} className="px-3 py-2.5 text-[#0f2744]">
                        Average
                      </td>
                      {CULTURE_COLS.map((col) => (
                        <td key={col.key} className="px-2 py-2 tabular-nums text-[#2563eb]">
                          {averages[col.key] || ""}
                        </td>
                      ))}
                      <td />
                      <td />
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
