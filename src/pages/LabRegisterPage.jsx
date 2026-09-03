import { useEffect, useMemo, useState } from "react";
import { FileSpreadsheet, Save, TestTube2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { downloadExcelTable } from "../utils/exportReport";
import { formatDisplayDate as formatSavedDate, todayIso } from "../utils/datedSheetStore";
import ReportFilterBar from "../components/ReportFilterBar";
import DistillerSelect from "../components/DistillerSelect";

const STORAGE_KEY = "distiller_lab_analysis_register";

const cellInput =
  "w-full min-w-[4.5rem] rounded-md border border-sky-100 bg-white px-1.5 py-1.5 text-[12px] font-semibold text-stone-800 outline-none focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb]/20";
const headerInput =
  "w-full rounded-lg border border-sky-200/80 bg-white px-2.5 py-2 text-sm font-semibold text-stone-800 outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/15";
const labelCls = "mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-stone-500";

const SHIFTS = ["A", "B", "C"];

const SECTIONS = {
  grain: {
    title: "1. GRAIN ANALYSIS TABLE",
    short: "Grain",
    sources: ["Raw Grain", "After Cleaning", "After Milling (Flour)"],
    parameters: [
      { key: "moisture", label: "Moisture", unit: "% w/w", method: "IS / Oven" },
      { key: "starch", label: "Starch Content", unit: "% w/w", method: "Polarimetry" },
      { key: "protein", label: "Protein (N×6.25)", unit: "% w/w", method: "Kjeldahl" },
      { key: "fat", label: "Fat", unit: "% w/w", method: "Soxhlet" },
      { key: "ash", label: "Ash", unit: "% w/w", method: "Muffle Furnace" },
      { key: "crudeFiber", label: "Crude Fiber", unit: "% w/w", method: "Gravimetric" },
      { key: "foreignMatter", label: "Foreign Matter", unit: "% w/w", method: "Sieving" },
      { key: "brokenDamaged", label: "Broken / Damaged Grains", unit: "% w/w", method: "Sieving" },
      { key: "testWeight", label: "Test Weight", unit: "kg/hl", method: "IS Method" },
      { key: "phSoaked", label: "pH (Soaked)", unit: "—", method: "pH Meter" },
    ],
  },
  slurry: {
    title: "2. SLURRY (MASH) ANALYSIS TABLE",
    short: "Slurry",
    sources: ["Liquefaction Slurry", "Pre-Fermenter Mash", "Fermenter Mash"],
    parameters: [
      { key: "totalSolids", label: "Total Solids", unit: "% w/w", method: "Gravimetric" },
      { key: "tds", label: "Total Dissolved Solids", unit: "% w/w", method: "Gravimetric" },
      { key: "tss", label: "Total Suspended Solids", unit: "% w/w", method: "Gravimetric" },
      { key: "brix", label: "Brix", unit: "°Bx", method: "Refractometer" },
      { key: "ph", label: "pH", unit: "—", method: "pH Meter" },
      { key: "viscosity", label: "Viscosity", unit: "cP", method: "Viscometer" },
      { key: "temperature", label: "Temperature", unit: "°C", method: "Thermometer" },
      { key: "enzymeDosage", label: "Enzyme Dosage", unit: "ppm", method: "Calculation / Log" },
      { key: "cookingTime", label: "Cooking Time", unit: "min", method: "Log" },
    ],
  },
  wash: {
    title: "3. WASH ANALYSIS TABLE",
    short: "Wash",
    sources: ["Fermented Wash", "Beer Well Wash", "Thin Slop", "Spent Wash"],
    parameters: [
      { key: "ph", label: "pH", unit: "—", method: "pH Meter" },
      { key: "temperature", label: "Temperature", unit: "°C", method: "Thermometer" },
      { key: "totalSolids", label: "Total Solids", unit: "% w/w", method: "Gravimetric" },
      { key: "tds", label: "TDS", unit: "% w/w", method: "Gravimetric" },
      { key: "tss", label: "TSS", unit: "% w/w", method: "Gravimetric" },
      { key: "brix", label: "Brix", unit: "°Bx", method: "Refractometer" },
      { key: "alcoholVv", label: "Alcohol (v/v)", unit: "% v/v", method: "Alcometer" },
      { key: "reducingSugars", label: "Reducing Sugars", unit: "% w/w", method: "DNS Method" },
      { key: "starch", label: "Starch", unit: "% w/w", method: "Iodine Method" },
      { key: "acidityLactic", label: "Acidity (as Lactic Acid)", unit: "% w/v", method: "Titration" },
    ],
  },
  distillation: {
    title: "4. DISTILLATION ANALYSIS TABLE",
    short: "Distillation",
    sources: ["Raw Distillate (Before Rect.)", "Rectified Spirit (RS)", "Absolute Alcohol (AA)", "Alcohol Loss in Bottoms"],
    parameters: [
      { key: "alcoholContent", label: "Alcohol Content", unit: "% v/v", method: "Alcometer" },
      { key: "apparentExtract", label: "Apparent Extract", unit: "% v/v", method: "IS 620" },
      { key: "acidityAcetic", label: "Acidity (as Acetic Acid)", unit: "% w/w", method: "Titration" },
      { key: "ester", label: "Ester (as Ethyl Acetate)", unit: "ppm", method: "GC / Titration" },
      { key: "aldehyde", label: "Aldehyde (as Acetaldehyde)", unit: "ppm", method: "GC / Titration" },
      { key: "methanol", label: "Methanol", unit: "ppm", method: "GC" },
      { key: "fuselOil", label: "Fusel Oil", unit: "ppm", method: "GC" },
      { key: "copper", label: "Copper", unit: "ppm", method: "AAS" },
      { key: "ph", label: "pH", unit: "—", method: "pH Meter" },
      { key: "temperature", label: "Temperature", unit: "°C", method: "Thermometer" },
    ],
  },
  evaporation: {
    title: "5. EVAPORATION ANALYSIS TABLE",
    short: "Evaporation",
    sources: ["Thin Slop Feed", "Thick Slop (Concentrate)", "Process Condensate", "DCC Condensate"],
    parameters: [
      { key: "totalSolids", label: "Total Solids", unit: "% w/w", method: "Gravimetric" },
      { key: "tds", label: "TDS", unit: "% w/w", method: "Gravimetric" },
      { key: "brix", label: "Brix", unit: "°Bx", method: "Refractometer" },
      { key: "ph", label: "pH", unit: "—", method: "pH Meter" },
      { key: "temperature", label: "Temperature", unit: "°C", method: "Thermometer" },
      { key: "color", label: "Color", unit: "Visual", method: "Visual" },
    ],
  },
  ddgs: {
    title: "6. DDGS (DECANTER / DRYER) ANALYSIS TABLE",
    short: "DDGS",
    sources: ["Wet Cake (Decanter)", "DDGS (Before Drying)", "DDGS (Final)"],
    parameters: [
      { key: "moisture", label: "Moisture", unit: "% w/w", method: "Oven" },
      { key: "protein", label: "Protein (N×6.25)", unit: "% w/w", method: "Kjeldahl" },
      { key: "fiber", label: "Fiber", unit: "% w/w", method: "Gravimetric" },
      { key: "fat", label: "Fat", unit: "% w/w", method: "Soxhlet" },
      { key: "ash", label: "Ash", unit: "% w/w", method: "Muffle Furnace" },
      { key: "starch", label: "Starch", unit: "% w/w", method: "Polarimetry" },
      { key: "color", label: "Color", unit: "Visual", method: "Visual" },
      { key: "bulkDensity", label: "Bulk Density", unit: "g/l", method: "IS Method" },
    ],
  },
};

const SECTION_OPTIONS = Object.entries(SECTIONS).map(([value, spec]) => ({
  value,
  label: spec.short,
}));

function sourceKey(i) {
  return `s${i}`;
}

function blankMeta(orgName = "") {
  return {
    plantUnit: orgName,
    shift: "A",
    analysedBy: "",
    reportNo: "",
    pageNo: "",
    pageOf: "",
    reviewedBy: "",
    generalRemarks: "",
    checkedBy: "",
    approvedBy: "",
    approvedAt: "",
  };
}

function blankParamRow(sourceCount) {
  const row = { limits: "", remarks: "" };
  for (let i = 0; i < sourceCount; i += 1) row[sourceKey(i)] = "";
  return row;
}

function blankSectionData(sectionId) {
  const spec = SECTIONS[sectionId];
  const data = {};
  for (const p of spec.parameters) {
    data[p.key] = blankParamRow(spec.sources.length);
  }
  return data;
}

function blankSheet(orgName = "") {
  return {
    meta: blankMeta(orgName),
    grain: blankSectionData("grain"),
    slurry: blankSectionData("slurry"),
    wash: blankSectionData("wash"),
    distillation: blankSectionData("distillation"),
    evaporation: blankSectionData("evaporation"),
    ddgs: blankSectionData("ddgs"),
  };
}

function hydrateSection(sectionId, raw) {
  const blank = blankSectionData(sectionId);
  if (!raw || typeof raw !== "object") return blank;
  const next = { ...blank };
  for (const key of Object.keys(blank)) {
    next[key] = { ...blank[key], ...(raw[key] || {}) };
  }
  return next;
}

function hydrateSheet(raw, orgName) {
  const base = blankSheet(orgName);
  if (!raw || typeof raw !== "object") return base;
  return {
    meta: { ...base.meta, ...(raw.meta || {}) },
    grain: hydrateSection("grain", raw.grain),
    slurry: hydrateSection("slurry", raw.slurry),
    wash: hydrateSection("wash", raw.wash),
    distillation: hydrateSection("distillation", raw.distillation),
    evaporation: hydrateSection("evaporation", raw.evaporation),
    ddgs: hydrateSection("ddgs", raw.ddgs),
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

function saveStore(store) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ sheets: store.sheets || {} }));
}

function listDates(store) {
  return Object.keys(store.sheets || {}).sort((a, b) => b.localeCompare(a));
}

export default function LabRegisterPage() {
  const { user } = useAuth();
  const orgName = user?.organizationName || "Digital Distillery";
  const [filterDate, setFilterDate] = useState(todayIso);
  const [sectionId, setSectionId] = useState("grain");
  const [search, setSearch] = useState("");
  const [savedDates, setSavedDates] = useState([]);
  const [sheet, setSheet] = useState(() => blankSheet(orgName));
  const [status, setStatus] = useState("");

  const spec = SECTIONS[sectionId];
  const sectionData = sheet[sectionId] || blankSectionData(sectionId);

  const refreshDates = () => setSavedDates(listDates(loadStore()));

  useEffect(() => {
    const store = loadStore();
    setSheet(hydrateSheet(store.sheets?.[filterDate], orgName));
    refreshDates();
  }, [filterDate, orgName]);

  const filteredParams = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return spec.parameters;
    return spec.parameters.filter((p) =>
      [p.label, p.unit, p.method].join(" ").toLowerCase().includes(q)
    );
  }, [spec.parameters, search]);

  const flash = (msg) => {
    setStatus(msg);
    window.setTimeout(() => setStatus(""), 2200);
  };

  const patchMeta = (key, value) => {
    setSheet((prev) => ({ ...prev, meta: { ...prev.meta, [key]: value } }));
  };

  const patchCell = (paramKey, field, value) => {
    setSheet((prev) => ({
      ...prev,
      [sectionId]: {
        ...prev[sectionId],
        [paramKey]: {
          ...blankParamRow(spec.sources.length),
          ...(prev[sectionId]?.[paramKey] || {}),
          [field]: value,
        },
      },
    }));
  };

  const handleSave = () => {
    const store = loadStore();
    store.sheets[filterDate] = sheet;
    saveStore(store);
    refreshDates();
    flash("Analysis register saved.");
  };

  const handleExport = () => {
    const headers = [
      "Parameter",
      "Unit",
      "Method",
      ...spec.sources,
      "Specification / Limits",
      "Remarks",
    ];
    downloadExcelTable({
      title: "Laboratory Analysis Format",
      companyName: orgName,
      headers,
      rows: filteredParams.map((p) => {
        const row = sectionData[p.key] || blankParamRow(spec.sources.length);
        return [
          p.label,
          p.unit,
          p.method,
          ...spec.sources.map((_, i) => row[sourceKey(i)] || ""),
          row.limits || "",
          row.remarks || "",
        ];
      }),
      sheetName: spec.short.slice(0, 31),
      subtitle: `${spec.title}  ·  ${formatSavedDate(filterDate)}  ·  Shift ${sheet.meta.shift || "—"}`,
    });
    flash("Section exported.");
  };

  const colCount = 3 + spec.sources.length + 2;
  const th =
    "px-2 py-2.5 text-left text-[10px] font-extrabold uppercase tracking-wider text-white border-r border-white/10 whitespace-nowrap";

  return (
    <div className="w-full min-h-full px-4 sm:px-6 lg:px-8 py-5">
      <section className="w-full overflow-hidden rounded-2xl border border-sky-200/80 bg-white shadow-[0_8px_28px_rgba(15,39,68,0.08)]">
        <div className="bg-[#2563eb] px-5 py-5 sm:px-7 sm:py-6 text-white">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20">
                <TestTube2 size={22} strokeWidth={2.2} />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-sky-100">Laboratory</p>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight leading-tight">Sample Register</h1>
                <p className="mt-0.5 text-xs font-semibold text-white/70 truncate">
                  {orgName} · Laboratory Analysis Format
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={handleExport}
                className="inline-flex items-center gap-2 rounded-xl bg-white/12 px-3.5 py-2 text-sm font-bold text-white ring-1 ring-white/20 hover:bg-white/20"
              >
                <FileSpreadsheet size={16} strokeWidth={2.4} />
                Export section
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

        <div className="border-b border-sky-100 bg-[#f8fbff] px-4 py-4 sm:px-6">
          <p className="mb-2 text-[10px] font-extrabold uppercase tracking-wider text-stone-400">Section filter</p>
          <div className="flex flex-wrap gap-2">
            {SECTION_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setSectionId(opt.value)}
                className={`rounded-xl px-3.5 py-2 text-xs font-extrabold transition ${
                  sectionId === opt.value
                    ? "bg-[#2563eb] text-white shadow-sm"
                    : "bg-white text-[#0f2744] border border-sky-200 hover:bg-sky-50"
                }`}
              >
                {SECTIONS[opt.value].title}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 border-b border-sky-100 px-4 py-4 sm:grid-cols-2 lg:grid-cols-4 sm:px-6">
          <label className="block">
            <span className={labelCls}>Plant / Unit</span>
            <input className={headerInput} value={sheet.meta.plantUnit} onChange={(e) => patchMeta("plantUnit", e.target.value)} />
          </label>
          <label className="block">
            <span className={labelCls}>Shift (A / B / C)</span>
            <DistillerSelect
              value={sheet.meta.shift}
              onChange={(v) => patchMeta("shift", v)}
              options={SHIFTS}
              placeholder="Shift"
            />
          </label>
          <label className="block">
            <span className={labelCls}>Analysed By</span>
            <input className={headerInput} value={sheet.meta.analysedBy} onChange={(e) => patchMeta("analysedBy", e.target.value)} />
          </label>
          <label className="block">
            <span className={labelCls}>Report No.</span>
            <input className={headerInput} value={sheet.meta.reportNo} onChange={(e) => patchMeta("reportNo", e.target.value)} />
          </label>
          <label className="block">
            <span className={labelCls}>Page No.</span>
            <div className="flex items-center gap-2">
              <input className={headerInput} value={sheet.meta.pageNo} onChange={(e) => patchMeta("pageNo", e.target.value)} placeholder="__" />
              <span className="text-xs font-bold text-stone-400">of</span>
              <input className={headerInput} value={sheet.meta.pageOf} onChange={(e) => patchMeta("pageOf", e.target.value)} placeholder="__" />
            </div>
          </label>
          <label className="block">
            <span className={labelCls}>Reviewed By</span>
            <input className={headerInput} value={sheet.meta.reviewedBy} onChange={(e) => patchMeta("reviewedBy", e.target.value)} />
          </label>
        </div>

        <ReportFilterBar
          date={filterDate}
          onDateChange={setFilterDate}
          savedDates={savedDates}
          formatDate={formatSavedDate}
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search parameter, unit, method…"
        />

        <div className="overflow-x-auto px-2 pb-4 sm:px-4">
          <table className="min-w-[1100px] w-full text-left text-[11px] border-collapse">
            <thead>
              <tr className="bg-[#1e3a8a]">
                <th colSpan={colCount} className="px-3 py-2.5 text-center text-xs font-black tracking-wide text-white">
                  {spec.title}
                </th>
              </tr>
              <tr className="bg-[#2563eb]">
                <th className={`${th} min-w-[180px]`}>Parameters</th>
                <th className={`${th} min-w-[90px]`}>Unit</th>
                <th className={`${th} min-w-[130px]`}>Method</th>
                {spec.sources.map((src) => (
                  <th key={src} className={`${th} min-w-[140px]`}>
                    {src}
                  </th>
                ))}
                <th className={`${th} min-w-[140px]`}>Specification / Limits</th>
                <th className={`${th} min-w-[140px]`}>Remarks</th>
              </tr>
              <tr className="bg-[#3b74e8] text-white text-[10px] font-bold">
                <th className="px-2 py-1.5 border-r border-white/10" colSpan={3}>
                  Sample ID / Source →
                </th>
                {spec.sources.map((src) => (
                  <th key={`src-${src}`} className="px-2 py-1.5 border-r border-white/10 text-center">
                    Result
                  </th>
                ))}
                <th className="px-2 py-1.5 border-r border-white/10" />
                <th className="px-2 py-1.5" />
              </tr>
            </thead>
            <tbody>
              {filteredParams.length === 0 ? (
                <tr>
                  <td colSpan={colCount} className="px-4 py-10 text-center text-sm font-bold text-stone-400">
                    No parameters match your search.
                  </td>
                </tr>
              ) : (
                filteredParams.map((p) => {
                  const row = sectionData[p.key] || blankParamRow(spec.sources.length);
                  return (
                    <tr key={p.key} className="bg-white border-b border-sky-50 align-top hover:bg-[#eef3f9]/50">
                      <td className="px-2 py-1.5 font-extrabold text-[#0f2744]">{p.label}</td>
                      <td className="px-2 py-1.5 font-semibold text-stone-600">{p.unit}</td>
                      <td className="px-2 py-1.5 font-semibold text-stone-600">{p.method}</td>
                      {spec.sources.map((_, i) => (
                        <td key={i} className="px-1.5 py-1.5">
                          <input
                            className={cellInput}
                            value={row[sourceKey(i)] || ""}
                            onChange={(e) => patchCell(p.key, sourceKey(i), e.target.value)}
                          />
                        </td>
                      ))}
                      <td className="px-1.5 py-1.5">
                        <input
                          className={cellInput}
                          value={row.limits || ""}
                          onChange={(e) => patchCell(p.key, "limits", e.target.value)}
                        />
                      </td>
                      <td className="px-1.5 py-1.5">
                        <input
                          className={cellInput}
                          value={row.remarks || ""}
                          onChange={(e) => patchCell(p.key, "remarks", e.target.value)}
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t border-sky-100 px-4 py-4 sm:px-6 space-y-4">
          <label className="block">
            <span className={labelCls}>General Remarks</span>
            <textarea
              className={`${headerInput} min-h-[72px] resize-y`}
              value={sheet.meta.generalRemarks}
              onChange={(e) => patchMeta("generalRemarks", e.target.value)}
            />
          </label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="block rounded-xl border border-sky-200 bg-[#f8fbff] p-3">
              <span className={labelCls}>Analysed By (QC Chemist)</span>
              <input className={headerInput} value={sheet.meta.analysedBy} onChange={(e) => patchMeta("analysedBy", e.target.value)} />
            </label>
            <label className="block rounded-xl border border-sky-200 bg-[#f8fbff] p-3">
              <span className={labelCls}>Checked By (QC In-Charge)</span>
              <input className={headerInput} value={sheet.meta.checkedBy} onChange={(e) => patchMeta("checkedBy", e.target.value)} />
            </label>
            <label className="block rounded-xl border border-sky-200 bg-[#f8fbff] p-3">
              <span className={labelCls}>Approved By (QA Head)</span>
              <input className={headerInput} value={sheet.meta.approvedBy} onChange={(e) => patchMeta("approvedBy", e.target.value)} />
            </label>
            <label className="block rounded-xl border border-sky-200 bg-[#f8fbff] p-3">
              <span className={labelCls}>Date &amp; Time</span>
              <input className={headerInput} value={sheet.meta.approvedAt} onChange={(e) => patchMeta("approvedAt", e.target.value)} />
            </label>
          </div>
        </div>
      </section>
    </div>
  );
}
