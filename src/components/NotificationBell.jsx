import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";

const DEFAULT_NOTIFS = [
  { id: "n1", title: "Low fermentation efficiency", detail: "F-105 at 89.4% vs 94% target", time: "10:18 AM", level: "high" },
  { id: "n2", title: "Steam ratio above target", detail: "6.71 MT/KL vs 6.40 target", time: "09:42 AM", level: "warn" },
  { id: "n3", title: "Sample pending QC review", detail: "HPLC batch FB-01 awaiting sign-off", time: "09:05 AM", level: "info" },
];

const LEVEL_DOT = {
  high: "bg-rose-500",
  warn: "bg-amber-500",
  info: "bg-sky-500",
};

/**
 * Shared notification bell for distiller overview headers.
 */
export default function NotificationBell({ items = DEFAULT_NOTIFS, className = "" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const count = items.length;

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (!ref.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div className={`relative ${className}`} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-stone-200 bg-white text-stone-600 hover:bg-stone-50"
        aria-label="Notifications"
        aria-expanded={open}
      >
        <Bell size={15} strokeWidth={2.2} />
        {count > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-black text-white">
            {count}
          </span>
        ) : null}
      </button>
      {open ? (
        <div className="absolute right-0 z-30 mt-2 w-80 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.14)]">
          <p className="border-b border-stone-100 px-3 py-2 text-[11px] font-extrabold uppercase tracking-wider text-stone-400">
            Notifications
          </p>
          {count === 0 ? (
            <p className="px-3 py-6 text-center text-xs font-semibold text-stone-400">No new notifications</p>
          ) : (
            <ul className="max-h-72 divide-y divide-stone-50 overflow-y-auto">
              {items.map((n) => (
                <li key={n.id || n.title} className="flex gap-2.5 px-3 py-2.5">
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${LEVEL_DOT[n.level] || LEVEL_DOT.info}`} />
                  <div className="min-w-0">
                    <p className="text-[12px] font-extrabold text-[#0f2744]">{n.title}</p>
                    {n.detail ? <p className="mt-0.5 text-[11px] font-medium text-stone-500">{n.detail}</p> : null}
                    {n.time ? <p className="mt-1 text-[10px] font-bold text-stone-400">{n.time}</p> : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
