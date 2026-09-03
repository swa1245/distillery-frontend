import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Cog, FileSpreadsheet, Save, Trash2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { downloadExcelTable } from "../utils/exportReport";
import {
  formatDisplayDate as formatSavedDate,
  listSheetDates,
  loadSheetStore,
  saveSheetStore,
  todayIso,
} from "../utils/datedSheetStore";
import ReportFilterBar from "../components/ReportFilterBar";
import DistillerDatePicker from "../components/DistillerDatePicker";
import DistillerTimePicker from "../components/DistillerTimePicker";
import DistillerSelect from "../components/DistillerSelect";

const STORAGE_KEY = "distiller_milling_flour_analysis";

const cellInput =
  "w-full min-w-[4.5rem] rounded-md border border-sky-100 bg-white px-1.5 py-1.5 text-[12px] font-semibold text-stone-800 outline-none focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb]/20";

const FEEDSTOCKS = ["Maize", "Rice", "Mixed"];

const SHIFTS = [
  { key: "A", label: "A Shift", times: ["7:00 AM", "9:00 AM", "11:00 AM", "1:00 PM"] },
  { key: "B", label: "B Shift", times: ["3:00 PM", "5:00 PM", "7:00 PM", "9:00 PM"] },
  { key: "C", label: "C Shift", times: ["11:00 PM", "1:00 AM", "3:00 AM", "5:00 AM"] },
];

const MILLING_COLS = [
  { key: "um12", label: "1.2 um" },
  { key: "um1", label: "1 um" },
  { key: "um085", label: "0.85 um" },
  { key: "um06", label: "0.6 um" },
  { key: "um03", label: "0.3 um" },
  { key: "finePowder", label: "Fine powder" },
];

const VALUE_KEYS = MILLING_COLS.map((c) => c.key);
const COL_COUNT = 14;

const EXPORT_HEADERS = [
  "Sl. No.",
  "Date",
  "Time",
  "Feedstock",
  "% Corn",
  "1.2 um",
  "1 um",
  "0.85 um",
  "0.6 um",
  "0.3 um",
  "Fine powder",
  "Starch %",
  "Remarks",
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

function parseClockMins(label) {
  const m = String(label || "").match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!m) return null;
  let h = Number(m[1]);
  const min = Number(m[2]);
  const ap = m[3].toUpperCase();
  if (ap === "PM" && h !== 12) h += 12;
  if (ap === "AM" && h === 12) h = 0;
  return h * 60 + min;
}

function shiftForTime(time) {
  const mins = parseClockMins(time);
  if (mins == null) return "";
  if (mins >= 7 * 60 && mins < 15 * 60) return "A";
  if (mins >= 15 * 60 && mins < 23 * 60) return "B";
  return "C";
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
    shift: "",
    time: "",
    date,
    feedstock: "",
    cornPct: "",
    um12: "",
    um1: "",
    um085: "",
    um06: "",
    um03: "",
    finePowder: "",
    starch: "",
    remarks: "",
  };
}

function hydrateRow(row, date, slNo) {
  const time = row.time || "";
  const base = blankRow(slNo, date);
  return {
    ...base,
    ...row,
    slNo,
    id: row.id && String(row.id).startsWith("r-") ? row.id : base.id,
    date: row.date || date,
    time,
    shift: row.shift || shiftForTime(time),
    feedstock: row.feedstock ?? "",
    cornPct: row.cornPct ?? "",
    um12: row.um12 ?? "",
    um1: row.um1 ?? row.coarse1 ?? "",
    um085: row.um085 ?? row.coarse085 ?? "",
    um06: row.um06 ?? row.medium600 ?? "",
    um03: row.um03 ?? row.medium300 ?? "",
    finePowder: row.finePowder ?? row.fines ?? "",
  };
}

function isLegacyDefaultSheet(rows) {
  if (!Array.isArray(rows) || rows.length !== 12) return false;
  const expected = new Set(SHIFTS.flatMap((s) => s.times.map((t) => `${s.key}-${t}`)));
  return rows.every((row) => expected.has(row.id));
}

function loadMillingStore() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (Array.isArray(raw?.rows) && !raw.sheets) {
      if (isLegacyDefaultSheet(raw.rows)) return { sheets: {} };
      const d = String(raw.date || "").slice(0, 10) || todayIso();
      return { sheets: { [d]: raw.rows } };
    }
  } catch {
    /* ignore */
  }
  return loadSheetStore(STORAGE_KEY);
}

function rowToExport(row) {
  return [
    row.slNo,
    formatDisplayDate(row.date),
    row.time,
    row.feedstock,
    row.cornPct,
    row.um12,
    row.um1,
    row.um085,
    row.um06,
    row.um03,
    row.finePowder,
    row.starch,
    row.remarks,
  ];
}

export default function MillingFlourAnalysisPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [filterDate, setFilterDate] = useState(todayIso);
  const [typeFilter, setTypeFilter] = useState("");
  const [search, setSearch] = useState("");
  const [savedDates, setSavedDates] = useState([]);
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState("");
  const [statusType, setStatusType] = useState("ok");
  const orgName = user?.organizationName || "Digital Distillery";

  const refreshDates = () => setSavedDates(listSheetDates(loadMillingStore()));

  const hydrateRows = (list, date) => {
    if (!Array.isArray(list) || !list.length) return [];
    return list.map((row, i) => hydrateRow(row, date, i + 1));
  };

  useEffect(() => {
    refreshDates();
  }, []);

  useEffect(() => {
    const store = loadMillingStore();
    setRows(hydrateRows(store.sheets?.[filterDate], filterDate));
  }, [filterDate]);

  const flash = (message, type = "ok") => {
    setStatus(message);
    setStatusType(type);
    window.setTimeout(() => setStatus(""), 2800);
  };

  const handleSave = () => {
    const store = loadMillingStore();
    store.sheets[filterDate] = rows.map((row) => ({ ...row, date: row.date || filterDate }));
    saveSheetStore(STORAGE_KEY, store);
    refreshDates();
    flash("Report saved.");
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (typeFilter && row.feedstock !== typeFilter) return false;
      if (!q) return true;
      return [row.time, row.feedstock, row.remarks, row.date]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [rows, search, typeFilter]);

  const handleExport = () => {
    downloadExcelTable({
      fileName: `Milling_Flour_Analysis_${filterDate}.xlsx`,
      title: "Milling flour analysis",
      companyName: orgName,
      headers: EXPORT_HEADERS,
      rows: filtered.map(rowToExport),
      sheetName: "Milling data",
      subtitle: `Current readings & milling data  ·  ${formatSavedDate(filterDate)}  ·  ${filtered.length} ${
        filtered.length === 1 ? "entry" : "entries"
      }`,
    });
    flash("Report exported.");
  };

  const updateRow = (id, field, value) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        const next = { ...row, [field]: value };
        if (field === "time") next.shift = shiftForTime(value);
        return next;
      })
    );
  };

  const addRow = () => {
    const slNo = rows.length ? Math.max(...rows.map((r) => Number(r.slNo) || 0)) + 1 : 1;
    const next = blankRow(slNo, filterDate);
    if (typeFilter) next.feedstock = typeFilter;
    setRows((prev) => [...prev, next]);
  };

  const removeRow = (id) => {
    setRows((prev) => prev.filter((row) => row.id !== id).map((row, i) => ({ ...row, slNo: i + 1 })));
  };

  const averages = useMemo(() => {
    const next = {};
    for (const key of VALUE_KEYS) next[key] = formatAvg(filtered.map((row) => row[key]));
    next.starch = formatAvg(filtered.map((row) => row.starch));
    next.cornPct = formatAvg(filtered.map((row) => row.cornPct));
    return next;
  }, [filtered]);

  const stopped = (row) => /stop/i.test(String(row.remarks || ""));
  const grouped = SHIFTS.map((shift) => ({
    shift,
    rows: filtered.filter((row) => row.shift === shift.key),
  })).filter((g) => g.rows.length);
  const ungrouped = filtered.filter((row) => !row.shift);

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
                <Cog size={22} strokeWidth={2.2} />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-sky-100">
                  Milling
                </p>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight leading-tight">
                  Milling Flour Analysis Report
                </h1>
                <p className="mt-0.5 text-xs font-semibold text-white/70 truncate">
                  {orgName} · Current readings & milling data
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
          typeLabel="Feedstock"
          typeValue={typeFilter}
          typeOptions={FEEDSTOCKS}
          onTypeChange={setTypeFilter}
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search time, feedstock, remarks…"
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
                <th rowSpan={2} className="px-3 py-2.5 border-r border-white/10 bg-[#2563eb] min-w-[140px]">
                  Feedstock
                </th>
                <th rowSpan={2} className="px-3 py-2.5 border-r border-white/10 bg-[#2563eb] min-w-[90px]">
                  % Corn
                </th>
                <th colSpan={6} className="px-3 py-2.5 text-center border-r border-white/10 bg-[#3b74e8]">
                  Milling data
                </th>
                <th rowSpan={2} className="px-3 py-2.5 border-r border-white/10 min-w-[90px]">
                  Starch %
                </th>
                <th rowSpan={2} className="px-3 py-2.5 min-w-[200px]">
                  Remarks
                </th>
                <th rowSpan={2} className="px-2 py-2.5 w-10" />
              </tr>
              <tr className="bg-[#163056] text-white font-extrabold uppercase tracking-wider text-[10px]">
                <th className="px-3 py-2 border-r border-white/10 min-w-[148px]">Date</th>
                <th className="px-3 py-2 border-r border-white/10 min-w-[128px]">Time</th>
                {MILLING_COLS.map((col) => (
                  <th
                    key={col.key}
                    className="px-2 py-2 border-r border-white/10 bg-[#1d4ed8] min-w-[100px] text-center"
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={COL_COUNT} className="px-4 py-12 text-center text-sm font-bold text-stone-400">
                    No readings yet. Click Add row.
                  </td>
                </tr>
              ) : (
                <>
                  {grouped.map(({ shift, rows: shiftRows }) => (
                    <ShiftBlock
                      key={shift.key}
                      label={shift.label}
                      rows={shiftRows}
                      updateRow={updateRow}
                      removeRow={removeRow}
                      stopped={stopped}
                    />
                  ))}
                  {ungrouped.length ? (
                    <ShiftBlock
                      label="Readings"
                      rows={ungrouped}
                      updateRow={updateRow}
                      removeRow={removeRow}
                      stopped={stopped}
                    />
                  ) : null}
                  <tr className="bg-[#eef3f9] font-bold">
                    <td colSpan={4} className="px-3 py-2.5 text-[#0f2744]">
                      Average
                    </td>
                    <td className="px-2 py-2 tabular-nums text-[#2563eb]">{averages.cornPct}</td>
                    {VALUE_KEYS.map((key) => (
                      <td key={key} className="px-2 py-2 tabular-nums text-[#2563eb]">
                        {averages[key]}
                      </td>
                    ))}
                    <td className="px-2 py-2 tabular-nums text-[#2563eb]">{averages.starch}</td>
                    <td />
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

function ShiftBlock({ label, rows, updateRow, removeRow, stopped }) {
  return (
    <>
      <tr className="bg-[#e8f0fe]">
        <td colSpan={COL_COUNT} className="px-3 py-2 text-[11px] font-black uppercase tracking-[0.14em] text-[#0f2744]">
          {label}
        </td>
      </tr>
      {rows.map((row) => (
        <tr key={row.id} className={stopped(row) ? "bg-amber-50/70" : "bg-white"}>
          <td className="px-2 py-1.5 text-center font-bold tabular-nums text-stone-500">{row.slNo}</td>
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
          <td className="px-1.5 py-1.5 min-w-[140px] bg-[#eef3f9]">
            <DistillerSelect
              compact
              value={row.feedstock}
              onChange={(v) => updateRow(row.id, "feedstock", v)}
              options={[{ value: "", label: "Select" }, ...FEEDSTOCKS]}
              placeholder="Select"
            />
          </td>
          <td className="px-1.5 py-1.5 bg-[#eef3f9]">
            <input
              className={cellInput}
              inputMode="decimal"
              value={row.cornPct}
              onChange={(e) => updateRow(row.id, "cornPct", e.target.value)}
            />
          </td>
          {MILLING_COLS.map((col) => (
            <td key={col.key} className="px-1.5 py-1.5 bg-[#f7faf7]">
              <input
                className={cellInput}
                inputMode="decimal"
                value={row[col.key]}
                onChange={(e) => updateRow(row.id, col.key, e.target.value)}
              />
            </td>
          ))}
          <td className="px-1.5 py-1.5">
            <input className={cellInput} inputMode="decimal" value={row.starch} onChange={(e) => updateRow(row.id, "starch", e.target.value)} />
          </td>
          <td className="px-1.5 py-1.5">
            <input
              className={cellInput}
              value={row.remarks}
              onChange={(e) => updateRow(row.id, "remarks", e.target.value)}
              placeholder="Remarks"
            />
          </td>
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
    </>
  );
}
