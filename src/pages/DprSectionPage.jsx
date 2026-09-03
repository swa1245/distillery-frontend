import { useEffect, useMemo, useState } from "react";
import { FileSpreadsheet, Save } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { downloadExcelTable } from "../utils/exportReport";
import { loadSheetStore, saveSheetStore, todayIso } from "../utils/datedSheetStore";
import ReportFilterBar from "../components/ReportFilterBar";
import { DPR_SECTIONS } from "../data/dprSections";

const DAY_COUNT = 5;

const cellInput =
  "w-full min-w-[4.25rem] rounded-md border border-sky-100 bg-white px-1.5 py-1.5 text-[12px] font-semibold text-stone-800 outline-none focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb]/20";
const cellRead =
  "w-full min-w-[4.25rem] rounded-md border border-sky-100 bg-[#eef3f9] px-1.5 py-1.5 text-[12px] font-bold text-[#0f2744]";

function parseIso(iso) {
  const m = String(iso || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

function toIso(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function addDaysIso(iso, delta) {
  const d = parseIso(iso);
  if (!d) return iso;
  d.setDate(d.getDate() + delta);
  return toIso(d);
}

function dateWindow(endIso, count = DAY_COUNT) {
  return Array.from({ length: count }, (_, i) => addDaysIso(endIso, i - (count - 1)));
}

function formatHeaderDate(iso) {
  const d = parseIso(iso);
  if (!d) return iso;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}-${mm}-${d.getFullYear()}`;
}

function toNum(v) {
  const n = Number(String(v ?? "").replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : null;
}

function rowAvg(row, dates) {
  const vals = dates.map((d) => toNum(row.values?.[d])).filter((n) => n != null);
  if (!vals.length) return "";
  return String(Number((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(3)));
}

function loadSaved(storage) {
  const store = loadSheetStore(storage);
  const raw = store.sheets?.register;
  if (raw && typeof raw === "object" && !Array.isArray(raw) && raw.byKey) {
    return raw.byKey;
  }
  // migrate old array format
  if (Array.isArray(raw)) {
    const byKey = {};
    raw.forEach((row, i) => {
      const key = row.key || `legacy_${i}`;
      byKey[key] = {
        agreed: row.agreed || "",
        values: row.values && typeof row.values === "object" ? row.values : {},
      };
    });
    return byKey;
  }
  return {};
}

function saveSaved(storage, byKey) {
  saveSheetStore(storage, { sheets: { register: { byKey } } });
}

function buildRows(defaults, savedByKey) {
  return defaults.map((def, i) => {
    const saved = savedByKey?.[def.key] || {};
    return {
      key: def.key,
      slNo: i + 1,
      parameter: def.parameter,
      unit: def.unit,
      agreed: saved.agreed ?? "",
      values: saved.values && typeof saved.values === "object" ? saved.values : {},
    };
  });
}

export default function DprSectionPage({ sectionId }) {
  const { user } = useAuth();
  const config = DPR_SECTIONS[sectionId] || DPR_SECTIONS.distillation;
  const defaults = config.rows || [];
  const [endDate, setEndDate] = useState(todayIso);
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState("");
  const orgName = user?.organizationName || "Digital Distillery";
  const dates = useMemo(() => dateWindow(endDate), [endDate]);
  const colCount = 5 + dates.length;

  useEffect(() => {
    setSearch("");
    setRows(buildRows(defaults, loadSaved(config.storage)));
  }, [sectionId, config.storage, defaults]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => [row.slNo, row.parameter, row.unit, row.agreed].join(" ").toLowerCase().includes(q));
  }, [rows, search]);

  const flash = (msg) => {
    setStatus(msg);
    window.setTimeout(() => setStatus(""), 2200);
  };

  const patchAgreed = (key, value) => {
    setRows((prev) => prev.map((row) => (row.key === key ? { ...row, agreed: value } : row)));
  };

  const patchValue = (key, date, value) => {
    setRows((prev) =>
      prev.map((row) => (row.key === key ? { ...row, values: { ...row.values, [date]: value } } : row))
    );
  };

  const handleSave = () => {
    const byKey = {};
    rows.forEach((row) => {
      byKey[row.key] = { agreed: row.agreed, values: row.values || {} };
    });
    saveSaved(config.storage, byKey);
    flash("Table saved.");
  };

  const handleExport = () => {
    downloadExcelTable({
      fileName: `DPR_${config.banner.replace(/\s+/g, "_")}_${endDate}.xlsx`,
      title: config.banner,
      companyName: orgName,
      headers: ["S.No.", "Parameter", "Unit", "Agreed Parameter", ...dates.map(formatHeaderDate), "Avg"],
      rows: filtered.map((row) => [
        row.slNo,
        row.parameter,
        row.unit,
        row.agreed,
        ...dates.map((d) => row.values?.[d] || ""),
        rowAvg(row, dates),
      ]),
      sheetName: config.title.slice(0, 31),
      subtitle: `${formatHeaderDate(dates[0])}  –  ${formatHeaderDate(endDate)}  ·  ${filtered.length} ${filtered.length === 1 ? "row" : "rows"}`,
    });
    flash("Table exported.");
  };

  return (
    <div className="w-full min-h-full px-4 sm:px-6 lg:px-8 py-5">
      <section className="w-full overflow-hidden rounded-2xl border border-sky-200/80 bg-white shadow-[0_8px_28px_rgba(15,39,68,0.08)]">
        <div className="bg-[#2563eb] px-5 py-5 sm:px-7 sm:py-6 text-white">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-sky-100">DPR</p>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight leading-tight">{config.title}</h1>
              <p className="mt-0.5 text-xs font-semibold text-white/70 truncate">
                {orgName} · {config.hint}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="rounded-xl bg-white/12 px-3.5 py-2 ring-1 ring-white/15">
                <p className="text-[9px] font-extrabold uppercase tracking-wider text-sky-100/80">Rows</p>
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

        {status ? <div className="bg-sky-50 px-5 py-2 text-xs font-bold text-[#2563eb] sm:px-7">{status}</div> : null}

        <ReportFilterBar
          date={endDate}
          onDateChange={setEndDate}
          savedDates={[]}
          formatDate={formatHeaderDate}
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search parameter, unit…"
        />

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1180px] border-collapse text-left">
            <thead>
              <tr className="bg-[#0f2744] text-white">
                <th colSpan={colCount} className="px-3 py-2.5 text-center text-[12px] font-black uppercase tracking-[0.14em]">
                  {config.banner}
                </th>
              </tr>
              <tr className="bg-[#163056] text-[10px] font-extrabold uppercase tracking-wider text-sky-100">
                <th className="px-3 py-2.5 whitespace-nowrap sticky left-0 z-10 bg-[#163056]">S.No.</th>
                <th className="px-3 py-2.5 min-w-[220px] sticky left-[52px] z-10 bg-[#163056]">Parameter</th>
                <th className="px-3 py-2.5 whitespace-nowrap sticky left-[272px] z-10 bg-[#163056]">Unit</th>
                <th className="px-3 py-2.5 min-w-[140px]">Agreed Parameter</th>
                {dates.map((d) => (
                  <th key={d} className="px-3 py-2.5 whitespace-nowrap text-center">
                    {formatHeaderDate(d)}
                  </th>
                ))}
                <th className="px-3 py-2.5 text-center">Avg</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.key} className="border-b border-sky-50">
                  <td className="px-3 py-1.5 text-center text-[12px] font-extrabold tabular-nums text-[#0f2744] sticky left-0 z-[1] bg-white">
                    {row.slNo}
                  </td>
                  <td className="px-2 py-1.5 sticky left-[52px] z-[1] bg-white">
                    <input className={cellRead} value={row.parameter} readOnly tabIndex={-1} />
                  </td>
                  <td className="px-2 py-1.5 w-28 sticky left-[272px] z-[1] bg-white">
                    <input className={cellRead} value={row.unit} readOnly tabIndex={-1} />
                  </td>
                  <td className="px-2 py-1.5 w-36">
                    <input className={cellInput} value={row.agreed} onChange={(e) => patchAgreed(row.key, e.target.value)} />
                  </td>
                  {dates.map((d) => (
                    <td key={d} className="px-2 py-1.5 w-[7.5rem]">
                      <input
                        className={`${cellInput} text-center`}
                        value={row.values?.[d] || ""}
                        onChange={(e) => patchValue(row.key, d, e.target.value)}
                      />
                    </td>
                  ))}
                  <td className="px-3 py-1.5 text-center text-[12px] font-extrabold tabular-nums text-[#0f2744]">
                    {rowAvg(row, dates)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t border-sky-100 bg-[#f8fafc] px-5 py-3 sm:px-7">
          <p className="text-[11px] font-semibold text-stone-400">
            Parameter and Unit stay fixed. Change the end date to shift the 5-day columns; only date values and Avg update.
          </p>
        </div>
      </section>
    </div>
  );
}
