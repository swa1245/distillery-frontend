import { useEffect, useMemo, useState } from "react";
import { FileSpreadsheet, Save, Scale, ShieldCheck, Trash2, Truck } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { downloadExcelTable } from "../utils/exportReport";
import {
  formatDisplayDate as formatSavedDate,
  listSheetDates,
  loadSheetStore,
  readSheetRows,
  saveSheetStore,
  todayIso,
} from "../utils/datedSheetStore";
import ReportFilterBar from "../components/ReportFilterBar";
import DistillerDatePicker from "../components/DistillerDatePicker";
import DistillerTimePicker from "../components/DistillerTimePicker";
import DistillerSelect from "../components/DistillerSelect";

const STORAGE_KEY = "distiller_grains_table";

const MATERIALS = ["BROKEN RICE", "MAIZE", "ENZYME/ADY", "OTHER"];
const GODOWNS = ["SILO 1", "SILO 2", "SILO 3", "STORE"];
const QC_STATUSES = ["ACCEPTED", "REJECTED"];

const QC_FIELDS = [
  { key: "moisturePct", label: "Moisture %" },
  { key: "starchPct", label: "Starch %" },
  { key: "fmPct", label: "F.M. & Dust %" },
  { key: "foreignMatterPct", label: "Foreign Matter %" },
  { key: "brokenSeedPct", label: "Broken %" },
];

const cellInput =
  "w-full min-w-[4.5rem] rounded-md border border-sky-100 bg-white px-1.5 py-1.5 text-[12px] font-semibold text-stone-800 outline-none focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb]/20";
const cellRead =
  "w-full min-w-[4.5rem] rounded-md border border-sky-100 bg-[#eef3f9] px-1.5 py-1.5 text-[12px] font-black tabular-nums text-[#0f2744]";

const STAGES = {
  gate: {
    title: "GATE ENTRY",
    subtitle: "Date, vehicle, material and godown",
    fileName: "Gate_Entry",
    searchPlaceholder: "Search vehicle, supplier, material…",
    icon: Truck,
    minWidth: "min-w-[980px]",
  },
  weigh: {
    title: "WEIGHTBRIDGE",
    subtitle: "Gate details come from GATE ENTRY — enter weights only",
    fileName: "Weightbridge",
    searchPlaceholder: "Search vehicle, supplier…",
    icon: Scale,
    minWidth: "min-w-[1480px]",
  },
  qc: {
    title: "QC",
    subtitle: "Token ID is created after WEIGHTBRIDGE",
    fileName: "QC",
    searchPlaceholder: "Search token, GRN, batch…",
    icon: ShieldCheck,
    minWidth: "min-w-[1480px]",
  },
};

function num(v) {
  const n = Number(String(v ?? "").replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : 0;
}
function hasValue(v) {
  return String(v ?? "").trim() !== "" && String(v).trim() !== "-";
}
function roundQty(n) {
  return Math.round((Number(n) || 0) * 1000) / 1000;
}

function weighDone(row) {
  return hasValue(row.grossWeight) && hasValue(row.tareWeight);
}

function tokenPrefix(date) {
  return `TKN-${String(date || todayIso()).replace(/-/g, "").slice(2)}-`;
}

function nextTokenId(rows, date, excludeId) {
  const prefix = tokenPrefix(date);
  const used = rows
    .filter((r) => r.id !== excludeId && String(r.tokenId || "").startsWith(prefix))
    .map((r) => Number(String(r.tokenId).slice(prefix.length)))
    .filter((n) => Number.isFinite(n));
  const n = (used.length ? Math.max(...used) : 0) + 1;
  return `${prefix}${String(n).padStart(3, "0")}`;
}

function withDerived(row, allRows = []) {
  const net =
    hasValue(row.grossWeight) || hasValue(row.tareWeight)
      ? String(roundQty(Math.max(num(row.grossWeight) - num(row.tareWeight), 0)))
      : row.netWeight || "";
  const next = { ...row, netWeight: net };
  if (weighDone(next) && !hasValue(next.tokenId)) {
    next.tokenId = nextTokenId(allRows, next.date, next.id);
  }
  return next;
}

function normalizeStatus(row) {
  const raw = String(row.qcStatus || "").trim().toUpperCase();
  if (raw === "PASS" || raw === "ACCEPTED") return "ACCEPTED";
  if (raw === "FAIL" || raw === "REJECTED") return "REJECTED";
  if (!QC_FIELDS.some((f) => hasValue(row[f.key]))) return "";
  if (num(row.moisturePct) > 14.5) return "REJECTED";
  return "ACCEPTED";
}

function blankRow(slNo, date = todayIso()) {
  return withDerived({
    id: `r-${Date.now()}-${slNo}-${Math.random().toString(36).slice(2, 7)}`,
    slNo,
    date,
    time: "",
    vehicleNo: "",
    supplier: "",
    grainType: "",
    siloId: "",
    grossWeight: "",
    tareWeight: "",
    netWeight: "",
    moisturePct: "",
    starchPct: "",
    fmPct: "",
    foreignMatterPct: "",
    brokenSeedPct: "",
    qcStatus: "",
    batchNo: "",
    grnNo: "",
    chemistRemark: "",
    tokenId: "",
  });
}

function formatDisplayDate(iso) {
  const m = String(iso || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return iso || "";
  return `${m[3]}/${m[2]}/${m[1].slice(2)}`;
}

function exportPayload(stage, filtered) {
  if (stage === "weigh") {
    return {
      headers: [
        "Date",
        "Time",
        "Vehicle No.",
        "Supplier",
        "MATERIAL",
        "Godown/Silo",
        "Gross Wt. (MT)",
        "Tare Wt. (MT)",
        "Net Wt. (MT)",
      ],
      rows: filtered.map((row) => [
        formatDisplayDate(row.date),
        row.time,
        row.vehicleNo,
        row.supplier,
        row.grainType,
        row.siloId,
        row.grossWeight,
        row.tareWeight,
        row.netWeight,
      ]),
    };
  }
  if (stage === "qc") {
    return {
      headers: ["Token ID", ...QC_FIELDS.map((c) => c.label), "BATCH NO.", "GRN No.", "QC Status", "Remarks"],
      rows: filtered.map((row) => [
        row.tokenId,
        ...QC_FIELDS.map((c) => row[c.key]),
        row.batchNo,
        row.grnNo,
        normalizeStatus(row),
        row.chemistRemark,
      ]),
    };
  }
  return {
    headers: ["Date", "Time", "Vehicle No.", "Supplier", "MATERIAL", "Godown/Silo"],
    rows: filtered.map((row) => [
      formatDisplayDate(row.date),
      row.time,
      row.vehicleNo,
      row.supplier,
      row.grainType,
      row.siloId,
    ]),
  };
}

function colCount(stage) {
  if (stage === "weigh") return 9;
  if (stage === "qc") return 10;
  return 7;
}

function ReadCell({ value }) {
  return <input className={cellRead} value={value || "—"} readOnly tabIndex={-1} />;
}

export default function GrainTablePage({ stage = "gate" }) {
  const spec = STAGES[stage] || STAGES.gate;
  const Icon = spec.icon;
  const { user } = useAuth();
  const [filterDate, setFilterDate] = useState(todayIso);
  const [typeFilter, setTypeFilter] = useState("");
  const [search, setSearch] = useState("");
  const [savedDates, setSavedDates] = useState([]);
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState("");
  const orgName = user?.organizationName || "Digital Distillery";

  const refreshDates = () => setSavedDates(listSheetDates(loadSheetStore(STORAGE_KEY)));

  const hydrateRows = (list, date) => {
    if (!Array.isArray(list) || !list.length) return [];
    const merged = list.map((row, i) => ({
      ...blankRow(i + 1, date),
      ...row,
      slNo: i + 1,
      tokenId: row.tokenId || "",
    }));
    const out = [];
    for (const row of merged) out.push(withDerived(row, out));
    return out;
  };

  const persist = (nextRows) => {
    const store = loadSheetStore(STORAGE_KEY);
    store.sheets[filterDate] = nextRows.map((row) => ({ ...row, date: row.date || filterDate }));
    saveSheetStore(STORAGE_KEY, store);
    refreshDates();
  };

  useEffect(() => {
    refreshDates();
  }, []);

  useEffect(() => {
    const store = loadSheetStore(STORAGE_KEY);
    setRows(hydrateRows(readSheetRows(store, filterDate), filterDate));
  }, [filterDate]);

  const flash = (message) => {
    setStatus(message);
    window.setTimeout(() => setStatus(""), 2800);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (stage === "qc" && !hasValue(row.tokenId)) return false;
      if (typeFilter && row.grainType !== typeFilter) return false;
      if (!q) return true;
      return [row.tokenId, row.vehicleNo, row.supplier, row.grainType, row.siloId, row.grnNo, row.batchNo, row.chemistRemark]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [rows, search, typeFilter, stage]);

  const extras = useMemo(() => {
    const passed = rows.filter((r) => normalizeStatus(r) === "PASS").length;
    const net = roundQty(rows.reduce((s, r) => s + num(r.netWeight), 0));
    return { passed, net };
  }, [rows]);

  const updateRow = (id, field, value) => {
    setRows((prev) => {
      const next = prev.map((row) => (row.id === id ? withDerived({ ...row, [field]: value }, prev) : row));
      persist(next);
      return next;
    });
  };

  const addRow = () => {
    const slNo = rows.length ? Math.max(...rows.map((r) => Number(r.slNo) || 0)) + 1 : 1;
    const nextRow = blankRow(slNo, filterDate);
    if (typeFilter) nextRow.grainType = typeFilter;
    const next = [...rows, nextRow];
    setRows(next);
    persist(next);
  };

  const removeRow = (id) => {
    const next = rows.filter((row) => row.id !== id).map((row, i) => ({ ...row, slNo: i + 1 }));
    setRows(next);
    persist(next);
  };

  const handleSave = () => {
    persist(rows);
    flash("Report saved.");
  };

  const handleExport = () => {
    const payload = exportPayload(stage, filtered);
    downloadExcelTable({
      fileName: `${spec.fileName}_${filterDate}.xlsx`,
      title: spec.title,
      companyName: orgName,
      headers: payload.headers,
      rows: payload.rows,
      sheetName: spec.title,
      subtitle: `${formatSavedDate(filterDate)}  ·  ${filtered.length} ${filtered.length === 1 ? "entry" : "entries"}`,
    });
    flash("Report exported.");
  };

  const th = "px-2 py-2.5 text-center whitespace-nowrap";

  return (
    <div className="w-full min-h-full px-4 sm:px-6 lg:px-8 py-5">
      <section className="w-full overflow-hidden rounded-2xl border border-sky-200/80 bg-white shadow-[0_8px_28px_rgba(15,39,68,0.08)]">
        <div className="bg-[#2563eb] px-5 py-5 sm:px-7 sm:py-6 text-white">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20">
                <Icon size={22} strokeWidth={2.2} />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-sky-100">Inward</p>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight leading-tight">{spec.title}</h1>
                <p className="mt-0.5 text-xs font-semibold text-white/70 truncate">
                  {orgName} · {spec.subtitle}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="rounded-xl bg-white/12 px-3.5 py-2 ring-1 ring-white/15">
                <p className="text-[9px] font-extrabold uppercase tracking-wider text-sky-100/80">Entries</p>
                <p className="text-lg font-black tabular-nums leading-tight">{rows.length}</p>
              </div>
              {stage === "weigh" ? (
                <div className="rounded-xl bg-white/12 px-3.5 py-2 ring-1 ring-white/15">
                  <p className="text-[9px] font-extrabold uppercase tracking-wider text-sky-100/80">Net MT</p>
                  <p className="text-lg font-black tabular-nums leading-tight">{extras.net}</p>
                </div>
              ) : null}
              {stage === "qc" ? (
                <div className="rounded-xl bg-white/12 px-3.5 py-2 ring-1 ring-white/15">
                  <p className="text-[9px] font-extrabold uppercase tracking-wider text-sky-100/80">Pass</p>
                  <p className="text-lg font-black tabular-nums leading-tight">{extras.passed}</p>
                </div>
              ) : null}
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
          date={filterDate}
          onDateChange={setFilterDate}
          savedDates={savedDates}
          formatDate={formatSavedDate}
          typeLabel={stage === "gate" ? "Material" : undefined}
          typeValue={typeFilter}
          typeOptions={stage === "gate" ? MATERIALS : []}
          onTypeChange={setTypeFilter}
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder={spec.searchPlaceholder}
          onAddRow={stage === "gate" ? addRow : undefined}
        />

        <div className="overflow-x-auto">
          <table className={`${spec.minWidth} w-full text-left text-[11px] border-collapse`}>
            <thead>
              <tr className="bg-[#0f2744] text-white font-extrabold uppercase tracking-wider text-[10px]">
                {stage === "gate" ? (
                  <>
                    <th className={`${th} min-w-[148px]`}>Date</th>
                    <th className={`${th} min-w-[128px]`}>Time</th>
                    <th className={`${th} min-w-[140px]`}>Vehicle No.</th>
                    <th className={`${th} min-w-[160px]`}>Supplier</th>
                    <th className={`${th} min-w-[150px]`}>MATERIAL</th>
                    <th className={`${th} min-w-[140px]`}>Godown/Silo</th>
                    <th className={`${th} w-12`} />
                  </>
                ) : null}
                {stage === "weigh" ? (
                  <>
                    <th className={`${th} min-w-[148px]`}>Date</th>
                    <th className={`${th} min-w-[110px]`}>Time</th>
                    <th className={`${th} min-w-[140px]`}>Vehicle No.</th>
                    <th className={`${th} min-w-[150px]`}>Supplier</th>
                    <th className={`${th} min-w-[140px]`}>MATERIAL</th>
                    <th className={`${th} min-w-[130px]`}>Godown/Silo</th>
                    <th className={`${th} min-w-[130px]`}>Gross Wt. (MT)</th>
                    <th className={`${th} min-w-[130px]`}>Tare Wt. (MT)</th>
                    <th className={`${th} min-w-[130px]`}>Net Wt. (MT)</th>
                  </>
                ) : null}
                {stage === "qc" ? (
                  <>
                    <th className={`${th} min-w-[140px]`}>Token ID</th>
                    {QC_FIELDS.map((c) => (
                      <th key={c.key} className={`${th} min-w-[110px]`}>
                        {c.label}
                      </th>
                    ))}
                    <th className={`${th} min-w-[120px]`}>BATCH NO.</th>
                    <th className={`${th} min-w-[120px]`}>GRN No.</th>
                    <th className={`${th} min-w-[120px]`}>QC Status</th>
                    <th className={`${th} min-w-[160px]`}>Remarks</th>
                  </>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={colCount(stage)} className="px-4 py-12 text-center text-sm font-bold text-stone-400">
                    {stage === "gate"
                      ? "No entries yet. Click Add row."
                      : stage === "weigh"
                        ? "No gate entries yet. Add them in GATE ENTRY."
                        : "No Token ID yet. Enter Gross and Tare on WEIGHTBRIDGE to generate one."}
                  </td>
                </tr>
              ) : (
                filtered.map((row) => (
                  <tr key={row.id} className="bg-white align-top border-b border-sky-50 hover:bg-[#eef3f9]/70">
                    {stage === "gate" ? (
                      <>
                        <td className="px-1.5 py-1.5">
                          <DistillerDatePicker compact value={row.date} onChange={(v) => updateRow(row.id, "date", v)} />
                        </td>
                        <td className="px-1.5 py-1.5">
                          <DistillerTimePicker compact value={row.time} onChange={(v) => updateRow(row.id, "time", v)} />
                        </td>
                        <td className="px-1.5 py-1.5">
                          <input
                            className={cellInput}
                            value={row.vehicleNo}
                            onChange={(e) => updateRow(row.id, "vehicleNo", e.target.value)}
                            placeholder="MH12AB1234"
                          />
                        </td>
                        <td className="px-1.5 py-1.5">
                          <input className={cellInput} value={row.supplier} onChange={(e) => updateRow(row.id, "supplier", e.target.value)} />
                        </td>
                        <td className="px-1.5 py-1.5">
                          <DistillerSelect
                            compact
                            value={row.grainType}
                            onChange={(v) => updateRow(row.id, "grainType", v)}
                            options={[{ value: "", label: "Select" }, ...MATERIALS]}
                            placeholder="Select"
                          />
                        </td>
                        <td className="px-1.5 py-1.5">
                          <DistillerSelect
                            compact
                            value={row.siloId}
                            onChange={(v) => updateRow(row.id, "siloId", v)}
                            options={[{ value: "", label: "Select" }, ...GODOWNS]}
                            placeholder="Select"
                          />
                        </td>
                      </>
                    ) : null}
                    {stage === "weigh" ? (
                      <>
                        <td className="px-1.5 py-1.5">
                          <ReadCell value={formatDisplayDate(row.date)} />
                        </td>
                        <td className="px-1.5 py-1.5">
                          <ReadCell value={row.time} />
                        </td>
                        <td className="px-1.5 py-1.5">
                          <ReadCell value={row.vehicleNo} />
                        </td>
                        <td className="px-1.5 py-1.5">
                          <ReadCell value={row.supplier} />
                        </td>
                        <td className="px-1.5 py-1.5">
                          <ReadCell value={row.grainType} />
                        </td>
                        <td className="px-1.5 py-1.5">
                          <ReadCell value={row.siloId} />
                        </td>
                        <td className="px-1.5 py-1.5">
                          <input
                            className={cellInput}
                            inputMode="decimal"
                            value={row.grossWeight}
                            onChange={(e) => updateRow(row.id, "grossWeight", e.target.value)}
                          />
                        </td>
                        <td className="px-1.5 py-1.5">
                          <input
                            className={cellInput}
                            inputMode="decimal"
                            value={row.tareWeight}
                            onChange={(e) => updateRow(row.id, "tareWeight", e.target.value)}
                          />
                        </td>
                        <td className="px-1.5 py-1.5">
                          <ReadCell value={row.netWeight} />
                        </td>
                      </>
                    ) : null}
                    {stage === "qc" ? (
                      <>
                        <td className="px-1.5 py-1.5">
                          <ReadCell value={row.tokenId} />
                        </td>
                        {QC_FIELDS.map((c) => (
                          <td key={c.key} className="px-1.5 py-1.5">
                            <input
                              className={cellInput}
                              inputMode="decimal"
                              value={row[c.key]}
                              onChange={(e) => updateRow(row.id, c.key, e.target.value)}
                            />
                          </td>
                        ))}
                        <td className="px-1.5 py-1.5">
                          <input className={cellInput} value={row.batchNo} onChange={(e) => updateRow(row.id, "batchNo", e.target.value)} />
                        </td>
                        <td className="px-1.5 py-1.5">
                          <input className={cellInput} value={row.grnNo} onChange={(e) => updateRow(row.id, "grnNo", e.target.value)} />
                        </td>
                        <td className="px-1.5 py-1.5">
                          <DistillerSelect
                            compact
                            value={normalizeStatus(row)}
                            onChange={(v) => updateRow(row.id, "qcStatus", v)}
                            options={[{ value: "", label: "Select" }, ...QC_STATUSES]}
                            placeholder="Select"
                          />
                        </td>
                        <td className="px-1.5 py-1.5">
                          <input className={cellInput} value={row.chemistRemark} onChange={(e) => updateRow(row.id, "chemistRemark", e.target.value)} />
                        </td>
                      </>
                    ) : null}
                    {stage === "gate" ? (
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
                    ) : null}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
