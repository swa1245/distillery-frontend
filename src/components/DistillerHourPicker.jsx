import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Timer } from "lucide-react";

const HOURS = Array.from({ length: 97 }, (_, i) => i);

export default function DistillerHourPicker({
  value,
  onChange,
  compact = false,
  placeholder = "Hours",
  className = "",
}) {
  const btnRef = useRef(null);
  const menuRef = useRef(null);
  const [open, setOpen] = useState(false);
  const selected = String(value ?? "").trim() === "" ? null : Number(value);
  const hour = Number.isFinite(selected) ? selected : 0;

  const updatePos = useCallback(() => {
    if (!btnRef.current || !menuRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const menuH = menuRef.current.offsetHeight || 240;
    const width = 160;
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

  const pick = (h) => {
    onChange(String(h));
    setOpen(false);
  };

  const label = Number.isFinite(selected) ? `${selected} h` : "";

  const menu = open
    ? createPortal(
        <div
          ref={menuRef}
          style={{ position: "fixed", zIndex: 80 }}
          className="rounded-2xl border border-sky-100 bg-white p-2 shadow-[0_18px_50px_rgba(15,39,68,0.18)]"
        >
          <p className="mb-1 px-2 text-[10px] font-extrabold uppercase tracking-wider text-stone-400">Time [h]</p>
          <ul className="max-h-[220px] overflow-y-auto overscroll-contain py-1 custom-scrollbar-soft">
            {HOURS.map((h) => {
              const active = h === hour && Number.isFinite(selected);
              return (
                <li key={h}>
                  <button
                    type="button"
                    onClick={() => pick(h)}
                    className={`flex w-full items-center justify-center rounded-xl py-1.5 text-sm font-extrabold tabular-nums ${
                      active ? "bg-[#2563eb] text-white shadow-sm" : "text-stone-600 hover:bg-sky-50"
                    }`}
                  >
                    {h} h
                  </button>
                </li>
              );
            })}
          </ul>
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
          <Timer size={compact ? 12 : 14} />
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
