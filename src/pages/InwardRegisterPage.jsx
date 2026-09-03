import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Search, Trash2, Wheat } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const STORAGE_KEY = "distiller_grain_inward";
const SHIFTS_KEY = "distiller_grain_inward_shifts";

const inputClass =
  "w-full rounded-lg border border-sky-200/80 bg-white px-2.5 py-2 text-sm font-semibold text-stone-800 outline-none placeholder:text-stone-400 focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/15";
const labelClass = "mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-stone-500";
const cellInput =
  "w-full min-w-[4.5rem] rounded-md border border-sky-100 bg-white px-1.5 py-1 text-[11px] font-semibold text-stone-800 outline-none focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb]/20";
const cellRead =
  "w-full min-w-[4.5rem] rounded-md border border-sky-50 bg-sky-50 px-1.5 py-1 text-[11px] font-black tabular-nums text-[#2563eb]";

function todayIso() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function num(v) {
  const n = Number(String(v ?? "").replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : 0;
}

function roundQty(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

function withDerived(entry) {
  const gross = num(entry.grossWeight);
  const tare = num(entry.tareWeight);
  const net = gross || tare ? String(roundQty(Math.max(gross - tare, 0))) : entry.netWeight;
  const opening = num(entry.openingBalance);
  const deduction = num(entry.deduction);
  const netN = num(net);
  const cb = opening || netN || deduction ? String(roundQty(opening + netN - deduction)) : entry.cb;
  return { ...entry, netWeight: net, cb };
}

function blankEntry(slNo) {
  return {
    id: `${Date.now()}-${slNo}`,
    slNo,
    date: todayIso(),
    openingBalance: "",
    partyName: "",
    billNo: "",
    material: "",
    materialDate: todayIso(),
    poNo: "",
    poDate: "",
    invoiceNo: "",
    invoiceDate: "",
    vehicleNo: "",
    grossWeight: "",
    tareWeight: "",
    netWeight: "",
    cb: "",
    ashPct: "",
    gcvPct: "",
    moisturePct: "",
    deduction: "",
    remarks: "",
  };
}

const SAMPLE = [
  withDerived({
    ...blankEntry(1),
    id: "sample-1",
    date: "2026-08-14",
    openingBalance: "42",
    partyName: "Shree Vinayaka",
    billNo: "BV-1042",
    material: "Husk",
    poNo: "PO-2281",
    poDate: "2026-08-12",
    invoiceNo: "INV-881",
    invoiceDate: "2026-08-14",
    vehicleNo: "UP-78-CT-0581",
    grossWeight: "28.40",
    tareWeight: "9.10",
    ashPct: "12.4",
    gcvPct: "3100",
    moisturePct: "11.2",
    deduction: "0.20",
    remarks: "OK",
  }),
  withDerived({
    ...blankEntry(2),
    id: "sample-2",
    date: "2026-08-14",
    openingBalance: "70",
    partyName: "Ganga Traders",
    billNo: "GT-77",
    material: "Maize",
    poNo: "PO-2288",
    poDate: "2026-08-13",
    invoiceNo: "INV-902",
    invoiceDate: "2026-08-14",
    vehicleNo: "KA-01-AB-3053",
    grossWeight: "32.10",
    tareWeight: "10.40",
    moisturePct: "13.8",
  }),
  withDerived({
    ...blankEntry(3),
    id: "sample-3",
    date: "2026-08-14",
    openingBalance: "18",
    partyName: "Deshmukh Agro",
    billNo: "DA-19",
    material: "Broken rice",
    poNo: "PO-2290",
    poDate: "2026-08-13",
    invoiceNo: "INV-910",
    invoiceDate: "2026-08-14",
    vehicleNo: "MH-12-EF-4412",
    grossWeight: "26.80",
    tareWeight: "8.90",
    moisturePct: "12.1",
    deduction: "0.10",
    remarks: "Wet bags 2",
  }),
];

function Field({ label, children }) {
  return (
    <label className="block min-w-0">
      <span className={labelClass}>{label}</span>
      {children}
    </label>
  );
}

export default function InwardRegisterPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [registerDate, setRegisterDate] = useState(todayIso());
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState([]);
  const [shifts, setShifts] = useState({ first: "", second: "", third: "", incharge: "" });

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      setRows((Array.isArray(saved) && saved.length ? saved : SAMPLE).map(withDerived));
    } catch {
      setRows(SAMPLE);
    }
    try {
      const savedShifts = JSON.parse(localStorage.getItem(SHIFTS_KEY) || "null");
      if (savedShifts) setShifts(savedShifts);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!rows.length) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
  }, [rows]);

  useEffect(() => {
    localStorage.setItem(SHIFTS_KEY, JSON.stringify(shifts));
  }, [shifts]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) =>
      [row.partyName, row.material, row.vehicleNo, row.billNo, row.invoiceNo, row.poNo]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [rows, search]);

  const totals = useMemo(() => {
    const net = rows.reduce((sum, row) => sum + num(row.netWeight), 0);
    return { trucks: rows.length, net };
  }, [rows]);

  const updateRow = (id, field, value) => {
    setRows((prev) => prev.map((row) => (row.id === id ? withDerived({ ...row, [field]: value }) : row)));
  };

  const addRow = () => {
    const slNo = rows.length ? Math.max(...rows.map((r) => Number(r.slNo) || 0)) + 1 : 1;
    setRows((prev) => [...prev, blankEntry(slNo)]);
  };

  const removeEntry = (id) => {
    setRows((prev) => {
      const next = prev.filter((row) => row.id !== id).map((row, i) => ({ ...row, slNo: i + 1 }));
      return next.length ? next : [blankEntry(1)];
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
                <Wheat size={22} strokeWidth={2.2} />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-sky-100">
                  Inward register
                </p>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight leading-tight">
                  Unloading & receipt log
                </h1>
                <p className="mt-0.5 text-xs font-semibold text-white/70 truncate">
                  {user?.organizationName || "Digital Distillery"} · Inward & outward
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="rounded-xl bg-white/12 px-3.5 py-2 ring-1 ring-white/15">
                <p className="text-[9px] font-extrabold uppercase tracking-wider text-sky-100/80">Receipts</p>
                <p className="text-lg font-black tabular-nums leading-tight">{totals.trucks}</p>
              </div>
              <div className="rounded-xl bg-white/12 px-3.5 py-2 ring-1 ring-white/15">
                <p className="text-[9px] font-extrabold uppercase tracking-wider text-sky-100/80">Net MT</p>
                <p className="text-lg font-black tabular-nums leading-tight">{roundQty(totals.net).toFixed(2)}</p>
              </div>
              <label className="rounded-xl bg-white/12 px-3.5 py-2 ring-1 ring-white/15">
                <p className="text-[9px] font-extrabold uppercase tracking-wider text-sky-100/80">Date</p>
                <input
                  type="date"
                  value={registerDate}
                  onChange={(e) => setRegisterDate(e.target.value)}
                  className="bg-transparent text-sm font-black text-white outline-none [color-scheme:dark]"
                />
              </label>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sky-100 bg-[#eef3f9] px-5 py-3 sm:px-7">
          <div className="relative min-w-[220px] flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search party, vehicle, material…"
              className={`${inputClass} pl-9`}
            />
          </div>
          <button
            type="button"
            onClick={addRow}
            className="inline-flex items-center gap-2 rounded-xl bg-[#2563eb] px-3.5 py-2 text-sm font-bold text-white shadow-[0_8px_16px_rgba(37,99,235,0.2)] hover:bg-[#163056]"
          >
            <Plus size={16} strokeWidth={2.4} />
            Add inward
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[1480px] w-full text-left text-[11px]">
            <thead className="bg-[#0f2744] text-white">
              <tr className="font-extrabold uppercase tracking-wider">
                {[
                  "Sl",
                  "Date",
                  "Op. bal",
                  "Party name",
                  "Bill no",
                  "Material",
                  "PO no / date",
                  "Invoice / date",
                  "Vehicle no",
                  "Gross",
                  "Tare",
                  "Net",
                  "CB",
                  "Ash %",
                  "GCV",
                  "Moist %",
                  "Ded.",
                  "Remarks",
                  "",
                ].map((h) => (
                  <th key={h || "del"} className="whitespace-nowrap px-2 py-2.5">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-sky-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={19} className="px-4 py-10 text-center text-sm font-bold text-stone-400">
                    No inward receipts yet. Click Add inward to insert a row.
                  </td>
                </tr>
              ) : (
                filtered.map((row) => (
                  <tr key={row.id} className="bg-white align-top">
                    <td className="px-2 py-1.5 tabular-nums font-bold text-stone-500">{row.slNo}</td>
                    <td className="px-1.5 py-1.5">
                      <input type="date" className={cellInput} value={row.date} onChange={(e) => updateRow(row.id, "date", e.target.value)} />
                    </td>
                    <td className="px-1.5 py-1.5">
                      <input className={cellInput} value={row.openingBalance} onChange={(e) => updateRow(row.id, "openingBalance", e.target.value)} />
                    </td>
                    <td className="px-1.5 py-1.5 min-w-[140px]">
                      <input className={cellInput} value={row.partyName} onChange={(e) => updateRow(row.id, "partyName", e.target.value)} />
                    </td>
                    <td className="px-1.5 py-1.5">
                      <input className={cellInput} value={row.billNo} onChange={(e) => updateRow(row.id, "billNo", e.target.value)} />
                    </td>
                    <td className="px-1.5 py-1.5 min-w-[110px]">
                      <input className={cellInput} value={row.material} onChange={(e) => updateRow(row.id, "material", e.target.value)} />
                    </td>
                    <td className="px-1.5 py-1.5 min-w-[160px]">
                      <div className="flex gap-1">
                        <input className={cellInput} value={row.poNo} onChange={(e) => updateRow(row.id, "poNo", e.target.value)} placeholder="PO" />
                        <input type="date" className={cellInput} value={row.poDate} onChange={(e) => updateRow(row.id, "poDate", e.target.value)} />
                      </div>
                    </td>
                    <td className="px-1.5 py-1.5 min-w-[160px]">
                      <div className="flex gap-1">
                        <input className={cellInput} value={row.invoiceNo} onChange={(e) => updateRow(row.id, "invoiceNo", e.target.value)} placeholder="Inv" />
                        <input type="date" className={cellInput} value={row.invoiceDate} onChange={(e) => updateRow(row.id, "invoiceDate", e.target.value)} />
                      </div>
                    </td>
                    <td className="px-1.5 py-1.5 min-w-[120px]">
                      <input className={cellInput} value={row.vehicleNo} onChange={(e) => updateRow(row.id, "vehicleNo", e.target.value)} />
                    </td>
                    <td className="px-1.5 py-1.5">
                      <input className={cellInput} value={row.grossWeight} onChange={(e) => updateRow(row.id, "grossWeight", e.target.value)} />
                    </td>
                    <td className="px-1.5 py-1.5">
                      <input className={cellInput} value={row.tareWeight} onChange={(e) => updateRow(row.id, "tareWeight", e.target.value)} />
                    </td>
                    <td className="px-1.5 py-1.5">
                      <input className={cellRead} value={row.netWeight} readOnly />
                    </td>
                    <td className="px-1.5 py-1.5">
                      <input className={cellRead} value={row.cb} readOnly />
                    </td>
                    <td className="px-1.5 py-1.5">
                      <input className={cellInput} value={row.ashPct} onChange={(e) => updateRow(row.id, "ashPct", e.target.value)} />
                    </td>
                    <td className="px-1.5 py-1.5">
                      <input className={cellInput} value={row.gcvPct} onChange={(e) => updateRow(row.id, "gcvPct", e.target.value)} />
                    </td>
                    <td className="px-1.5 py-1.5">
                      <input className={cellInput} value={row.moisturePct} onChange={(e) => updateRow(row.id, "moisturePct", e.target.value)} />
                    </td>
                    <td className="px-1.5 py-1.5">
                      <input className={cellInput} value={row.deduction} onChange={(e) => updateRow(row.id, "deduction", e.target.value)} />
                    </td>
                    <td className="px-1.5 py-1.5 min-w-[120px]">
                      <input className={cellInput} value={row.remarks} onChange={(e) => updateRow(row.id, "remarks", e.target.value)} />
                    </td>
                    <td className="px-1.5 py-1.5">
                      <button
                        type="button"
                        onClick={() => removeEntry(row.id)}
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

        <div className="grid gap-3 border-t border-sky-100 bg-[#eef3f9] px-5 py-4 sm:grid-cols-4 sm:px-7">
          <Field label="1st shift">
            <input className={inputClass} value={shifts.first} onChange={(e) => setShifts((s) => ({ ...s, first: e.target.value }))} placeholder="Name" />
          </Field>
          <Field label="2nd shift">
            <input className={inputClass} value={shifts.second} onChange={(e) => setShifts((s) => ({ ...s, second: e.target.value }))} placeholder="Name" />
          </Field>
          <Field label="3rd shift">
            <input className={inputClass} value={shifts.third} onChange={(e) => setShifts((s) => ({ ...s, third: e.target.value }))} placeholder="Name" />
          </Field>
          <Field label="Store incharge">
            <input className={inputClass} value={shifts.incharge} onChange={(e) => setShifts((s) => ({ ...s, incharge: e.target.value }))} placeholder="Signature / name" />
          </Field>
        </div>
      </section>
    </div>
  );
}
