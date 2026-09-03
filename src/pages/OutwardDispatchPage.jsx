import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, FileSpreadsheet, Package, Save, Trash2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { downloadExcelTable } from "../utils/exportReport";
import { formatDisplayDate as formatSavedDate, todayIso } from "../utils/datedSheetStore";
import ReportFilterBar from "../components/ReportFilterBar";
import DistillerDatePicker from "../components/DistillerDatePicker";
import DistillerTimePicker from "../components/DistillerTimePicker";
import DistillerSelect from "../components/DistillerSelect";

const STORAGE_KEY = "distiller_outward_dispatch";
const QC_STATUSES = ["ACCEPTED", "REJECTED"];
const OTHER_QC_STATUSES = ["APPROVED", "REJECTED"];

const cellInput =
  "w-full min-w-[4.5rem] rounded-md border border-sky-100 bg-white px-1.5 py-1.5 text-[12px] font-semibold text-stone-800 outline-none focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb]/20";

const SECTIONS = {
  ethanol: {
    title: "ETHANOL OUTWARD",
    short: "Ethanol",
    fileName: "Ethanol_Outward",
    searchPlaceholder: "Search vehicle, party, batch, invoice…",
    minWidth: "min-w-[1900px]",
    columns: [
      { key: "date", label: "Date", type: "date", width: "min-w-[148px]" },
      { key: "time", label: "Time", type: "time", width: "min-w-[110px]" },
      { key: "vehicleNo", label: "Vehicle No.", type: "text", width: "min-w-[130px]" },
      { key: "customer", label: "Customer / Party", type: "text", width: "min-w-[160px]" },
      { key: "product", label: "Product", type: "text", width: "min-w-[120px]", defaultValue: "Ethanol" },
      { key: "grade", label: "Grade", type: "text", width: "min-w-[100px]" },
      { key: "batchNo", label: "Batch No.", type: "text", width: "min-w-[120px]" },
      { key: "tankNo", label: "Tank No.", type: "text", width: "min-w-[110px]" },
      { key: "qtyKl", label: "Qty (KL)", type: "number", width: "min-w-[110px]" },
      { key: "strengthPct", label: "Strength % v/v", type: "number", width: "min-w-[120px]" },
      { key: "aaQtyKl", label: "AA Qty (KL)", type: "derived", width: "min-w-[110px]" },
      { key: "qcStatus", label: "QC Status", type: "qc", width: "min-w-[130px]" },
      { key: "invoiceLrNo", label: "Invoice / LR No.", type: "text", width: "min-w-[140px]" },
      { key: "destination", label: "Destination", type: "text", width: "min-w-[140px]" },
      { key: "gateOutTime", label: "Gate Out Time", type: "time", width: "min-w-[120px]" },
      { key: "remarks", label: "REMARK", type: "text", width: "min-w-[150px]" },
    ],
  },
  ddgs: {
    title: "DDGS DISPATCH",
    short: "DDGS",
    fileName: "DDGS_Dispatch",
    searchPlaceholder: "Search vehicle, party, batch, invoice…",
    minWidth: "min-w-[1900px]",
    columns: [
      { key: "date", label: "Date", type: "date", width: "min-w-[148px]" },
      { key: "time", label: "Time", type: "time", width: "min-w-[110px]" },
      { key: "vehicleNo", label: "Vehicle No.", type: "text", width: "min-w-[130px]" },
      { key: "customer", label: "Customer / Party", type: "text", width: "min-w-[160px]" },
      { key: "product", label: "Product", type: "text", width: "min-w-[110px]", defaultValue: "DDGS" },
      { key: "batchNo", label: "Batch No.", type: "text", width: "min-w-[120px]" },
      { key: "sourceSilo", label: "Source / Silo", type: "text", width: "min-w-[130px]" },
      { key: "qtyMt", label: "Qty (MT)", type: "number", width: "min-w-[110px]" },
      { key: "moisturePct", label: "Moisture %", type: "number", width: "min-w-[110px]" },
      { key: "proteinPct", label: "Protein %", type: "number", width: "min-w-[110px]" },
      { key: "qcStatus", label: "QC Status", type: "qc", width: "min-w-[130px]" },
      { key: "weighmentSlipNo", label: "Weighment Slip No", type: "text", width: "min-w-[140px]" },
      { key: "invoiceLrNo", label: "Invoice / LR No.", type: "text", width: "min-w-[140px]" },
      { key: "destination", label: "Destination", type: "text", width: "min-w-[140px]" },
      { key: "gateOutTime", label: "Gate Out Time", type: "time", width: "min-w-[120px]" },
      { key: "remarks", label: "Remarks", type: "text", width: "min-w-[150px]" },
    ],
  },
  co2: {
    title: "CO2 DISPATCH",
    short: "CO2",
    fileName: "CO2_Dispatch",
    searchPlaceholder: "Search tanker, customer, batch, challan…",
    minWidth: "min-w-[1900px]",
    columns: [
      { key: "date", label: "Date", type: "date", width: "min-w-[148px]" },
      { key: "time", label: "Time", type: "time", width: "min-w-[110px]" },
      { key: "tankerNo", label: "Tanker No.", type: "text", width: "min-w-[130px]" },
      { key: "customer", label: "Customer", type: "text", width: "min-w-[150px]" },
      { key: "product", label: "Product", type: "text", width: "min-w-[110px]", defaultValue: "CO2" },
      { key: "batchLotNo", label: "Batch / Lot No.", type: "text", width: "min-w-[130px]" },
      { key: "loadingPoint", label: "Loading Point", type: "text", width: "min-w-[130px]" },
      { key: "qtyLoadedMt", label: "Qty Loaded (MT)", type: "number", width: "min-w-[130px]" },
      { key: "co2PurityPct", label: "CO2 Purity %", type: "number", width: "min-w-[120px]" },
      { key: "pressure", label: "Pressure", type: "text", width: "min-w-[110px]" },
      { key: "temperature", label: "Temperature", type: "text", width: "min-w-[120px]" },
      { key: "qcStatus", label: "QC Status", type: "qc", width: "min-w-[130px]" },
      { key: "deliveryChallanNo", label: "Delivery Challan No", type: "text", width: "min-w-[150px]" },
      { key: "destination", label: "Destination", type: "text", width: "min-w-[140px]" },
      { key: "gateOutTime", label: "Gate Out Time", type: "time", width: "min-w-[120px]" },
      { key: "remarks", label: "Remarks", type: "text", width: "min-w-[150px]" },
    ],
  },
  other: {
    title: "OTHER DISPATCH",
    short: "Other",
    fileName: "Other_Dispatch",
    searchPlaceholder: "Search vehicle, party, material, challan…",
    minWidth: "min-w-[1800px]",
    columns: [
      { key: "date", label: "Date", type: "date", width: "min-w-[148px]" },
      { key: "time", label: "Time", type: "time", width: "min-w-[110px]" },
      { key: "vehicleNo", label: "Vehicle No.", type: "text", width: "min-w-[130px]" },
      { key: "customer", label: "Party / Customer", type: "text", width: "min-w-[160px]" },
      { key: "material", label: "Material", type: "text", width: "min-w-[140px]" },
      { key: "category", label: "Category", type: "text", width: "min-w-[120px]" },
      { key: "batchLotNo", label: "Batch / Lot No.", type: "text", width: "min-w-[130px]" },
      { key: "source", label: "Source", type: "text", width: "min-w-[120px]" },
      { key: "qty", label: "Qty", type: "number", width: "min-w-[100px]" },
      { key: "unit", label: "Unit", type: "text", width: "min-w-[90px]" },
      { key: "qcStatus", label: "QC / Approval Status", type: "otherQc", width: "min-w-[150px]" },
      { key: "challanNo", label: "Challan No.", type: "text", width: "min-w-[130px]" },
      { key: "destination", label: "Destination", type: "text", width: "min-w-[140px]" },
      { key: "gateOutTime", label: "Gate Out Time", type: "time", width: "min-w-[120px]" },
      { key: "remarks", label: "Remarks", type: "text", width: "min-w-[150px]" },
    ],
  },
};

const SECTION_OPTIONS = Object.entries(SECTIONS).map(([value, spec]) => ({
  value,
  label: spec.short,
}));

function num(v) {
  const n = Number(String(v ?? "").replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : 0;
}

function roundQty(n) {
  return Math.round((Number(n) || 0) * 1000) / 1000;
}

function formatDisplayDate(iso) {
  const m = String(iso || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return iso || "";
  return `${m[3]}/${m[2]}/${m[1].slice(2)}`;
}

function blankRow(sectionId, slNo, date = todayIso()) {
  const spec = SECTIONS[sectionId];
  const row = {
    id: `o-${sectionId}-${Date.now()}-${slNo}-${Math.random().toString(36).slice(2, 7)}`,
    slNo,
    date,
  };
  for (const col of spec.columns) {
    if (col.key === "date") continue;
    if (col.type === "derived") row[col.key] = "";
    else if (col.defaultValue) row[col.key] = col.defaultValue;
    else row[col.key] = "";
  }
  return withDerived(sectionId, row);
}

function withDerived(sectionId, row) {
  if (sectionId !== "ethanol") return row;
  const qty = String(row.qtyKl ?? "").trim();
  const strength = String(row.strengthPct ?? "").trim();
  const aaQty =
    qty !== "" || strength !== ""
      ? String(roundQty((num(qty) * num(strength)) / 100))
      : "";
  return { ...row, aaQtyKl: aaQty };
}

function hydrateRow(sectionId, row, date, slNo) {
  const base = blankRow(sectionId, slNo, date);
  return withDerived(sectionId, {
    ...base,
    ...row,
    slNo,
    id: row.id && String(row.id).startsWith("o-") ? row.id : base.id,
    date: row.date || date,
  });
}

function loadViewStore() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (raw?.views && typeof raw.views === "object") {
      return {
        ethanol: raw.views.ethanol || {},
        ddgs: raw.views.ddgs || {},
        co2: raw.views.co2 || {},
        other: raw.views.other || {},
      };
    }
  } catch {
    /* ignore */
  }
  return { ethanol: {}, ddgs: {}, co2: {}, other: {} };
}

function saveViewStore(views) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ views }));
}

function listViewDates(views, sectionId) {
  return Object.keys(views?.[sectionId] || {}).sort((a, b) => b.localeCompare(a));
}

export default function OutwardDispatchPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [sectionId, setSectionId] = useState("ethanol");
  const [filterDate, setFilterDate] = useState(todayIso);
  const [search, setSearch] = useState("");
  const [savedDates, setSavedDates] = useState([]);
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState("");
  const [statusType, setStatusType] = useState("ok");
  const orgName = user?.organizationName || "Digital Distillery";
  const spec = SECTIONS[sectionId];

  const refreshDates = (key = sectionId) => setSavedDates(listViewDates(loadViewStore(), key));

  const hydrateRows = (list, date) => {
    if (!Array.isArray(list) || !list.length) return [blankRow(sectionId, 1, date)];
    return list.map((row, i) => hydrateRow(sectionId, row, date, i + 1));
  };

  useEffect(() => {
    const store = loadViewStore();
    setRows(hydrateRows(store[sectionId]?.[filterDate], filterDate));
    refreshDates(sectionId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterDate, sectionId]);

  const flash = (message, type = "ok") => {
    setStatus(message);
    setStatusType(type);
    window.setTimeout(() => setStatus(""), 2800);
  };

  const handleSave = () => {
    const store = loadViewStore();
    store[sectionId] = store[sectionId] || {};
    store[sectionId][filterDate] = rows.map((row) => ({ ...row, date: row.date || filterDate }));
    saveViewStore(store);
    refreshDates();
    flash("Report saved.");
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) =>
      spec.columns
        .map((c) => row[c.key])
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [rows, search, spec.columns]);

  const handleExport = () => {
    downloadExcelTable({
      fileName: `${spec.fileName}_${filterDate}.xlsx`,
      title: spec.title,
      companyName: orgName,
      headers: spec.columns.map((c) => c.label),
      rows: filtered.map((row) =>
        spec.columns.map((c) => (c.type === "date" ? formatDisplayDate(row[c.key]) : row[c.key] ?? ""))
      ),
      sheetName: spec.short.slice(0, 31),
      subtitle: `${spec.title}  ·  ${formatSavedDate(filterDate)}  ·  ${filtered.length} ${
        filtered.length === 1 ? "entry" : "entries"
      }`,
    });
    flash("Report exported.");
  };

  const updateRow = (id, field, value) => {
    setRows((prev) =>
      prev.map((row) => (row.id === id ? withDerived(sectionId, { ...row, [field]: value }) : row))
    );
  };

  const addRow = () => {
    const slNo = rows.length ? Math.max(...rows.map((r) => Number(r.slNo) || 0)) + 1 : 1;
    setRows((prev) => [...prev, blankRow(sectionId, slNo, filterDate)]);
  };

  const removeRow = (id) => {
    setRows((prev) => {
      const next = prev.filter((row) => row.id !== id).map((row, i) => ({ ...row, slNo: i + 1 }));
      return next.length ? next : [blankRow(sectionId, 1, filterDate)];
    });
  };

  const th =
    "px-2 py-2.5 text-left text-[10px] font-extrabold uppercase tracking-wider text-white border-r border-white/10 whitespace-nowrap";

  const renderCell = (row, col) => {
    if (col.type === "date") {
      return <DistillerDatePicker compact value={row.date} onChange={(v) => updateRow(row.id, "date", v)} />;
    }
    if (col.type === "time") {
      return <DistillerTimePicker compact value={row[col.key]} onChange={(v) => updateRow(row.id, col.key, v)} />;
    }
    if (col.type === "derived") {
      return (
        <input
          className={`${cellInput} bg-[#eef3f9] font-black tabular-nums text-[#0f2744]`}
          value={row[col.key] || ""}
          readOnly
          tabIndex={-1}
        />
      );
    }
    if (col.type === "qc") {
      return (
        <DistillerSelect
          compact
          value={row.qcStatus || ""}
          onChange={(v) => updateRow(row.id, "qcStatus", v)}
          options={[{ value: "", label: "Select" }, ...QC_STATUSES]}
          placeholder="Select"
        />
      );
    }
    if (col.type === "otherQc") {
      return (
        <DistillerSelect
          compact
          value={row.qcStatus || ""}
          onChange={(v) => updateRow(row.id, "qcStatus", v)}
          options={[{ value: "", label: "Select" }, ...OTHER_QC_STATUSES]}
          placeholder="Select"
        />
      );
    }
    return (
      <input
        className={cellInput}
        inputMode={col.type === "number" ? "decimal" : undefined}
        value={row[col.key] || ""}
        onChange={(e) => updateRow(row.id, col.key, e.target.value)}
      />
    );
  };

  return (
    <div className="w-full min-h-full px-4 sm:px-6 lg:px-8 py-5">
      <button
        type="button"
        onClick={() => navigate("/inward-outward")}
        className="mb-4 inline-flex items-center gap-1.5 text-xs font-bold text-[#2563eb] hover:underline"
      >
        <ArrowLeft size={14} strokeWidth={2.4} />
        Inward & Outward
      </button>

      <section className="w-full overflow-hidden rounded-2xl border border-sky-200/80 bg-white shadow-[0_8px_28px_rgba(15,39,68,0.08)]">
        <div className="bg-[#2563eb] px-5 py-5 sm:px-7 sm:py-6 text-white">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20">
                <Package size={22} strokeWidth={2.2} />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-sky-100">Outward</p>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight leading-tight">Outward Dispatch</h1>
                <p className="mt-0.5 text-xs font-semibold text-white/70 truncate">
                  {orgName} · {spec.title}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleSave}
                className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-xs font-extrabold text-[#2563eb] hover:bg-sky-50"
              >
                <Save size={14} strokeWidth={2.4} />
                Save report
              </button>
              <button
                type="button"
                onClick={handleExport}
                className="inline-flex items-center gap-1.5 rounded-xl bg-white/15 px-3.5 py-2 text-xs font-extrabold text-white ring-1 ring-white/25 hover:bg-white/25"
              >
                <FileSpreadsheet size={14} strokeWidth={2.4} />
                Export
              </button>
            </div>
          </div>
        </div>

        <div className="border-b border-sky-100 bg-[#f8fbff] px-4 py-3 sm:px-6">
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

        <div className="px-4 pt-4 sm:px-6">
          <ReportFilterBar
            dateValue={filterDate}
            onDateChange={setFilterDate}
            savedDates={savedDates}
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder={spec.searchPlaceholder}
            onAddRow={addRow}
            addLabel="Add row"
          />
          {status ? (
            <p
              className={`mt-2 text-xs font-bold ${statusType === "ok" ? "text-emerald-600" : "text-rose-600"}`}
            >
              {status}
            </p>
          ) : null}
        </div>

        <div className="overflow-x-auto px-2 pb-4 sm:px-4">
          <table className={`${spec.minWidth} w-full text-left text-[11px] border-collapse`}>
            <thead>
              <tr className="bg-[#1e3a8a]">
                <th colSpan={spec.columns.length + 1} className="px-3 py-2.5 text-center text-xs font-black tracking-wide text-white">
                  {spec.title}
                </th>
              </tr>
              <tr className="bg-[#2563eb]">
                {spec.columns.map((col) => (
                  <th key={col.key} className={`${th} ${col.width || ""}`}>
                    {col.label}
                  </th>
                ))}
                <th className={`${th} w-12`} />
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.id} className="bg-white align-top border-b border-sky-50 hover:bg-[#eef3f9]/70">
                  {spec.columns.map((col) => (
                    <td key={col.key} className="px-1.5 py-1.5">
                      {renderCell(row, col)}
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
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
