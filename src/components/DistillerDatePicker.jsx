import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

function parseIso(iso) {
  const m = String(iso || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

function toIso(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function sameDay(a, b) {
  return a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function formatPretty(iso) {
  const d = parseIso(iso);
  if (!d) return "";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function monthGrid(view) {
  const first = new Date(view.getFullYear(), view.getMonth(), 1);
  const startOffset = (first.getDay() + 6) % 7;
  const start = new Date(first);
  start.setDate(1 - startOffset);
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

export default function DistillerDatePicker({
  value,
  onChange,
  compact = false,
  placeholder = "Select date",
  className = "",
}) {
  const btnRef = useRef(null);
  const menuRef = useRef(null);
  const [open, setOpen] = useState(false);
  const selected = parseIso(value);
  const [view, setView] = useState(selected || new Date());

  useEffect(() => {
    if (open) setView(selected || new Date());
  }, [open, value]);

  const updatePos = useCallback(() => {
    if (!btnRef.current || !menuRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const menu = menuRef.current.getBoundingClientRect();
    const gap = 8;
    let left = rect.left;
    if (left + 292 > window.innerWidth - 12) left = Math.max(12, window.innerWidth - 304);
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < 340 && rect.top > spaceBelow;
    const top = openUp ? Math.max(12, rect.top - menu.height - gap) : rect.bottom + gap;
    menuRef.current.style.top = `${top}px`;
    menuRef.current.style.left = `${left}px`;
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    updatePos();
    window.addEventListener("resize", updatePos);
    window.addEventListener("scroll", updatePos, true);
    return () => {
      window.removeEventListener("resize", updatePos);
      window.removeEventListener("scroll", updatePos, true);
    };
  }, [open, view, updatePos]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      const t = e.target;
      if (btnRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const days = useMemo(() => monthGrid(view), [view]);
  const today = new Date();
  const title = view.toLocaleDateString("en-GB", { month: "long", year: "numeric" });

  const menu = open
    ? createPortal(
        <div
          ref={menuRef}
          style={{ position: "fixed", zIndex: 80, width: 292 }}
          className="rounded-2xl border border-sky-100 bg-white p-3 shadow-[0_18px_50px_rgba(15,39,68,0.18)]"
        >
          <div className="mb-2 flex items-center justify-between px-1">
            <button
              type="button"
              onClick={() => setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))}
              className="flex h-8 w-8 items-center justify-center rounded-xl text-[#2563eb] hover:bg-sky-50"
              aria-label="Previous month"
            >
              <ChevronLeft size={16} />
            </button>
            <p className="text-sm font-extrabold text-[#0f2744]">{title}</p>
            <button
              type="button"
              onClick={() => setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))}
              className="flex h-8 w-8 items-center justify-center rounded-xl text-[#2563eb] hover:bg-sky-50"
              aria-label="Next month"
            >
              <ChevronRight size={16} />
            </button>
          </div>
          <div className="mb-1 grid grid-cols-7">
            {WEEKDAYS.map((d) => (
              <div key={d} className="py-1 text-center text-[10px] font-extrabold uppercase tracking-wide text-stone-400">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-0.5">
            {days.map((d) => {
              const inMonth = d.getMonth() === view.getMonth();
              const isSel = sameDay(d, selected);
              const isToday = sameDay(d, today);
              return (
                <button
                  key={toIso(d)}
                  type="button"
                  onClick={() => {
                    onChange(toIso(d));
                    setOpen(false);
                  }}
                  className={`h-9 rounded-xl text-[12px] font-bold transition-colors ${
                    isSel
                      ? "bg-[#2563eb] text-white shadow-sm"
                      : isToday
                        ? "ring-1 ring-[#2563eb] text-[#2563eb] hover:bg-sky-50"
                        : inMonth
                          ? "text-stone-700 hover:bg-sky-50"
                          : "text-stone-300 hover:bg-stone-50"
                  }`}
                >
                  {d.getDate()}
                </button>
              );
            })}
          </div>
          <div className="mt-2 flex items-center justify-between border-t border-sky-50 pt-2">
            <button
              type="button"
              onClick={() => {
                onChange(toIso(new Date()));
                setOpen(false);
              }}
              className="rounded-lg px-2 py-1 text-[11px] font-extrabold uppercase tracking-wide text-[#2563eb] hover:bg-sky-50"
            >
              Today
            </button>
            <p className="text-[11px] font-semibold text-stone-400">{formatPretty(value) || placeholder}</p>
          </div>
        </div>,
        document.body
      )
    : null;

  return (
    <div className={`min-w-0 ${className}`}>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`group flex w-full items-center gap-2 rounded-xl border bg-white text-left outline-none transition-all ${
          compact ? "h-8 px-1.5" : "h-10 px-3"
        } ${
          open
            ? "border-[#2563eb] ring-2 ring-[#2563eb]/15"
            : "border-sky-200/80 hover:border-[#2563eb]/40"
        }`}
      >
        <span
          className={`flex shrink-0 items-center justify-center rounded-lg ${
            compact ? "h-5 w-5" : "h-6 w-6"
          } ${open ? "bg-[#2563eb] text-white" : "bg-sky-50 text-[#2563eb]"}`}
        >
          <CalendarDays size={compact ? 12 : 14} />
        </span>
        <span
          className={`min-w-0 flex-1 truncate font-bold ${compact ? "text-[11px]" : "text-sm"} ${
            value ? "text-[#0f2744]" : "text-stone-400"
          }`}
        >
          {formatPretty(value) || placeholder}
        </span>
      </button>
      {menu}
    </div>
  );
}
