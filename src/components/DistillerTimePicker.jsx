import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Clock } from "lucide-react";

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);
const PERIODS = ["AM", "PM"];

function parseTime(value) {
  const m = String(value || "").match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!m) return null;
  let hour = Number(m[1]);
  if (hour === 0) hour = 12;
  if (hour > 12) hour = ((hour - 1) % 12) + 1;
  return { hour, minute: Math.min(59, Number(m[2])), period: m[3].toUpperCase() };
}

function formatTime(hour, minute, period) {
  return `${hour}:${String(minute).padStart(2, "0")} ${period}`;
}

function nowParts() {
  const d = new Date();
  let hour = d.getHours();
  const period = hour >= 12 ? "PM" : "AM";
  hour = hour % 12 || 12;
  return { hour, minute: d.getMinutes(), period };
}

function Wheel({ items, value, onChange, format = (v) => v, compact }) {
  const listRef = useRef(null);
  const itemH = compact ? 32 : 36;

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const idx = items.findIndex((item) => item === value);
    if (idx < 0) return;
    el.scrollTo({ top: Math.max(0, idx * itemH - itemH), behavior: "auto" });
  }, [value, items, itemH]);

  return (
    <ul
      ref={listRef}
      className="max-h-[180px] overflow-y-auto overscroll-contain py-1 custom-scrollbar-soft"
    >
      {items.map((item) => {
        const active = item === value;
        return (
          <li key={String(item)}>
            <button
              type="button"
              onClick={() => onChange(item)}
              className={`flex w-full items-center justify-center rounded-xl font-extrabold tabular-nums transition-colors ${
                compact ? "h-8 text-[12px]" : "h-9 text-sm"
              } ${active ? "bg-[#2563eb] text-white shadow-sm" : "text-stone-600 hover:bg-sky-50"}`}
            >
              {format(item)}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export default function DistillerTimePicker({
  value,
  onChange,
  compact = false,
  placeholder = "Select time",
  className = "",
}) {
  const btnRef = useRef(null);
  const menuRef = useRef(null);
  const [open, setOpen] = useState(false);
  const parsed = parseTime(value);
  const [hour, setHour] = useState(parsed?.hour ?? 7);
  const [minute, setMinute] = useState(parsed?.minute ?? 0);
  const [period, setPeriod] = useState(parsed?.period ?? "AM");

  useEffect(() => {
    if (!open) return;
    const next = parseTime(value) || nowParts();
    setHour(next.hour);
    setMinute(next.minute);
    setPeriod(next.period);
  }, [open, value]);

  const commit = (h, m, p, close = false) => {
    onChange(formatTime(h, m, p));
    if (close) setOpen(false);
  };

  const updatePos = useCallback(() => {
    if (!btnRef.current || !menuRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const menuH = menuRef.current.offsetHeight || 280;
    const width = 268;
    const gap = 8;
    let left = rect.left;
    if (left + width > window.innerWidth - 12) left = Math.max(12, window.innerWidth - width - 12);
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < menuH + 12 && rect.top > spaceBelow;
    const top = openUp ? Math.max(12, rect.top - menuH - gap) : rect.bottom + gap;
    Object.assign(menuRef.current.style, {
      top: `${top}px`,
      left: `${left}px`,
      width: `${width}px`,
    });
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
  }, [open, updatePos]);

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

  const label = parseTime(value) ? value : "";

  const menu = open
    ? createPortal(
        <div
          ref={menuRef}
          style={{ position: "fixed", zIndex: 80 }}
          className="rounded-2xl border border-sky-100 bg-white p-3 shadow-[0_18px_50px_rgba(15,39,68,0.18)]"
        >
          <p className="mb-2 px-1 text-[10px] font-extrabold uppercase tracking-wider text-stone-400">
            Pick time
          </p>
          <div className="grid grid-cols-[1fr_1fr_72px] gap-1.5">
            <div>
              <p className="mb-1 text-center text-[9px] font-extrabold uppercase tracking-wide text-stone-400">
                Hour
              </p>
              <Wheel
                compact={compact}
                items={HOURS}
                value={hour}
                onChange={(h) => {
                  setHour(h);
                  commit(h, minute, period);
                }}
              />
            </div>
            <div>
              <p className="mb-1 text-center text-[9px] font-extrabold uppercase tracking-wide text-stone-400">
                Minute
              </p>
              <Wheel
                compact={compact}
                items={MINUTES}
                value={minute}
                format={(n) => String(n).padStart(2, "0")}
                onChange={(m) => {
                  setMinute(m);
                  commit(hour, m, period);
                }}
              />
            </div>
            <div>
              <p className="mb-1 text-center text-[9px] font-extrabold uppercase tracking-wide text-stone-400">
                AM/PM
              </p>
              <div className="flex flex-col gap-1.5 pt-1">
                {PERIODS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => {
                      setPeriod(p);
                      commit(hour, minute, p);
                    }}
                    className={`h-11 rounded-xl text-sm font-extrabold ${
                      period === p ? "bg-[#2563eb] text-white shadow-sm" : "bg-sky-50 text-[#2563eb] hover:bg-sky-100"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between border-t border-sky-50 pt-2">
            <button
              type="button"
              onClick={() => {
                const n = nowParts();
                setHour(n.hour);
                setMinute(n.minute);
                setPeriod(n.period);
                commit(n.hour, n.minute, n.period, true);
              }}
              className="rounded-lg px-2 py-1 text-[11px] font-extrabold uppercase tracking-wide text-[#2563eb] hover:bg-sky-50"
            >
              Now
            </button>
            <button
              type="button"
              onClick={() => commit(hour, minute, period, true)}
              className="rounded-lg bg-[#2563eb] px-3 py-1 text-[11px] font-extrabold uppercase tracking-wide text-white hover:bg-[#163056]"
            >
              Done
            </button>
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
          <Clock size={compact ? 12 : 14} />
        </span>
        <span
          className={`min-w-0 flex-1 truncate font-bold ${compact ? "text-[11px]" : "text-sm"} ${
            label ? "text-[#0f2744]" : "text-stone-400"
          }`}
        >
          {label || placeholder}
        </span>
      </button>
      {menu}
    </div>
  );
}
