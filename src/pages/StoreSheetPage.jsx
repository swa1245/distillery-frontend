import { useEffect, useMemo, useState } from "react";
import { FileSpreadsheet, Save, Trash2, Warehouse } from "lucide-react";
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

const CATEGORIES = ["Mechanical Parts", "Enzymes", "ADY (Yeast)", "Chemicals", "Lab Chemicals", "Packaging", "Others"];
const UNITS = ["KG", "MT", "L", "NOS", "SET", "DRUM"];
const LOCATIONS = ["STORE", "SILO 1", "SILO 2", "SILO 3", "MILLING", "FERMENTATION", "DISTILLERY", "LAB", "PACKAGING", "MAINTENANCE"];
const DEPARTMENTS = ["Milling", "Liquefaction", "Fermentation", "Distillery", "Laboratory", "Maintenance", "Packaging", "Boiler"];
const PRIORITIES = ["Normal", "Urgent", "Critical"];
const ITEM_STATUS = ["Active", "Blocked"];
const STOCK_STATUS = ["Normal", "Low", "Out", "Expiring"];
const INDENT_STATUS = ["Draft", "Open", "Approved", "Closed"];
const GRN_STATUS = ["Pending", "Received", "Accepted"];
const ISSUE_STATUS = ["Draft", "Issued", "Closed"];
const TRANSFER_STATUS = ["Pending", "In Transit", "Received"];
const ADJ_STATUS = ["Draft", "Posted"];
const ADJ_REASONS = ["Physical count", "Damage", "Expired", "Spillage", "Write-off", "Correction"];

function nowTime() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function nextDocNo(prefix, rows, key, date) {
  const stamp = String(date || todayIso()).replace(/-/g, "").slice(2);
  const used = new Set(rows.map((r) => String(r[key] || "")));
  let n = rows.length + 1;
  let code = `${prefix}-${stamp}-${String(n).padStart(3, "0")}`;
  while (used.has(code)) {
    n += 1;
    code = `${prefix}-${stamp}-${String(n).padStart(3, "0")}`;
  }
  return code;
}

const cellInput =
  "w-full min-w-[4.5rem] rounded-md border border-sky-100 bg-white px-1.5 py-1.5 text-[12px] font-semibold text-stone-800 outline-none focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb]/20";

const SHEETS = {
  items: {
    title: "Item Master",
    hint: "Item codes, units, locations, and reorder levels",
    storage: "distiller_store_items",
    empty: "No items for this date. Add a row to start the item master.",
    typeKey: "category",
    typeLabel: "Category",
    typeOptions: CATEGORIES,
    searchKeys: ["itemCode", "itemName", "specification", "location", "remark"],
    columns: [
      { key: "itemCode", label: "Item Code" },
      { key: "itemName", label: "Item Name" },
      { key: "category", label: "Category", type: "select", options: CATEGORIES },
      { key: "specification", label: "Specification" },
      { key: "unit", label: "Unit", type: "select", options: UNITS },
      { key: "minStock", label: "Min Stock" },
      { key: "maxStock", label: "Max Stock" },
      { key: "reorderQty", label: "Reorder Qty" },
      { key: "location", label: "Location", type: "select", options: LOCATIONS },
      { key: "shelfLifeDays", label: "Shelf Life (days)" },
      { key: "status", label: "Status", type: "select", options: ITEM_STATUS },
      { key: "remark", label: "Remark" },
    ],
    defaults: { status: "Active", location: "STORE", unit: "KG" },
    addLabel: "Add item",
    searchPlaceholder: "Search item code, name, location…",
  },
  stock: {
    title: "Stock Register",
    hint: "Daily inward, issue, and balance",
    storage: "distiller_store_stock",
    empty: "No stock movements for this date. Add a row to start the register.",
    typeKey: "category",
    typeLabel: "Category",
    typeOptions: CATEGORIES,
    searchKeys: ["itemCode", "itemName", "location", "operator", "remark"],
    columns: [
      { key: "time", label: "Time", type: "time" },
      { key: "itemCode", label: "Item Code" },
      { key: "itemName", label: "Item Name" },
      { key: "category", label: "Category", type: "select", options: CATEGORIES },
      { key: "qtyIn", label: "In" },
      { key: "qtyOut", label: "Out" },
      { key: "balance", label: "Balance" },
      { key: "unit", label: "Unit", type: "select", options: UNITS },
      { key: "location", label: "Location", type: "select", options: LOCATIONS },
      { key: "status", label: "Status", type: "select", options: STOCK_STATUS },
      { key: "operator", label: "Operator" },
      { key: "remark", label: "Remark" },
    ],
    defaults: { time: true, status: "Normal", location: "STORE" },
  },
  indent: {
    title: "Create Indent",
    hint: "Raise material requests for plant departments",
    storage: "distiller_store_indent",
    empty: "No indents for this date. Add a row to raise a material request.",
    typeKey: "status",
    typeLabel: "Status",
    typeOptions: INDENT_STATUS,
    searchKeys: ["indentNo", "department", "itemCode", "itemName", "requestedBy", "remark"],
    autoNo: { key: "indentNo", prefix: "IND" },
    addLabel: "Add indent",
    searchPlaceholder: "Search indent, item, department…",
    columns: [
      { key: "time", label: "Time", type: "time" },
      { key: "indentNo", label: "Indent No." },
      { key: "department", label: "Department", type: "select", options: DEPARTMENTS },
      { key: "requestedBy", label: "Requested By" },
      { key: "itemCode", label: "Item Code" },
      { key: "itemName", label: "Item Name" },
      { key: "qty", label: "Qty" },
      { key: "unit", label: "Unit", type: "select", options: UNITS },
      { key: "requiredDate", label: "Required Date", type: "date" },
      { key: "priority", label: "Priority", type: "select", options: PRIORITIES },
      { key: "status", label: "Status", type: "select", options: INDENT_STATUS },
      { key: "remark", label: "Purpose / Remark" },
    ],
    defaults: { time: true, status: "Draft", priority: "Normal", unit: "KG" },
  },
  grn: {
    title: "Goods Receipt (GRN)",
    hint: "Record incoming material against supplier invoices",
    storage: "distiller_store_grn",
    empty: "No GRNs for this date. Add a row to record a goods receipt.",
    typeKey: "status",
    typeLabel: "Status",
    typeOptions: GRN_STATUS,
    searchKeys: ["grnNo", "supplier", "invoiceNo", "itemCode", "itemName", "vehicleNo", "remark"],
    autoNo: { key: "grnNo", prefix: "GRN" },
    addLabel: "Add GRN",
    searchPlaceholder: "Search GRN, supplier, invoice…",
    columns: [
      { key: "time", label: "Time", type: "time" },
      { key: "grnNo", label: "GRN No." },
      { key: "supplier", label: "Supplier" },
      { key: "invoiceNo", label: "Invoice No." },
      { key: "vehicleNo", label: "Vehicle No." },
      { key: "itemCode", label: "Item Code" },
      { key: "itemName", label: "Item Name" },
      { key: "qty", label: "Qty Received" },
      { key: "unit", label: "Unit", type: "select", options: UNITS },
      { key: "batch", label: "Batch / Lot" },
      { key: "expiryDate", label: "Expiry Date", type: "date" },
      { key: "value", label: "Value (₹)" },
      { key: "status", label: "Status", type: "select", options: GRN_STATUS },
      { key: "remark", label: "Remark" },
    ],
    defaults: { time: true, status: "Pending", unit: "KG" },
  },
  issue: {
    title: "Issue Material",
    hint: "Issue store items to plant departments against indent",
    storage: "distiller_store_issue",
    empty: "No material issues for this date. Add a row to issue stock.",
    typeKey: "status",
    typeLabel: "Status",
    typeOptions: ISSUE_STATUS,
    searchKeys: ["issueNo", "indentNo", "itemCode", "itemName", "issuedTo", "issuedBy", "remark"],
    autoNo: { key: "issueNo", prefix: "ISS" },
    addLabel: "Add issue",
    searchPlaceholder: "Search issue, indent, item…",
    columns: [
      { key: "time", label: "Time", type: "time" },
      { key: "issueNo", label: "Issue No." },
      { key: "indentNo", label: "Indent No." },
      { key: "issuedTo", label: "Issued To", type: "select", options: DEPARTMENTS },
      { key: "itemCode", label: "Item Code" },
      { key: "itemName", label: "Item Name" },
      { key: "qty", label: "Qty Issued" },
      { key: "unit", label: "Unit", type: "select", options: UNITS },
      { key: "location", label: "From Location", type: "select", options: LOCATIONS },
      { key: "issuedBy", label: "Issued By" },
      { key: "status", label: "Status", type: "select", options: ISSUE_STATUS },
      { key: "remark", label: "Remark" },
    ],
    defaults: { time: true, status: "Draft", location: "STORE", unit: "KG" },
  },
  transfer: {
    title: "Stock Transfer",
    hint: "Move stock between store, silos, and plant locations",
    storage: "distiller_store_transfer",
    empty: "No transfers for this date. Add a row to move stock.",
    typeKey: "status",
    typeLabel: "Status",
    typeOptions: TRANSFER_STATUS,
    searchKeys: ["transferNo", "itemCode", "itemName", "fromLoc", "toLoc", "remark"],
    autoNo: { key: "transferNo", prefix: "TRF" },
    addLabel: "Add transfer",
    searchPlaceholder: "Search transfer, item, location…",
    columns: [
      { key: "time", label: "Time", type: "time" },
      { key: "transferNo", label: "Transfer No." },
      { key: "itemCode", label: "Item Code" },
      { key: "itemName", label: "Item Name" },
      { key: "fromLoc", label: "From", type: "select", options: LOCATIONS },
      { key: "toLoc", label: "To", type: "select", options: LOCATIONS },
      { key: "qty", label: "Qty" },
      { key: "unit", label: "Unit", type: "select", options: UNITS },
      { key: "transferredBy", label: "Transferred By" },
      { key: "status", label: "Status", type: "select", options: TRANSFER_STATUS },
      { key: "remark", label: "Remark" },
    ],
    defaults: { time: true, status: "Pending", fromLoc: "STORE", unit: "KG" },
  },
  adjustment: {
    title: "Stock Adjustment",
    hint: "Correct book stock after count, damage, expiry, or write-off",
    storage: "distiller_store_adjustment",
    empty: "No adjustments for this date. Add a row to correct stock.",
    typeKey: "status",
    typeLabel: "Status",
    typeOptions: ADJ_STATUS,
    searchKeys: ["adjNo", "itemCode", "itemName", "reason", "approvedBy", "remark"],
    autoNo: { key: "adjNo", prefix: "ADJ" },
    addLabel: "Add adjustment",
    searchPlaceholder: "Search adjustment, item, reason…",
    columns: [
      { key: "time", label: "Time", type: "time" },
      { key: "adjNo", label: "Adjustment No." },
      { key: "itemCode", label: "Item Code" },
      { key: "itemName", label: "Item Name" },
      { key: "bookQty", label: "Book Qty" },
      { key: "physicalQty", label: "Physical Qty" },
      { key: "diff", label: "Difference", type: "computed" },
      { key: "unit", label: "Unit", type: "select", options: UNITS },
      { key: "reason", label: "Reason", type: "select", options: ADJ_REASONS },
      { key: "approvedBy", label: "Approved By" },
      { key: "status", label: "Status", type: "select", options: ADJ_STATUS },
      { key: "remark", label: "Remark" },
    ],
    defaults: { time: true, status: "Draft", reason: "Physical count", unit: "KG" },
  },
  alerts: {
    title: "Low Stock Alert",
    hint: "Items below reorder level",
    storage: "distiller_store_alerts",
    empty: "No low-stock alerts for this date. Add a row if an item is below min level.",
    typeKey: "category",
    typeLabel: "Category",
    typeOptions: CATEGORIES,
    searchKeys: ["itemCode", "itemName", "remark"],
    columns: [
      { key: "itemCode", label: "Item Code" },
      { key: "itemName", label: "Item Name" },
      { key: "category", label: "Category", type: "select", options: CATEGORIES },
      { key: "currentStock", label: "Current" },
      { key: "minStock", label: "Min" },
      { key: "reorderQty", label: "Reorder Qty" },
      { key: "unit", label: "Unit", type: "select", options: UNITS },
      { key: "remark", label: "Remark" },
    ],
  },
  expiry: {
    title: "Expiry / Shelf Life",
    hint: "Lots nearing expiry",
    storage: "distiller_store_expiry",
    empty: "No expiry lots for this date. Add a row to track shelf life.",
    typeKey: "category",
    typeLabel: "Category",
    typeOptions: CATEGORIES,
    searchKeys: ["itemCode", "itemName", "batch", "remark"],
    columns: [
      { key: "itemCode", label: "Item Code" },
      { key: "itemName", label: "Item Name" },
      { key: "category", label: "Category", type: "select", options: CATEGORIES },
      { key: "batch", label: "Batch" },
      { key: "expiryDate", label: "Expiry Date", type: "date" },
      { key: "qty", label: "Qty" },
      { key: "unit", label: "Unit", type: "select", options: UNITS },
      { key: "daysLeft", label: "Days Left" },
      { key: "remark", label: "Remark" },
    ],
  },
};

function computedValue(row, col) {
  if (col.key === "diff") {
    const d = Number(row.physicalQty) - Number(row.bookQty);
    return Number.isFinite(d) ? String(d) : "";
  }
  return row[col.key] || "";
}

function blankRow(config, slNo, date = todayIso(), existing = []) {
  const row = { id: `r-${Date.now()}-${slNo}-${Math.random().toString(36).slice(2, 7)}`, slNo, date };
  for (const col of config.columns) row[col.key] = "";
  const defaults = config.defaults || {};
  for (const [key, value] of Object.entries(defaults)) {
    if (key === "time" && value === true) row.time = nowTime();
    else if (key !== "time") row[key] = value;
  }
  if (config.autoNo) {
    row[config.autoNo.key] = nextDocNo(config.autoNo.prefix, existing, config.autoNo.key, date);
  }
  return row;
}

function hydrate(config, row, i) {
  return {
    ...blankRow(config, i + 1),
    ...row,
    id: row.id && String(row.id).startsWith("r-") ? row.id : `r-${Date.now()}-${i}`,
    slNo: row.slNo || i + 1,
  };
}

export default function StoreSheetPage({ sheetId }) {
  const { user } = useAuth();
  const config = SHEETS[sheetId] || SHEETS.stock;
  const [filterDate, setFilterDate] = useState(todayIso);
  const [typeFilter, setTypeFilter] = useState("");
  const [search, setSearch] = useState("");
  const [savedDates, setSavedDates] = useState([]);
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState("");
  const orgName = user?.organizationName || "Digital Distillery";
  const colCount = config.columns.length + 2;

  const refreshDates = () => setSavedDates(listSheetDates(loadSheetStore(config.storage)));

  useEffect(() => {
    setTypeFilter("");
    setSearch("");
    const store = loadSheetStore(config.storage);
    setRows(readSheetRows(store, filterDate).map((row, i) => hydrate(config, row, i)));
    refreshDates();
  }, [filterDate, sheetId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (typeFilter && row[config.typeKey] !== typeFilter) return false;
      if (!q) return true;
      return config.searchKeys.some((k) => String(row[k] || "").toLowerCase().includes(q));
    });
  }, [rows, typeFilter, search, config]);

  const flash = (msg) => {
    setStatus(msg);
    window.setTimeout(() => setStatus(""), 2200);
  };

  const patch = (id, key, value) => {
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, [key]: value } : row)));
  };

  const addRow = () =>
    setRows((prev) => {
      const next = blankRow(config, prev.length + 1, filterDate, prev);
      if (user?.username) {
        if ("requestedBy" in next && !next.requestedBy) next.requestedBy = user.username;
        if ("issuedBy" in next && !next.issuedBy) next.issuedBy = user.username;
        if ("transferredBy" in next && !next.transferredBy) next.transferredBy = user.username;
        if ("operator" in next && !next.operator) next.operator = user.username;
      }
      return [...prev, next];
    });

  const removeRow = (id) => {
    setRows((prev) => prev.filter((row) => row.id !== id).map((row, i) => ({ ...row, slNo: i + 1 })));
  };

  const handleSave = () => {
    const store = loadSheetStore(config.storage);
    store.sheets[filterDate] = rows;
    saveSheetStore(config.storage, store);
    refreshDates();
    flash("Register saved.");
  };

  const handleExport = () => {
    downloadExcelTable({
      title: config.title,
      companyName: orgName,
      headers: ["Sl", ...config.columns.map((c) => c.label)],
      rows: filtered.map((row) => [row.slNo, ...config.columns.map((c) => (c.type === "computed" ? computedValue(row, c) : row[c.key]))]),
      sheetName: config.title.slice(0, 31),
      subtitle: `${formatSavedDate(filterDate)}  ·  ${filtered.length} ${filtered.length === 1 ? "entry" : "entries"}`,
    });
    flash("Register exported.");
  };

  const renderCell = (row, col) => {
    if (col.type === "time") {
      return <DistillerTimePicker value={row[col.key]} onChange={(v) => patch(row.id, col.key, v)} compact />;
    }
    if (col.type === "date") {
      return <DistillerDatePicker compact value={row[col.key]} onChange={(v) => patch(row.id, col.key, v)} className="w-[138px]" />;
    }
    if (col.type === "select") {
      return (
        <DistillerSelect
          value={row[col.key]}
          onChange={(v) => patch(row.id, col.key, v)}
          options={col.options}
          compact
          placeholder={col.label}
        />
      );
    }
    if (col.type === "computed") {
      const val = computedValue(row, col);
      const n = Number(val);
      const tone = Number.isFinite(n) && n < 0 ? "text-rose-600" : Number.isFinite(n) && n > 0 ? "text-emerald-700" : "text-[#0f2744]";
      return <span className={`block min-w-[4.5rem] px-1.5 py-1.5 text-[12px] font-extrabold tabular-nums ${tone}`}>{val}</span>;
    }
    return <input className={cellInput} value={row[col.key] || ""} onChange={(e) => patch(row.id, col.key, e.target.value)} />;
  };

  return (
    <div className="w-full min-h-full px-4 sm:px-6 lg:px-8 py-5">
      <section className="w-full overflow-hidden rounded-2xl border border-sky-200/80 bg-white shadow-[0_8px_28px_rgba(15,39,68,0.08)]">
        <div className="bg-[#2563eb] px-5 py-5 sm:px-7 sm:py-6 text-white">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20">
                <Warehouse size={22} strokeWidth={2.2} />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-sky-100">Store</p>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight leading-tight">{config.title}</h1>
                <p className="mt-0.5 text-xs font-semibold text-white/70 truncate">
                  {orgName} · {config.hint}
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

        {status ? <div className="bg-sky-50 px-5 py-2 text-xs font-bold text-[#2563eb] sm:px-7">{status}</div> : null}

        <ReportFilterBar
          date={filterDate}
          onDateChange={setFilterDate}
          savedDates={savedDates}
          formatDate={formatSavedDate}
          typeLabel={config.typeLabel}
          typeValue={typeFilter}
          typeOptions={config.typeOptions}
          onTypeChange={setTypeFilter}
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder={config.searchPlaceholder || "Search item, code, remark…"}
          onAddRow={addRow}
          addLabel={config.addLabel || "Add row"}
        />

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1320px] border-collapse text-left">
            <thead className="bg-[#0f2744] text-[10px] font-extrabold uppercase tracking-wider text-sky-100">
              <tr>
                {["Sl", ...config.columns.map((c) => c.label), ""].map((h) => (
                  <th key={h || "del"} className="px-2 py-2.5 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={colCount} className="px-5 py-10 text-center text-sm font-semibold text-stone-400">
                    {config.empty}
                  </td>
                </tr>
              ) : (
                filtered.map((row) => (
                  <tr key={row.id} className="border-b border-sky-50">
                    <td className="px-2 py-1.5 text-[12px] font-extrabold tabular-nums text-[#0f2744]">{row.slNo}</td>
                    {config.columns.map((col) => (
                      <td key={col.key} className={`px-2 py-1.5 ${col.type === "time" || col.type === "select" || col.type === "date" ? "min-w-[8rem]" : ""}`}>
                        {renderCell(row, col)}
                      </td>
                    ))}
                    <td className="px-2 py-1.5">
                      <button type="button" onClick={() => removeRow(row.id)} className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50" aria-label="Delete row">
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
