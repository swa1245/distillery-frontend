import { useMemo, useState } from "react";

const SAMPLE = [
  { line: "Spirit production", actual: 12480, target: 13000 },
  { line: "ENA / RS", actual: 8420, target: 8500 },
  { line: "Spent wash", actual: 186, target: 200 },
];

function efficiency(actual, target) {
  if (!target) return 0;
  return Math.round((actual / target) * 1000) / 10;
}

export default function ProductionPage() {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);

  const rows = useMemo(
    () =>
      SAMPLE.map((row) => ({
        ...row,
        efficiency: efficiency(row.actual, row.target),
      })),
    []
  );

  return (
    <div className="p-6 sm:p-8 max-w-5xl">
      <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#2563eb]">
        Distillery operations
      </p>
      <h1 className="mt-1 text-2xl sm:text-3xl font-black tracking-tight text-[#0f2744]">Production</h1>
      <p className="mt-2 text-sm font-medium text-stone-500">
        Daily actual, target, and efficiency for the selected date.
      </p>

      <label className="mt-6 inline-flex flex-col gap-1.5">
        <span className="text-[11px] font-bold text-stone-500">Date</span>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm font-semibold text-stone-800 outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/15"
        />
      </label>

      <div className="mt-5 overflow-hidden rounded-2xl border border-sky-200/80 bg-white">
        <table className="w-full text-left border-collapse">
          <thead className="bg-[#eef3f9] text-[10px] font-extrabold uppercase tracking-wider text-stone-500">
            <tr>
              <th className="px-4 py-3">Line</th>
              <th className="px-4 py-3 text-right">Actual</th>
              <th className="px-4 py-3 text-right">Target</th>
              <th className="px-4 py-3 text-right">Efficiency</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sky-100 text-sm">
            {rows.map((row) => (
              <tr key={row.line}>
                <td className="px-4 py-3 font-bold text-[#0f2744]">{row.line}</td>
                <td className="px-4 py-3 text-right tabular-nums font-extrabold text-stone-800">
                  {row.actual.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-right tabular-nums font-semibold text-stone-500">
                  {row.target.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-right tabular-nums font-black text-[#2563eb]">
                  {row.efficiency}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
