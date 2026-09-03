import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ClipboardList, FileSpreadsheet, Save, Trash2 } from "lucide-react";
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

const STORAGE_KEY = "distiller_visitor_table";

const STATUSES = ["Inside", "Exited", "Pending"];

const HEADERS = [
  "Sr. No.",
  "Date",
  "Entry Time",
  "Visitor / Driver Name",
  "Mobile No.",
  "Company / Organization",
  "Purpose of Visit",
  "Person / Department to Meet",
  "Vehicle No.",
  "Material / Item Detail",
  "Inward / Outward Pass / Challan No.",
  "Entry Approved By",
  "Exit Time",
  "Status",
  "Remarks",
  "",
];

const EXPORT_HEADERS = HEADERS.filter(Boolean);

const cellInput =
  "w-full min-w-[4.75rem] rounded-md border border-sky-100 bg-white px-1.5 py-1 text-[11px] font-semibold text-stone-800 outline-none focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb]/20";

function blankRow(slNo, date = todayIso()) {
  return {
    id: `v-${Date.now()}-${slNo}-${Math.random().toString(36).slice(2, 7)}`,
    slNo,
    date,
    entryTime: "",
    visitorName: "",
    mobileNo: "",
    company: "",
    purpose: "",
    meetPerson: "",
    vehicleNo: "",
    materialDetail: "",
    passNo: "",
    approvedBy: "",
    exitTime: "",
    status: "Pending",
    remarks: "",
  };
}

function formatDisplayDate(iso) {
  const m = String(iso || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return iso || "";
  return `${m[3]}/${m[2]}/${m[1].slice(2)}`;
}

function rowToExport(row) {
  return [
    row.slNo,
    formatDisplayDate(row.date),
    row.entryTime,
    row.visitorName,
    row.mobileNo,
    row.company,
    row.purpose,
    row.meetPerson,
    row.vehicleNo,
    row.materialDetail,
    row.passNo,
    row.approvedBy,
    row.exitTime,
    row.status,
    row.remarks,
  ];
}

export default function VisitorTablePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [filterDate, setFilterDate] = useState(todayIso);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [savedDates, setSavedDates] = useState([]);
  const [rows, setRows] = useState(() => Array.from({ length: 5 }, (_, i) => blankRow(i + 1)));
  const [status, setStatus] = useState("");
  const orgName = user?.organizationName || "Digital Distillery";

  const refreshDates = () => setSavedDates(listSheetDates(loadSheetStore(STORAGE_KEY)));

  const hydrateRows = (list, date) => {
    if (!Array.isArray(list) || !list.length) {
      return Array.from({ length: 5 }, (_, i) => blankRow(i + 1, date));
    }
    return list.map((row, i) => ({ ...blankRow(i + 1, date), ...row, slNo: i + 1 }));
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
      if (statusFilter && row.status !== statusFilter) return false;
      if (!q) return true;
      return [
        row.visitorName,
        row.mobileNo,
        row.company,
        row.purpose,
        row.meetPerson,
        row.vehicleNo,
        row.passNo,
        row.approvedBy,
        row.materialDetail,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [rows, search, statusFilter]);

  const handleExport = () => {
    downloadExcelTable({
      fileName: `Visitor_Table_${filterDate}.xlsx`,
      title: "Visitor table",
      companyName: orgName,
      headers: EXPORT_HEADERS,
      rows: filtered.map(rowToExport),
      sheetName: "Visitor table",
      subtitle: `Gate visitor log  ·  ${formatSavedDate(filterDate)}  ·  ${filtered.length} ${
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
        if (field === "exitTime" && value && next.status === "Pending") next.status = "Exited";
        if (field === "entryTime" && value && next.status === "Pending" && !next.exitTime) next.status = "Inside";
        return next;
      })
    );
  };

  const addRow = () => {
    const slNo = rows.length ? Math.max(...rows.map((r) => Number(r.slNo) || 0)) + 1 : 1;
    setRows((prev) => [...prev, blankRow(slNo, filterDate)]);
  };

  const removeRow = (id) => {
    setRows((prev) => {
      const next = prev.filter((row) => row.id !== id).map((row, i) => ({ ...row, slNo: i + 1 }));
      return next.length ? next : Array.from({ length: 5 }, (_, i) => blankRow(i + 1, filterDate));
    });
  };

  const insideCount = rows.filter((r) => r.status === "Inside").length;

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
                <ClipboardList size={22} strokeWidth={2.2} />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-sky-100">
                  Inward & Outward
                </p>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight leading-tight">Visitor table</h1>
                <p className="mt-0.5 text-xs font-semibold text-white/70 truncate">
                  {orgName} · Gate visitor log
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="rounded-xl bg-white/12 px-3.5 py-2 ring-1 ring-white/15">
                <p className="text-[9px] font-extrabold uppercase tracking-wider text-sky-100/80">Entries</p>
                <p className="text-lg font-black tabular-nums leading-tight">{rows.length}</p>
              </div>
              <div className="rounded-xl bg-white/12 px-3.5 py-2 ring-1 ring-white/15">
                <p className="text-[9px] font-extrabold uppercase tracking-wider text-sky-100/80">Inside</p>
                <p className="text-lg font-black tabular-nums leading-tight">{insideCount}</p>
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
          typeLabel="Status"
          typeValue={statusFilter}
          typeOptions={STATUSES}
          onTypeChange={setStatusFilter}
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search name, mobile, company, vehicle…"
          onAddRow={addRow}
        />

        <div className="overflow-x-auto">
          <table className="min-w-[1980px] w-full border-collapse text-left text-[11px]">
            <thead>
              <tr className="bg-[#0f2744] text-white font-extrabold uppercase tracking-wide text-[10px]">
                {HEADERS.map((h, i) => (
                  <th
                    key={h || "del"}
                    className={`whitespace-nowrap border border-white/10 px-2 py-2.5 text-center ${i === 0 ? "w-12" : ""}`}
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
                    No visitor entries yet. Click Add row.
                  </td>
                </tr>
              ) : (
                filtered.map((row) => (
                  <tr key={row.id} className="align-top bg-white hover:bg-[#eef3f9]/60">
                    <td className="border border-stone-200 px-2 py-1.5 text-center font-bold tabular-nums text-stone-500">
                      {row.slNo}
                    </td>
                    <td className="border border-stone-200 px-1 py-1 min-w-[148px]">
                      <DistillerDatePicker compact value={row.date} onChange={(v) => updateRow(row.id, "date", v)} />
                    </td>
                    <td className="border border-stone-200 px-1 py-1 min-w-[128px]">
                      <DistillerTimePicker
                        compact
                        value={row.entryTime}
                        onChange={(v) => updateRow(row.id, "entryTime", v)}
                      />
                    </td>
                    <td className="border border-stone-200 px-1 py-1 min-w-[160px]">
                      <input
                        className={cellInput}
                        value={row.visitorName}
                        onChange={(e) => updateRow(row.id, "visitorName", e.target.value)}
                      />
                    </td>
                    <td className="border border-stone-200 px-1 py-1 min-w-[120px]">
                      <input
                        className={cellInput}
                        inputMode="tel"
                        value={row.mobileNo}
                        onChange={(e) => updateRow(row.id, "mobileNo", e.target.value)}
                      />
                    </td>
                    <td className="border border-stone-200 px-1 py-1 min-w-[160px]">
                      <input
                        className={cellInput}
                        value={row.company}
                        onChange={(e) => updateRow(row.id, "company", e.target.value)}
                      />
                    </td>
                    <td className="border border-stone-200 px-1 py-1 min-w-[150px]">
                      <input
                        className={cellInput}
                        value={row.purpose}
                        onChange={(e) => updateRow(row.id, "purpose", e.target.value)}
                      />
                    </td>
                    <td className="border border-stone-200 px-1 py-1 min-w-[170px]">
                      <input
                        className={cellInput}
                        value={row.meetPerson}
                        onChange={(e) => updateRow(row.id, "meetPerson", e.target.value)}
                      />
                    </td>
                    <td className="border border-stone-200 px-1 py-1 min-w-[120px]">
                      <input
                        className={cellInput}
                        value={row.vehicleNo}
                        onChange={(e) => updateRow(row.id, "vehicleNo", e.target.value)}
                      />
                    </td>
                    <td className="border border-stone-200 px-1 py-1 min-w-[160px]">
                      <input
                        className={cellInput}
                        value={row.materialDetail}
                        onChange={(e) => updateRow(row.id, "materialDetail", e.target.value)}
                      />
                    </td>
                    <td className="border border-stone-200 px-1 py-1 min-w-[180px]">
                      <input
                        className={cellInput}
                        value={row.passNo}
                        onChange={(e) => updateRow(row.id, "passNo", e.target.value)}
                      />
                    </td>
                    <td className="border border-stone-200 px-1 py-1 min-w-[140px]">
                      <input
                        className={cellInput}
                        value={row.approvedBy}
                        onChange={(e) => updateRow(row.id, "approvedBy", e.target.value)}
                      />
                    </td>
                    <td className="border border-stone-200 px-1 py-1 min-w-[128px]">
                      <DistillerTimePicker
                        compact
                        value={row.exitTime}
                        onChange={(v) => updateRow(row.id, "exitTime", v)}
                      />
                    </td>
                    <td className="border border-stone-200 px-1 py-1 min-w-[130px]">
                      <DistillerSelect
                        compact
                        value={row.status || "Pending"}
                        onChange={(v) => updateRow(row.id, "status", v)}
                        options={STATUSES}
                      />
                    </td>
                    <td className="border border-stone-200 px-1 py-1 min-w-[140px]">
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
