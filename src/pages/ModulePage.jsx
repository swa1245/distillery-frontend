import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function ModulePage({ title, hint, cards = [], backPath, backLabel }) {
  return (
    <div className="p-6 sm:p-8 max-w-5xl">
      {backPath ? (
        <Link
          to={backPath}
          className="mb-4 inline-flex items-center gap-1.5 text-xs font-bold text-[#2563eb] hover:underline"
        >
          <ArrowLeft size={14} strokeWidth={2.4} />
          {backLabel || "Back"}
        </Link>
      ) : null}
      <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#2563eb]">
        Distillery operations
      </p>
      <h1 className="mt-1 text-2xl sm:text-3xl font-black tracking-tight text-[#0f2744]">{title}</h1>
      {hint ? <p className="mt-2 text-sm font-medium text-stone-500">{hint}</p> : null}

      {cards.length > 0 ? (
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {cards.map((card) => (
            <div
              key={card}
              className="rounded-2xl border border-sky-200/80 bg-white px-4 py-4 shadow-[0_1px_3px_rgba(15,39,68,0.06)]"
            >
              <p className="text-sm font-extrabold text-[#0f2744]">{card}</p>
              <p className="mt-1 text-xs font-semibold text-stone-400">Section coming next</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-6 rounded-2xl border border-dashed border-sky-300 bg-white/70 px-5 py-10 text-center">
          <p className="text-sm font-bold text-stone-500">This module is ready for process records.</p>
        </div>
      )}
    </div>
  );
}
