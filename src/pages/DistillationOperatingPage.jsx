import { useEffect, useMemo, useState } from "react";
import { Cylinder, FileSpreadsheet, Plus, Save, Trash2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { downloadExcelTable } from "../utils/exportReport";
import { formatDisplayDate as formatSavedDate, todayIso } from "../utils/datedSheetStore";
import ReportFilterBar from "../components/ReportFilterBar";

const STORAGE_KEY = "distiller_distillation_operating";

const cellInput =
  "w-full min-w-[5.5rem] rounded-md border border-sky-100 bg-white px-1.5 py-1.5 text-[12px] font-semibold text-stone-800 outline-none focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb]/20";

const SECTIONS = [
  { id: "A", name: "Mash Stripper Column (Analyser Column)" },
  { id: "B", name: "RS Rectifying cum Stripping Column (PRC)" },
  { id: "C", name: "Deheads Column" },
  { id: "D", name: "Purification Column (ED Column)" },
  { id: "E", name: "ENA Rectifying Column" },
  { id: "F", name: "Simmering Column" },
  { id: "G", name: "Deoil Column (FOC Column)" },
];

const SECTION_MAP = Object.fromEntries(SECTIONS.map((s) => [s.id, s.name]));

const SECTION_OPTIONS = [{ value: "all", label: "All" }, ...SECTIONS.map((s) => ({ value: s.id, label: s.id }))];

const DEFAULT_PARAMS = [
  { section: "A", slNo: "1 A", particulars: "Wash feed flow", unit: "M3", target: "45–50" },
  { section: "A", slNo: "2 A", particulars: "Wash feed temp", unit: "°C", target: "67–69" },
  { section: "A", slNo: "3 A", particulars: "DG top temp", unit: "°C", target: "67–68" },
  { section: "A", slNo: "4 A", particulars: "Analyser column", unit: "°C", target: "70" },
  { section: "A", slNo: "5 A", particulars: "Analyser column", unit: "°C", target: "84–85" },
  { section: "A", slNo: "6 A", particulars: "Analyser column", unit: "Kg/Cm²", target: "0.420–0.450" },

  { section: "B", slNo: "1 B", particulars: "PRC Vacuum", unit: "Kg/Cm²", target: "0.30–0.35" },
  { section: "B", slNo: "2 B", particulars: "PRC Top temp", unit: "°C", target: "48–49" },
  { section: "B", slNo: "3 B", particulars: "PRC draw temp", unit: "°C", target: "49–50" },
  { section: "B", slNo: "4 B", particulars: "PRC LFO temp", unit: "°C", target: "53–55" },
  { section: "B", slNo: "5 B", particulars: "PRC HFO temp", unit: "°C", target: "65–67" },
  { section: "B", slNo: "6 B", particulars: "PRC feed temp", unit: "°C", target: "68–69" },
  { section: "B", slNo: "7 B", particulars: "PRC reflux feed", unit: "LPH", target: "15000–16000" },
  { section: "B", slNo: "8 B", particulars: "PRC bottom temp", unit: "°C", target: "79–80" },

  { section: "C", slNo: "1 C", particulars: "Deheads column", unit: "Kg/Cm²", target: "0.32–0.35" },
  { section: "C", slNo: "2 C", particulars: "Top temp", unit: "°C", target: "41–42" },
  { section: "C", slNo: "3 C", particulars: "Reflux flow", unit: "LPH", target: "2700–3000" },
  { section: "C", slNo: "4 C", particulars: "Bottom temp", unit: "°C", target: "67–69" },

  { section: "D", slNo: "1 D", particulars: "PC top pressure", unit: "Kg/Cm²", target: "1" },
  { section: "D", slNo: "2 D", particulars: "PC top temp", unit: "°C", target: "92–93" },
  { section: "D", slNo: "3 D", particulars: "PC feed temp", unit: "°C", target: "88–90" },
  { section: "D", slNo: "4 D", particulars: "RC lees flow (rec)", unit: "LPH", target: "22000–23000" },
  { section: "D", slNo: "5 D", particulars: "PC DM water", unit: "LPH", target: "8000–10000" },
  { section: "D", slNo: "6 D", particulars: "PC bottom temp", unit: "°C", target: "94–95" },
  { section: "D", slNo: "7 D", particulars: "PC steam flow", unit: "Kgs/Hr", target: "2500–2800" },
  { section: "D", slNo: "8 D", particulars: "PC bottom press", unit: "Kg/Cm²", target: "1.51" },

  { section: "E", slNo: "1 E", particulars: "RC top pressure", unit: "Kg/Cm²", target: "2.3–2.5" },
  { section: "E", slNo: "2 E", particulars: "RC top temp", unit: "°C", target: "96–98" },
  { section: "E", slNo: "3 E", particulars: "RC draw temp", unit: "°C", target: "95–96" },
  { section: "E", slNo: "4 E", particulars: "RC LFO temp", unit: "°C", target: "98–99" },
  { section: "E", slNo: "5 E", particulars: "RC HFO temp", unit: "°C", target: "100–102" },
  { section: "E", slNo: "6 E", particulars: "RC feed temp", unit: "°C", target: "102–104" },
  { section: "E", slNo: "7 E", particulars: "RC reflux", unit: "LPH", target: "28000–29000" },
  { section: "E", slNo: "8 E", particulars: "RC bottom temp", unit: "°C", target: "123–125" },
  { section: "E", slNo: "9 E", particulars: "RC bottom press", unit: "Kg/Cm²", target: "2.58–2.60" },
  { section: "E", slNo: "10 E", particulars: "RC steam flow", unit: "Kgs/Hr", target: "9600–9700" },

  { section: "F", slNo: "1 F", particulars: "Simmering top p", unit: "Kg/Cm²", target: "1" },
  { section: "F", slNo: "2 F", particulars: "Top temp", unit: "°C", target: "71–72" },
  { section: "F", slNo: "3 F", particulars: "Reflux flow", unit: "LPH", target: "5500–6000" },
  { section: "F", slNo: "4 F", particulars: "Bottom temp", unit: "°C", target: "80–82" },
  { section: "F", slNo: "5 F", particulars: "Bottom pressure", unit: "Kg/Cm²", target: "0.98–1.00" },

  { section: "G", slNo: "1 G", particulars: "FOC top pressure", unit: "Kg/Cm²", target: "2.2–2.3" },
  { section: "G", slNo: "2 G", particulars: "FOC top temp", unit: "°C", target: "98–99" },
  { section: "G", slNo: "3 G", particulars: "FOC Draw feed temp", unit: "°C", target: "87–88" },
  { section: "G", slNo: "4 G", particulars: "FOC LFO temp", unit: "°C", target: "102–104" },
  { section: "G", slNo: "5 G", particulars: "FOC HFO temp", unit: "°C", target: "106–109" },
  { section: "G", slNo: "6 G", particulars: "FOC Bottom temp", unit: "°C", target: "125–126" },
  { section: "G", slNo: "7 G", particulars: "FOC Bottom Pressure", unit: "Kg/Cm²", target: "2.5–2.7" },
  { section: "G", slNo: "8 G", particulars: "FOC Reflux flow", unit: "LPH", target: "2500–2600" },
  { section: "G", slNo: "9 G", particulars: "FOC Steam flow", unit: "Kgs/Hr", target: "1100–1200" },
];

function defaultRows() {
  return DEFAULT_PARAMS.map((p, i) => ({
    id: `def-${p.section}-${i + 1}`,
    section: p.section,
    slNo: p.slNo,
    particulars: p.particulars,
    unit: p.unit,
    target: p.target,
    actual: "",
  }));
}

function parseRange(target) {
  const s = String(target || "")
    .replace(/[–—]/g, "-")
    .trim();
  const m = s.match(/^(-?\d+(?:\.\d+)?)\s*-\s*(-?\d+(?:\.\d+)?)$/);
  if (m) return { min: Number(m[1]), max: Number(m[2]) };
  const n = Number(s);
  if (Number.isFinite(n)) return { min: n, max: n };
  return null;
}

function readingStatus(actual, target) {
  const raw = String(actual ?? "").trim();
  if (!raw) return { label: "—", kind: "empty" };
  const n = Number(raw.replace(/,/g, ""));
  const range = parseRange(target);
  if (!Number.isFinite(n) || !range) return { label: "—", kind: "empty" };
  if (n >= range.min && n <= range.max) return { label: "In range", kind: "ok" };
  return { label: "Out of range", kind: "bad" };
}

function nextSlNo(rows, sectionId) {
  const nums = rows
    .filter((r) => r.section === sectionId)
    .map((r) => Number(String(r.slNo || "").match(/^(\d+)/)?.[1] || 0));
  const n = nums.length ? Math.max(...nums) + 1 : 1;
  return `${n} ${sectionId}`;
}

function blankRow(sectionId, slNo) {
  return {
    id: `r-${Date.now()}-${sectionId}-${Math.random().toString(36).slice(2, 7)}`,
    section: sectionId,
    slNo,
    particulars: "",
    unit: "",
    target: "",
    actual: "",
  };
}

function hydrateRow(row, i) {
  const section = SECTIONS.some((s) => s.id === row.section) ? row.section : "A";
  return {
    id: row.id && String(row.id).startsWith("r-") ? row.id : `r-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 7)}`,
    section,
    slNo: row.slNo || nextSlNo([], section),
    particulars: row.particulars || "",
    unit: row.unit || "",
    target: row.target || "",
    actual: row.actual || row.output || "",
  };
}

function loadStore() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (raw?.sheets && typeof raw.sheets === "object") return { sheets: raw.sheets };
  } catch {
    /* ignore */
  }
  return { sheets: {} };
}

function readSheetRows(sheet) {
  if (Array.isArray(sheet)) return sheet.map((row, i) => hydrateRow(row, i));
  return [];
}

function saveStore(store) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ sheets: store.sheets || {} }));
}

function listDates(store) {
  return Object.keys(store.sheets || {}).sort((a, b) => b.localeCompare(a));
}

export default function DistillationOperatingPage() {
  const { user } = useAuth();
  const [filterDate, setFilterDate] = useState(todayIso);
  const [sectionFilter, setSectionFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [savedDates, setSavedDates] = useState([]);
  const [rows, setRows] = useState([]);
  const [flashMsg, setFlashMsg] = useState("");
  const [statusType, setStatusType] = useState("ok");
  const orgName = user?.organizationName || "Digital Distillery";

  const refreshDates = () => setSavedDates(listDates(loadStore()));

  useEffect(() => {
    const store = loadStore();
    const saved = readSheetRows(store.sheets?.[filterDate]);
    setRows(saved.length ? saved : defaultRows());
    refreshDates();
  }, [filterDate]);

  const flash = (message, type = "ok") => {
    setFlashMsg(message);
    setStatusType(type);
    window.setTimeout(() => setFlashMsg(""), 2800);
  };

  const handleSave = () => {
    const store = loadStore();
    store.sheets[filterDate] = rows;
    saveStore(store);
    refreshDates();
    flash("Report saved.");
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (sectionFilter !== "all" && row.section !== sectionFilter) return false;
      if (!q) return true;
      return [row.slNo, row.section, SECTION_MAP[row.section], row.particulars, row.unit, row.target, row.actual]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [rows, search, sectionFilter]);

  const visibleSections = useMemo(() => {
    if (sectionFilter === "all") return SECTIONS;
    return SECTIONS.filter((s) => s.id === sectionFilter);
  }, [sectionFilter]);

  const handleExport = () => {
    const headers = ["Sl. No.", "Section", "Particulars", "Unit", "Parameters", "Output", "Status"];
    const groups = visibleSections.map((sec) => ({
      title: `${sec.id}.  ${sec.name}`,
      rows: filtered
        .filter((row) => row.section === sec.id)
        .map((row) => {
          const st = readingStatus(row.actual, row.target);
          return [
            row.slNo,
            SECTION_MAP[row.section] || row.section,
            row.particulars,
            row.unit,
            row.target,
            row.actual,
            st.label,
          ];
        }),
    }));
    downloadExcelTable({
      fileName: `Distillation_Operating_Parameters_${filterDate}.xlsx`,
      title: "Distillation Operating Parameters",
      companyName: orgName,
      headers,
      rows: [],
      groups,
      sheetName: "Operating Parameters",
      subtitle: `${formatSavedDate(filterDate)}  ·  ${filtered.length} ${filtered.length === 1 ? "entry" : "entries"}`,
    });
    flash("Report exported.");
  };

  const updateRow = (id, field, value) => {
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, [field]: value } : row)));
  };

  const addRow = (sectionId) => {
    setRows((prev) => [...prev, blankRow(sectionId, nextSlNo(prev, sectionId))]);
  };

  const removeRow = (id) => {
    setRows((prev) => {
      const removed = prev.find((r) => r.id === id);
      const next = prev.filter((r) => r.id !== id);
      if (!removed) return next;
      let n = 1;
      return next.map((row) => {
        if (row.section !== removed.section) return row;
        const updated = { ...row, slNo: `${n} ${row.section}` };
        n += 1;
        return updated;
      });
    });
  };

  return (
    <div className="w-full min-h-full px-4 sm:px-6 lg:px-8 py-5">
      <section className="w-full overflow-hidden rounded-2xl border border-sky-200/80 bg-white shadow-[0_8px_28px_rgba(15,39,68,0.08)]">
        <div className="bg-[#2563eb] px-5 py-5 sm:px-7 sm:py-6 text-white">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20">
                <Cylinder size={22} strokeWidth={2.2} />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-sky-100">
                  Distillery
                </p>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight leading-tight">
                  Distillation Operating Parameters
                </h1>
                <p className="mt-0.5 text-xs font-semibold text-white/70 truncate">{orgName}</p>
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

        {flashMsg ? (
          <div
            className={`px-5 py-2 text-xs font-bold sm:px-7 ${
              statusType === "ok" ? "bg-sky-50 text-[#2563eb]" : "bg-rose-50 text-rose-700"
            }`}
          >
            {flashMsg}
          </div>
        ) : null}

        <ReportFilterBar
          date={filterDate}
          onDateChange={setFilterDate}
          savedDates={savedDates}
          formatDate={formatSavedDate}
          typeLabel="Section"
          typeValue={sectionFilter}
          typeOptions={SECTION_OPTIONS}
          typeStyle="buttons"
          onTypeChange={setSectionFilter}
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search particulars, unit, parameters…"
        />

        <div className="overflow-x-auto">
          <table className="min-w-[1080px] w-full text-left text-[12px] border-collapse">
            <thead>
              <tr className="bg-[#0f2744] text-white font-extrabold uppercase tracking-wider text-[10px]">
                <th className="px-3 py-2.5 border-r border-white/10 w-16 text-center">Sl. No.</th>
                <th className="px-3 py-2.5 border-r border-white/10 min-w-[220px]">Section</th>
                <th className="px-3 py-2.5 border-r border-white/10 min-w-[220px]">Particulars</th>
                <th className="px-3 py-2.5 border-r border-white/10 w-28 text-center">Unit</th>
                <th className="px-3 py-2.5 border-r border-white/10 w-36 text-center">Parameters</th>
                <th className="px-3 py-2.5 border-r border-white/10 w-36 text-center">Output</th>
                <th className="px-3 py-2.5 border-r border-white/10 w-32 text-center">Status</th>
                <th className="px-2 py-2.5 w-10" />
              </tr>
            </thead>
            <tbody>
              {visibleSections.map((sec) => {
                const secRows = filtered.filter((row) => row.section === sec.id);
                return (
                  <SectionBlock
                    key={sec.id}
                    section={sec}
                    rows={secRows}
                    onAdd={() => addRow(sec.id)}
                    onUpdate={updateRow}
                    onRemove={removeRow}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function SectionBlock({ section, rows, onAdd, onUpdate, onRemove }) {
  return (
    <>
      <tr className="bg-[#eef3f9]">
        <td colSpan={8} className="px-3 py-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] font-black uppercase tracking-wider text-[#0f2744]">
              {section.id}. {section.name}
            </p>
            <button
              type="button"
              onClick={onAdd}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#2563eb] px-2.5 text-xs font-bold text-white hover:bg-[#163056]"
            >
              <Plus size={14} strokeWidth={2.4} />
              Add row
            </button>
          </div>
        </td>
      </tr>
      {rows.length === 0 ? (
        <tr className="border-b border-sky-50">
          <td colSpan={8} className="px-3 py-4 text-center text-xs font-bold text-stone-400">
            No rows in this section. Click Add row.
          </td>
        </tr>
      ) : (
        rows.map((row) => {
          const st = readingStatus(row.actual, row.target);
          const tint =
            st.kind === "ok"
              ? "border-sky-300 bg-sky-50"
              : st.kind === "bad"
                ? "border-rose-300 bg-rose-50"
                : "";
          return (
            <tr key={row.id} className="bg-white border-b border-sky-50 align-top">
              <td className="px-3 py-1.5 text-center font-bold tabular-nums text-stone-500">{row.slNo}</td>
              <td className="px-3 py-1.5 font-semibold text-stone-600">{section.name}</td>
              <td className="px-2 py-1.5">
                <input
                  className={cellInput}
                  value={row.particulars}
                  onChange={(e) => onUpdate(row.id, "particulars", e.target.value)}
                  placeholder="Particulars"
                />
              </td>
              <td className="px-2 py-1.5">
                <input
                  className={cellInput}
                  value={row.unit}
                  onChange={(e) => onUpdate(row.id, "unit", e.target.value)}
                  placeholder="Unit"
                />
              </td>
              <td className="px-2 py-1.5">
                <input
                  className={cellInput}
                  value={row.target}
                  onChange={(e) => onUpdate(row.id, "target", e.target.value)}
                  placeholder="e.g. 45–50"
                />
              </td>
              <td className="px-2 py-1.5">
                <input
                  className={`${cellInput} ${tint}`}
                  inputMode="decimal"
                  value={row.actual}
                  onChange={(e) => onUpdate(row.id, "actual", e.target.value)}
                  placeholder="Output"
                />
              </td>
              <td className="px-3 py-1.5 text-center">
                <span
                  className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${
                    st.kind === "ok"
                      ? "bg-sky-100 text-[#2563eb]"
                      : st.kind === "bad"
                        ? "bg-rose-100 text-rose-700"
                        : "text-stone-400"
                  }`}
                >
                  {st.label}
                </span>
              </td>
              <td className="px-1 py-1.5 text-center">
                <button
                  type="button"
                  onClick={() => onRemove(row.id)}
                  className="rounded-md p-1.5 text-stone-400 hover:bg-rose-50 hover:text-rose-600"
                  aria-label="Delete row"
                >
                  <Trash2 size={14} />
                </button>
              </td>
            </tr>
          );
        })
      )}
    </>
  );
}
