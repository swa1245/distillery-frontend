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
import DistillerSelect from "../components/DistillerSelect";

const STORAGE_KEY = "distiller_cell_culturing_table";

const cellInput =
  "w-full min-w-[4.5rem] rounded-md border border-sky-100 bg-white px-1.5 py-1.5 text-[12px] font-semibold text-stone-800 outline-none focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb]/20";

const PF_OPTIONS = ["1", "2"];

const PROCESS_COLS = [
  { key: "pfLevelPct", label: "PF level [%]" },
  { key: "grainInTonnes", label: "Grain In [Tonnes]" },
  { key: "geMashPct", label: "GE mash [% w/w]" },
  { key: "gravity", label: "Gravity" },
  { key: "ph", label: "pH" },
  { key: "temperatureC", label: "Temperature [°C]" },
  { key: "waterM3", label: "m³ water used" },
  { key: "yeastCount", label: "Yeast [10⁶]/ml" },
  { key: "yeastViabilityPct", label: "Yeast viability [%]" },
  { key: "yeastLoadingPct", label: "Yeast loading [%]" },
  { key: "yeastToFermen", label: "Yeast Brand", text: true },
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
  { key: "ethanolPct", label: "Ethanol [% w/v]" },
];

const INPUT_COLS = [
  { key: "yeastKg", label: "Yeast (kg)" },
  { key: "gaBrand", label: "GA brand", text: true },
  { key: "gaKg", label: "GA (kg)" },
  { key: "antimicrobialKg", label: "Antimicrobial (kg)" },
  { key: "ureaKg", label: "Urea (kg)" },
  { key: "mgso4Kg", label: "MgSO4 (kg)" },
  { key: "znso4Kg", label: "ZnSO4 (kg)" },
];

const ALL_DATA_COLS = [...PROCESS_COLS, ...HPLC_COLS, ...INPUT_COLS];
const CULTURE_COLS = [...PROCESS_COLS, ...INPUT_COLS];
const CULTURE_COL_COUNT = 4 + CULTURE_COLS.length + 1;
const HPLC_COL_COUNT = 4 + HPLC_COLS.length + 1;

const VIEW_OPTIONS = [
  { value: "culturing", label: "Cell Culturing" },
  { value: "hplc", label: "HPLC" },
];

function sheetKey(view) {
  return view === "hplc" ? "hplc" : "culturing";
}

const EXPORT_HEADERS = [
  "Sl. No.",
  "Date",
  "Time [h]",
  "PF Number (1/2)",
  ...CULTURE_COLS.map((c) => c.label),
];

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
    timeH: "",
    pfNumber: "",
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
    timeH: row.timeH ?? row.time ?? "",
    pfNumber: row.pfNumber != null ? String(row.pfNumber) : "",
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
  const reportLabel = isHplc ? "HPLC" : "Cell Culturing";

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
      return [row.timeH, row.pfNumber, row.yeastBrand, row.gaBrand, row.yeastToFermen]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [rows, search, typeFilter]);

  const handleExport = () => {
    const headers = isHplc
      ? ["Sl. No.", "Date", "Time [h]", "PF Number (1/2)", ...HPLC_COLS.map((c) => c.label)]
      : EXPORT_HEADERS;
    const exportRows = filtered.map((row) =>
      isHplc
        ? [row.slNo, formatDisplayDate(row.date), row.timeH, row.pfNumber, ...HPLC_COLS.map((c) => row[c.key])]
        : [row.slNo, formatDisplayDate(row.date), row.timeH, row.pfNumber, ...CULTURE_COLS.map((c) => row[c.key])]
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
    const slNo = rows.length ? Math.max(...rows.map((r) => Number(r.slNo) || 0)) + 1 : 1;
    const next = blankRow(slNo, filterDate);
    if (typeFilter) next.pfNumber = typeFilter;
    setRows((prev) => [...prev, next]);
  };

  const removeRow = (id) => {
    setRows((prev) => prev.filter((row) => row.id !== id).map((row, i) => ({ ...row, slNo: i + 1 })));
  };

  const averages = useMemo(() => {
    const next = {};
    for (const col of CULTURE_COLS) {
      next[col.key] = col.text ? "" : formatAvg(filtered.map((row) => row[col.key]));
    }
    return next;
  }, [filtered]);

  const hplcAverages = useMemo(() => {
    const next = {};
    for (const col of HPLC_COLS) {
      next[col.key] = col.text ? "" : formatAvg(filtered.map((row) => row[col.key]));
    }
    return next;
  }, [filtered]);

  const renderDataCell = (row, col, tint) => (
    <td key={col.key} className={`px-1.5 py-1.5 ${tint}`}>
      <input
        className={cellInput}
        inputMode={col.text ? "text" : "decimal"}
        value={row[col.key]}
        onChange={(e) => updateRow(row.id, col.key, e.target.value)}
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
                  Cell Culturing Report
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
          selectLabel="PF Number"
          selectValue={typeFilter}
          selectOptions={PF_OPTIONS}
          onSelectChange={setTypeFilter}
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search PF, brand, hours…"
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
                    PF Number (1/2)
                  </th>
                  <th colSpan={HPLC_COLS.length} className="px-3 py-2.5 text-center border-r border-white/10 bg-[#5b6570]">
                    HPLC
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
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        ) : (
        <div className="overflow-x-auto">
          <table className="min-w-[1680px] w-full text-left text-[11px] border-collapse">
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
                  PF Number (1/2)
                </th>
                {PROCESS_COLS.map((col) => (
                  <th key={col.key} rowSpan={2} className="px-2 py-2.5 border-r border-white/10 min-w-[100px] text-center">
                    {col.label}
                  </th>
                ))}
                <th colSpan={INPUT_COLS.length} className="px-3 py-2.5 text-center border-r border-white/10 bg-[#2563eb]">
                  Input data
                </th>
                <th rowSpan={2} className="px-2 py-2.5 w-10" />
              </tr>
              <tr className="bg-[#163056] text-white font-extrabold uppercase tracking-wider text-[10px]">
                {INPUT_COLS.map((col) => (
                  <th key={col.key} className="px-2 py-2 border-r border-white/10 bg-[#1d4ed8] min-w-[100px] text-center">
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                    <td colSpan={CULTURE_COL_COUNT} className="px-4 py-12 text-center text-sm font-bold text-stone-400">
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
                      {PROCESS_COLS.map((col) => renderDataCell(row, col, ""))}
                      {INPUT_COLS.map((col) => renderDataCell(row, col, "bg-[#eef3f9]"))}
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
                    {CULTURE_COLS.map((col) => (
                      <td key={col.key} className="px-2 py-2 tabular-nums text-[#2563eb]">
                        {averages[col.key] || ""}
                      </td>
                    ))}
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
