import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeftRight,
  Beaker,
  Clock3,
  Cog,
  FlaskConical,
  Microscope,
  Package,
  Plus,
  TestTube2,
  Warehouse,
  Boxes,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import DistillerDatePicker from "../components/DistillerDatePicker";
import DistillerSelect from "../components/DistillerSelect";
import { todayIso } from "../utils/datedSheetStore";
import { DonutChart } from "../components/dashboard/MiniCharts";

const SHIFTS = [
  { value: "A", label: "Shift A (06:00 – 14:00)" },
  { value: "B", label: "Shift B (14:00 – 22:00)" },
  { value: "C", label: "Shift C (22:00 – 06:00)" },
];

const PERIODS = [
  { value: "today", label: "Today" },
  { value: "1m", label: "1 Month" },
  { value: "2m", label: "2 Months" },
  { value: "all", label: "All Time" },
];

const CATEGORIES = [
  { name: "Mechanical Parts", items: 356, qty: "68.45 MT", value: "₹ 24,35,600", icon: Cog, tone: "bg-sky-50 text-sky-700" },
  { name: "Enzymes", items: 48, qty: "12.80 MT", value: "₹ 18,40,200", icon: FlaskConical, tone: "bg-violet-50 text-violet-700" },
  { name: "ADY (Yeast)", items: 22, qty: "4.65 MT", value: "₹ 9,85,400", icon: Microscope, tone: "bg-sky-50 text-blue-700" },
  { name: "Chemicals", items: 186, qty: "94.20 MT", value: "₹ 32,10,800", icon: TestTube2, tone: "bg-amber-50 text-amber-700" },
  { name: "Lab Chemicals", items: 94, qty: "6.12 MT", value: "₹ 8,64,500", icon: Beaker, tone: "bg-rose-50 text-rose-700" },
  { name: "Packaging", items: 412, qty: "38.40 MT", value: "₹ 14,22,000", icon: Package, tone: "bg-stone-100 text-stone-600" },
  { name: "Others", items: 130, qty: "173.90 MT", value: "₹ 17,27,260", icon: Boxes, tone: "bg-cyan-50 text-cyan-700" },
];

const TOP_ITEMS = [
  ["ST-ME-0142", "Pump Seal Kit", "Mechanical Parts", "SET", "12", "20", "80", "Low"],
  ["ST-EN-0088", "Glucoamylase", "Enzymes", "KG", "186", "50", "400", "Normal"],
  ["ST-AY-0012", "Active Dry Yeast", "ADY (Yeast)", "KG", "42", "25", "120", "Normal"],
  ["ST-CH-0210", "Caustic Flakes", "Chemicals", "KG", "8", "40", "200", "Low"],
  ["ST-LC-0044", "Buffer Solution pH 4", "Lab Chemicals", "L", "18", "10", "60", "Normal"],
  ["ST-PK-0311", "ENA Drum 200 L", "Packaging", "NOS", "64", "30", "200", "Normal"],
  ["ST-CH-0067", "Antifoam", "Chemicals", "KG", "0", "15", "80", "Out"],
  ["ST-ME-0091", "Gear Oil ISO 220", "Mechanical Parts", "L", "22", "20", "100", "Normal"],
  ["ST-EN-0019", "Alpha Amylase", "Enzymes", "KG", "11", "20", "150", "Low"],
  ["ST-OT-0008", "Urea Prills", "Others", "MT", "6.4", "2.0", "20", "Normal"],
];

const GRN_TODAY = [
  ["GRN-240428-12", "28 Apr", "AgriChem Pvt Ltd", "6", "12.40 MT", "₹ 4,86,200"],
  ["GRN-240428-11", "28 Apr", "Enzyme Bio Labs", "2", "0.48 MT", "₹ 1,92,400"],
  ["GRN-240428-10", "28 Apr", "Yeast Tech India", "1", "0.20 MT", "₹ 86,000"],
  ["GRN-240428-09", "28 Apr", "PackWell Drums", "4", "1.10 MT", "₹ 54,800"],
  ["GRN-240428-08", "28 Apr", "MechSpares Co.", "9", "0.32 MT", "₹ 41,260"],
];

const LOW_STOCK = [
  ["ST-CH-0067", "Antifoam", "Chemicals", "0", "15", "40"],
  ["ST-CH-0210", "Caustic Flakes", "Chemicals", "8", "40", "80"],
  ["ST-ME-0142", "Pump Seal Kit", "Mechanical Parts", "12", "20", "24"],
  ["ST-EN-0019", "Alpha Amylase", "Enzymes", "11", "20", "40"],
  ["ST-PK-0022", "HDPE Liner Bag", "Packaging", "90", "150", "200"],
];

const EXPIRY = [
  ["ST-AY-0012", "Active Dry Yeast", "12 May 2025", "42 KG", 14],
  ["ST-EN-0088", "Glucoamylase", "18 May 2025", "186 KG", 20],
  ["ST-LC-0044", "Buffer Solution pH 4", "02 Jun 2025", "18 L", 35],
  ["ST-CH-0094", "Antimicrobial", "08 Jun 2025", "26 KG", 41],
  ["ST-EN-0019", "Alpha Amylase", "15 Jun 2025", "11 KG", 48],
];

const NOTES = [
  "Verify GRN items before acceptance.",
  "FEFO method to be followed for issuing.",
  "Maintain minimum stock as per min. level.",
  "Report any expired / damaged material immediately.",
];

const QUICK = [
  { label: "Create Indent", icon: Plus, to: "/store/indent" },
  { label: "Goods Receipt (GRN)", icon: Package, to: "/store/grn" },
  { label: "Issue Material", icon: ArrowLeftRight, to: "/store/issue" },
  { label: "Stock Transfer", icon: Warehouse, to: "/store/transfer" },
  { label: "Item Master", icon: Boxes, to: "/store/items" },
  { label: "Stock Adjustment", icon: Cog, to: "/store/adjustment" },
];

const PERIOD_KPI = {
  today: {
    items: "1,248",
    itemsSub: "Active items",
    value: "₹ 1,24,85,760",
    qty: "398.52",
    low: "28",
    oos: "7",
    expiring: "15",
  },
  "1m": {
    items: "1,248",
    itemsSub: "Active items",
    value: "₹ 1,24,85,760",
    qty: "398.52",
    low: "34",
    oos: "9",
    expiring: "22",
  },
  "2m": {
    items: "1,248",
    itemsSub: "Active items",
    value: "₹ 1,24,85,760",
    qty: "398.52",
    low: "41",
    oos: "11",
    expiring: "38",
  },
  all: {
    items: "1,248",
    itemsSub: "Active items",
    value: "₹ 1,24,85,760",
    qty: "398.52",
    low: "28",
    oos: "7",
    expiring: "15",
  },
};

const DONUT = [
  { label: "Normal", value: 1025, color: "#22c55e", pct: "82.1%" },
  { label: "Low Stock", value: 28, color: "#eab308", pct: "2.2%" },
  { label: "Out of Stock", value: 7, color: "#ef4444", pct: "0.6%" },
  { label: "Expiring Soon", value: 15, color: "#f97316", pct: "1.2%" },
  { label: "Blocked", value: 22, color: "#64748b", pct: "1.8%" },
  { label: "In Transit", value: 151, color: "#3b82f6", pct: "12.1%" },
];

const STATUS_STYLE = {
  Normal: "bg-sky-50 text-blue-700",
  Low: "bg-amber-50 text-amber-700",
  Out: "bg-rose-50 text-rose-700",
};

function firstName(user) {
  const raw = String(user?.username || "Operator").trim();
  return raw.split(/\s+/)[0].replace(/^./, (c) => c.toUpperCase());
}

function roleLabel(user) {
  const r = String(user?.role || "User");
  if (r.toLowerCase() === "admin") return "Store Incharge";
  return r.replace(/_/g, " ");
}

function Card({ title, children, className = "", action }) {
  return (
    <section className={`rounded-2xl border border-stone-200/80 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)] ${className}`}>
      {(title || action) && (
        <div className="mb-3 flex items-center justify-between gap-2">
          {title ? <h2 className="text-[13px] font-extrabold tracking-tight text-[#0f2744]">{title}</h2> : <span />}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

function daysTone(days) {
  if (days <= 15) return "text-rose-600";
  if (days <= 30) return "text-amber-600";
  return "text-blue-600";
}

export default function StoreOverviewPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [date, setDate] = useState(todayIso);
  const [shift, setShift] = useState("A");
  const [period, setPeriod] = useState("today");
  const kpi = PERIOD_KPI[period] || PERIOD_KPI.today;
  const name = firstName(user);
  const initials = name.slice(0, 1).toUpperCase();
  const periodLabel = period === "today" ? "Today" : "This period";

  const kpis = [
    { title: "Total Items", value: kpi.items, sub: kpi.itemsSub, link: "View items", to: "/store/items", icon: Package, tone: "bg-sky-50 text-sky-700" },
    { title: "Total Stock Value", value: kpi.value, sub: "At store", link: "View stock", to: "/store/stock", icon: Warehouse, tone: "bg-sky-50 text-blue-700" },
    { title: "Total Stock (Qty)", value: `${kpi.qty} MT`, sub: "All categories", link: "View stock", to: "/store/stock", icon: Boxes, tone: "bg-violet-50 text-violet-700" },
    { title: "Low Stock Items", value: kpi.low, sub: "Below reorder level", link: "View alerts", to: "/store/alerts", icon: AlertTriangle, tone: "bg-amber-50 text-amber-700", warn: true },
    { title: "Out of Stock Items", value: kpi.oos, sub: "Require immediate action", link: "View alerts", to: "/store/alerts", icon: AlertTriangle, tone: "bg-rose-50 text-rose-600", alert: true },
    { title: "Expiring Soon", value: kpi.expiring, sub: "Within 30 days", link: "View expiry", to: "/store/expiry", icon: Clock3, tone: "bg-orange-50 text-orange-600" },
  ];

  return (
    <div className="min-h-full bg-stone-250 px-4 py-4 sm:px-6 lg:px-7">
      <header className="mb-4 rounded-2xl border border-stone-200/80 bg-white px-5 py-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#2563eb]">Store</p>
            <h1 className="mt-0.5 text-2xl font-black tracking-tight text-[#0f2744]">Store Overview</h1>
            <p className="mt-0.5 text-sm font-medium text-stone-500">Inventory and stock management at a glance.</p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2.5">
            <DistillerDatePicker value={date} onChange={setDate} compact className="w-[148px]" />
            <DistillerSelect value={period} onChange={setPeriod} options={PERIODS} compact className="w-[158px]" />
            <DistillerSelect value={shift} onChange={setShift} options={SHIFTS} compact className="w-[210px]" />
            <button
              type="button"
              onClick={() => navigate("/store/grn")}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[#3b74e8] bg-white px-3 text-[12px] font-bold text-[#3b74e8] hover:bg-[#e8f0fe]"
            >
              <Plus size={14} strokeWidth={2.6} />
              GRN (Goods Receipt)
            </button>
            <button
              type="button"
              onClick={() => navigate("/store/indent")}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[#3b74e8] px-3 text-[12px] font-bold text-white shadow-sm hover:bg-[#2f63d4]"
            >
              <Plus size={14} strokeWidth={2.6} />
              New Indent / Request
            </button>
            <div className="flex items-center gap-2.5 rounded-xl border border-stone-200 bg-white py-1 pl-1 pr-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#2563eb] text-xs font-black text-white">{initials}</span>
              <div className="min-w-0 leading-tight">
                <p className="truncate text-[12px] font-extrabold text-[#0f2744]">{user?.username || "Operator"}</p>
                <p className="text-[10px] font-bold text-stone-400">{roleLabel(user)}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-6">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <article key={k.title} className="rounded-2xl border border-stone-200/80 bg-white p-3.5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
              <div className="flex items-start justify-between gap-2">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-stone-400">{k.title}</p>
                <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${k.tone}`}>
                  <Icon size={15} />
                </span>
              </div>
              <p className={`mt-1 text-[22px] font-black tabular-nums leading-none ${k.alert ? "text-rose-600" : k.warn ? "text-amber-600" : "text-[#0f2744]"}`}>
                {k.value}
              </p>
              <p className="mt-1 text-[10px] font-bold text-stone-400">{k.sub}</p>
              <button type="button" onClick={() => navigate(k.to)} className="mt-2 text-[10px] font-extrabold text-[#3b74e8]">
                {k.link} →
              </button>
            </article>
          );
        })}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-7">
        {CATEGORIES.map((c) => {
          const Icon = c.icon;
          return (
            <button
              key={c.name}
              type="button"
              onClick={() => navigate("/store/stock")}
              className="rounded-2xl border border-stone-200/80 bg-white p-3.5 text-left shadow-[0_8px_24px_rgba(15,23,42,0.04)] hover:border-[#3b74e8]/40"
            >
              <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${c.tone}`}>
                <Icon size={15} />
              </span>
              <p className="mt-2 text-[12px] font-extrabold text-[#0f2744]">{c.name}</p>
              <p className="text-[11px] font-bold text-stone-500">{c.items} items · {c.qty}</p>
              <p className="text-[11px] font-extrabold text-[#0f2744]">{c.value}</p>
              <span className="mt-1 inline-block text-[10px] font-extrabold text-[#3b74e8]">View details →</span>
            </button>
          );
        })}
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-[1.25fr_0.75fr_1fr]">
        <Card
          title="Top 10 Items — Stock Summary"
          action={
            <button type="button" onClick={() => navigate("/store/stock")} className="text-[10px] font-extrabold text-[#3b74e8]">
              View all →
            </button>
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left">
              <thead>
                <tr className="text-[10px] font-extrabold uppercase tracking-wider text-stone-400">
                  {["Item Code", "Item Name", "Category", "Unit", "Current", "Min", "Max", "Status"].map((h) => (
                    <th key={h} className="pb-2 pr-3">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {TOP_ITEMS.map((row) => (
                  <tr key={row[0]}>
                    {row.map((c, i) => (
                      <td key={i} className="py-2 pr-3 text-[12px] font-semibold">
                        {i === 7 ? (
                          <span className={`rounded-full px-2 py-0.5 text-[9px] font-extrabold ${STATUS_STYLE[c] || "bg-stone-100 text-stone-500"}`}>{c}</span>
                        ) : (
                          <span className={i === 0 || i === 1 ? "font-extrabold text-[#0f2744]" : "tabular-nums text-stone-700"}>{c}</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title="Stock Status">
          <div className="flex flex-col items-center">
            <DonutChart segments={DONUT} total={1248} centerLabel="ITEMS" />
            <ul className="mt-1 w-full space-y-1.5">
              {DONUT.map((s) => (
                <li key={s.label} className="flex items-center justify-between text-[11px] font-bold">
                  <span className="flex items-center gap-2 text-stone-600">
                    <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                    {s.label}
                  </span>
                  <span className="tabular-nums text-[#0f2744]">{s.pct}</span>
                </li>
              ))}
            </ul>
          </div>
        </Card>

        <Card
          title="Recent Goods Receipts"
          action={
            <button type="button" onClick={() => navigate("/store/grn")} className="text-[10px] font-extrabold text-[#3b74e8]">
              Open GRN →
            </button>
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-left">
              <thead>
                <tr className="text-[10px] font-extrabold uppercase tracking-wider text-stone-400">
                  {["GRN No.", "Date", "Supplier", "Items", "Qty", "Value"].map((h) => (
                    <th key={h} className="pb-2 pr-2">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {GRN_TODAY.map((row) => (
                  <tr key={row[0]}>
                    {row.map((c, i) => (
                      <td key={i} className={`py-2 pr-2 text-[11px] font-semibold ${i === 0 || i === 5 ? "font-extrabold text-[#0f2744]" : "text-stone-600"}`}>
                        {c}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[10px] font-bold text-stone-400">{periodLabel} receipts shown as plant figures.</p>
        </Card>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-[1.15fr_1fr_0.85fr]">
        <Card
          title="Low Stock Alert"
          action={
            <button type="button" onClick={() => navigate("/store/alerts")} className="text-[10px] font-extrabold text-[#3b74e8]">
              View all →
            </button>
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left">
              <thead>
                <tr className="text-[10px] font-extrabold uppercase tracking-wider text-stone-400">
                  {["Item Code", "Item Name", "Category", "Current", "Min", "Reorder", "Action"].map((h) => (
                    <th key={h} className="pb-2 pr-2">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {LOW_STOCK.map((row) => (
                  <tr key={row[0]}>
                    {row.map((c, i) => (
                      <td key={i} className={`py-2 pr-2 text-[12px] font-semibold ${i === 1 ? "font-extrabold text-[#0f2744]" : "tabular-nums text-stone-700"}`}>
                        {c}
                      </td>
                    ))}
                    <td className="py-2">
                      <button type="button" onClick={() => navigate("/store/indent")} className="text-[10px] font-extrabold text-[#3b74e8]">
                        Indent
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card
          title="Expiry / Shelf Life — Due Soon"
          action={
            <button type="button" onClick={() => navigate("/store/expiry")} className="text-[10px] font-extrabold text-[#3b74e8]">
              View all →
            </button>
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-left">
              <thead>
                <tr className="text-[10px] font-extrabold uppercase tracking-wider text-stone-400">
                  {["Item Code", "Item Name", "Expiry", "Qty", "Days Left", ""].map((h) => (
                    <th key={h || "view"} className="pb-2 pr-2">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {EXPIRY.map((row) => (
                  <tr key={row[0]}>
                    <td className="py-2 pr-2 text-[11px] font-extrabold text-[#0f2744]">{row[0]}</td>
                    <td className="py-2 pr-2 text-[12px] font-extrabold text-[#0f2744]">{row[1]}</td>
                    <td className="py-2 pr-2 text-[11px] font-semibold text-stone-600">{row[2]}</td>
                    <td className="py-2 pr-2 text-[11px] font-semibold tabular-nums text-stone-700">{row[3]}</td>
                    <td className={`py-2 pr-2 text-[12px] font-extrabold tabular-nums ${daysTone(row[4])}`}>{row[4]}</td>
                    <td className="py-2">
                      <button type="button" onClick={() => navigate("/store/expiry")} className="text-[10px] font-extrabold text-[#3b74e8]">
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="space-y-3">
          <Card title="Quick Actions">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {QUICK.map((q) => {
                const Icon = q.icon;
                return (
                  <button
                    key={q.label}
                    type="button"
                    onClick={() => navigate(q.to)}
                    className="flex flex-col items-center gap-1.5 rounded-xl border border-stone-200 bg-[#f4f7f8] px-2 py-3 text-center hover:border-[#3b74e8]/40 hover:bg-white"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-[#3b74e8] shadow-sm">
                      <Icon size={15} />
                    </span>
                    <span className="text-[10px] font-extrabold leading-tight text-[#0f2744]">{q.label}</span>
                  </button>
                );
              })}
            </div>
          </Card>
          <Card title="Important Notes">
            <ul className="space-y-1.5 text-[12px] font-semibold text-stone-600">
              {NOTES.map((n) => (
                <li key={n} className="flex gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#3b74e8]" />
                  {n}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[10px] font-bold text-stone-400">
              {user?.username || "Operator"} · {periodLabel}
            </p>
          </Card>
        </div>
      </div>

      <p className="mt-4 flex items-center gap-1.5 pb-2 text-[10px] font-bold text-stone-400">
        <Warehouse size={12} />
        {user?.organizationName || "Digital Distillery"} · Store overview
      </p>
    </div>
  );
}
