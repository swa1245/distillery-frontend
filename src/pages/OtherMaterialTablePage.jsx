import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, FileSpreadsheet, Package, Save, Trash2 } from "lucide-react";
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
import DistillerSelect from "../components/DistillerSelect";

const STORAGE_KEY = "distiller_other_material_table";

const MATERIALS = ["Coal", "Husk", "Enzyme", "Yeast", "Chemicals", "Mechanical parts"];

const HEADERS = [
  "Sl. No.",
  "Date",
  "Material",
  "Opening balance",
  "Party Name",
  "Bill No.",
  "Material description",
  "P.O. no. & date",
  "Invoice no. & date",
  "Vehicle no.",
  "Gross weight",
  "Net weight",
  "Tare weight",
  "Oil",
  "Ash %",
  "GCV %",
  "Moisture %",
  "Deduction",
  "Remarks",
  "",
];

const cellInput =
  "w-full min-w-[4.75rem] rounded-md border border-sky-100 bg-white px-1.5 py-1 text-[11px] font-semibold text-stone-800 outline-none focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb]/20";
const cellRead =
  "w-full min-w-[4.75rem] rounded-md border border-amber-100 bg-amber-50 px-1.5 py-1 text-[11px] font-black tabular-nums text-[#0f2744]";

function num(v) {
  const n = Number(String(v ?? "").replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : 0;
}

function roundQty(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

function withDerived(row) {
  const gross = num(row.grossWeight);
  const tare = num(row.tareWeight);
  const net =
    String(row.grossWeight || "").trim() || String(row.tareWeight || "").trim()
      ? String(roundQty(Math.max(gross - tare, 0)))
      : "";
  return { ...row, netWeight: net };
}

function blankRow(slNo, date = todayIso()) {
  return withDerived({
    id: `${Date.now()}-${slNo}-${Math.random().toString(36).slice(2, 7)}`,
    slNo,
    date,
    material: "",
    openingBalance: "",
    partyName: "",
    billNo: "",
    materialDescription: "",
    poNo: "",
    poDate: "",
    invoiceNo: "",
    invoiceDate: "",
    vehicleNo: "",
    grossWeight: "",
    netWeight: "",
    tareWeight: "",
    oil: "",
    ashPct: "",
    gcvPct: "",
    moisturePct: "",
    deduction: "",
    remarks: "",
  });
}

const EXPORT_HEADERS = HEADERS.filter(Boolean);

function formatDisplayDate(iso) {
  const m = String(iso || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return iso || "";
  return `${m[3]}/${m[2]}/${m[1].slice(2)}`;
}

function pair(no, date) {
  const a = String(no || "").trim();
  const b = formatDisplayDate(date);
  return [a, b].filter(Boolean).join(" / ");
}

function rowToExport(row) {
  return [
    row.slNo,
    formatDisplayDate(row.date),
    row.material,
    row.openingBalance,
    row.partyName,
    row.billNo,
    row.materialDescription,
    pair(row.poNo, row.poDate),
    pair(row.invoiceNo, row.invoiceDate),
    row.vehicleNo,
    row.grossWeight,
    row.netWeight,
    row.tareWeight,
    row.oil,
    row.ashPct,
    row.gcvPct,
    row.moisturePct,
    row.deduction,
    row.remarks,
  ];
}

export default function OtherMaterialTablePage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { user } = useAuth();
  const [filterDate, setFilterDate] = useState(todayIso);
  const [typeFilter, setTypeFilter] = useState(params.get("type") || "");
  const [search, setSearch] = useState("");
  const [savedDates, setSavedDates] = useState([]);
  const [rows, setRows] = useState([blankRow(1)]);
  const [status, setStatus] = useState("");
  const [statusType, setStatusType] = useState("ok");
  const orgName = user?.organizationName || "Digital Distillery";

  const refreshDates = () => setSavedDates(listSheetDates(loadSheetStore(STORAGE_KEY)));

  const hydrateRows = (list, date) => {
    if (!Array.isArray(list) || !list.length) return [blankRow(1, date)];
    return list.map((row, i) => withDerived({ ...blankRow(i + 1, date), ...row, slNo: i + 1 }));
  };

  useEffect(() => {
    refreshDates();
  }, []);

  useEffect(() => {
    const next = params.get("type") || "";
    setTypeFilter(next);
  }, [params]);

  useEffect(() => {
    const store = loadSheetStore(STORAGE_KEY);
    setRows(hydrateRows(readSheetRows(store, filterDate), filterDate));
  }, [filterDate]);

  const flash = (message, type = "ok") => {
    setStatus(message);
    setStatusType(type);
    window.setTimeout(() => setStatus(""), 2800);
  };

  const handleSave = () => {
    const store = loadSheetStore(STORAGE_KEY);
    store.sheets[filterDate] = rows.map((row) => ({ ...row, date: row.date || filterDate }));
    saveSheetStore(STORAGE_KEY, store);
    refreshDates();
    flash("Report saved.");
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (typeFilter && row.material !== typeFilter) return false;
      if (!q) return true;
      return [row.material, row.partyName, row.billNo, row.vehicleNo, row.poNo, row.invoiceNo, row.materialDescription]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [rows, search, typeFilter]);

  const handleExport = () => {
    downloadExcelTable({
      fileName: `Other_Material_${filterDate}.xlsx`,
      title: "Other material table",
      companyName: orgName,
      headers: EXPORT_HEADERS,
      rows: filtered.map(rowToExport),
      sheetName: "Other material",
      subtitle: `Coal, husk, enzyme & mechanical parts  ·  ${formatSavedDate(filterDate)}  ·  ${filtered.length} ${
        filtered.length === 1 ? "entry" : "entries"
      }`,
    });
    flash("Report exported.");
  };

  const updateRow = (id, field, value) => {
    setRows((prev) => prev.map((row) => (row.id === id ? withDerived({ ...row, [field]: value }) : row)));
  };

  const addRow = () => {
    const slNo = rows.length ? Math.max(...rows.map((r) => Number(r.slNo) || 0)) + 1 : 1;
    const next = blankRow(slNo, filterDate);
    if (typeFilter) next.material = typeFilter;
    setRows((prev) => [...prev, next]);
  };

  const removeRow = (id) => {
    setRows((prev) => {
      const next = prev.filter((row) => row.id !== id).map((row, i) => ({ ...row, slNo: i + 1 }));
      return next.length ? next : [blankRow(1, filterDate)];
    });
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
                <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-sky-100">
                  Inward & Outward
                </p>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight leading-tight">Other material table</h1>
                <p className="mt-0.5 text-xs font-semibold text-white/70 truncate">
                  {orgName} · Coal, husk, enzyme & mechanical parts
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
          typeLabel="Material"
          typeValue={typeFilter}
          typeOptions={MATERIALS}
          onTypeChange={setTypeFilter}
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search party, vehicle, bill…"
          onAddRow={addRow}
        />

        <div className="overflow-x-auto">
          <table className="min-w-[1980px] w-full border-collapse text-left text-[11px]">
            <thead>
              <tr className="bg-amber-300 text-[#1a1a1a] font-extrabold uppercase tracking-wide">
                {HEADERS.map((h, i) => (
                  <th
                    key={h || "del"}
                    className={`whitespace-nowrap border border-stone-400/70 px-2 py-2 ${i === 0 ? "w-12" : ""}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={HEADERS.length}
                    className="border border-stone-200 px-4 py-10 text-center text-sm font-bold text-stone-400"
                  >
                    No material entries yet. Click Add row.
                  </td>
                </tr>
              ) : (
                filtered.map((row) => (
                  <tr key={row.id} className="align-top bg-white">
                    <td className="border border-stone-200 px-2 py-1.5 text-center font-bold tabular-nums text-stone-500">
                      {row.slNo}
                    </td>
                    <td className="border border-stone-200 px-1 py-1 min-w-[148px]">
                      <DistillerDatePicker
                        compact
                        value={row.date}
                        onChange={(v) => updateRow(row.id, "date", v)}
                      />
                    </td>
                    <td className="border border-stone-200 px-1 py-1 min-w-[150px]">
                      <DistillerSelect
                        compact
                        value={row.material}
                        onChange={(v) => updateRow(row.id, "material", v)}
                        options={[{ value: "", label: "Select" }, ...MATERIALS]}
                        placeholder="Select"
                      />
                    </td>
                    <td className="border border-stone-200 px-1 py-1">
                      <input
                        className={cellInput}
                        inputMode="decimal"
                        value={row.openingBalance}
                        onChange={(e) => updateRow(row.id, "openingBalance", e.target.value)}
                      />
                    </td>
                    <td className="border border-stone-200 px-1 py-1 min-w-[140px]">
                      <input
                        className={cellInput}
                        value={row.partyName}
                        onChange={(e) => updateRow(row.id, "partyName", e.target.value)}
                      />
                    </td>
                    <td className="border border-stone-200 px-1 py-1 min-w-[100px]">
                      <input
                        className={cellInput}
                        value={row.billNo}
                        onChange={(e) => updateRow(row.id, "billNo", e.target.value)}
                      />
                    </td>
                    <td className="border border-stone-200 px-1 py-1 min-w-[150px]">
                      <input
                        className={cellInput}
                        value={row.materialDescription}
                        onChange={(e) => updateRow(row.id, "materialDescription", e.target.value)}
                      />
                    </td>
                    <td className="border border-stone-200 px-1 py-1 min-w-[170px]">
                      <div className="flex gap-1">
                        <input
                          className={cellInput}
                          value={row.poNo}
                          onChange={(e) => updateRow(row.id, "poNo", e.target.value)}
                          placeholder="PO no."
                        />
                        <DistillerDatePicker
                          compact
                          value={row.poDate}
                          onChange={(v) => updateRow(row.id, "poDate", v)}
                          placeholder="PO date"
                        />
                      </div>
                    </td>
                    <td className="border border-stone-200 px-1 py-1 min-w-[170px]">
                      <div className="flex gap-1">
                        <input
                          className={cellInput}
                          value={row.invoiceNo}
                          onChange={(e) => updateRow(row.id, "invoiceNo", e.target.value)}
                          placeholder="Invoice"
                        />
                        <DistillerDatePicker
                          compact
                          value={row.invoiceDate}
                          onChange={(v) => updateRow(row.id, "invoiceDate", v)}
                          placeholder="Inv. date"
                        />
                      </div>
                    </td>
                    <td className="border border-stone-200 px-1 py-1 min-w-[120px]">
                      <input
                        className={cellInput}
                        value={row.vehicleNo}
                        onChange={(e) => updateRow(row.id, "vehicleNo", e.target.value)}
                      />
                    </td>
                    <td className="border border-stone-200 px-1 py-1">
                      <input
                        className={cellInput}
                        inputMode="decimal"
                        value={row.grossWeight}
                        onChange={(e) => updateRow(row.id, "grossWeight", e.target.value)}
                      />
                    </td>
                    <td className="border border-stone-200 px-1 py-1">
                      <input className={cellRead} value={row.netWeight} readOnly tabIndex={-1} />
                    </td>
                    <td className="border border-stone-200 px-1 py-1">
                      <input
                        className={cellInput}
                        inputMode="decimal"
                        value={row.tareWeight}
                        onChange={(e) => updateRow(row.id, "tareWeight", e.target.value)}
                      />
                    </td>
                    {["oil", "ashPct", "gcvPct", "moisturePct", "deduction"].map((field) => (
                      <td key={field} className="border border-stone-200 px-1 py-1">
                        <input
                          className={cellInput}
                          inputMode="decimal"
                          value={row[field]}
                          onChange={(e) => updateRow(row.id, field, e.target.value)}
                        />
                      </td>
                    ))}
                    <td className="border border-stone-200 px-1 py-1 min-w-[130px]">
                      <input
                        className={cellInput}
                        value={row.remarks}
                        onChange={(e) => updateRow(row.id, "remarks", e.target.value)}
                      />
                    </td>
                    <td className="border border-stone-200 px-1 py-1 text-center">
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
