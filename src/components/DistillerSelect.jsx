import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";

export default function DistillerSelect({
  value,
  onChange,
  options = [],
  placeholder = "Select",
  compact = false,
  className = "",
}) {
  const btnRef = useRef(null);
  const menuRef = useRef(null);
  const [open, setOpen] = useState(false);

  const items = options.map((opt) =>
    typeof opt === "object" ? opt : { value: opt, label: opt }
  );
  const selected = items.find((o) => o.value === value);

  const updatePos = useCallback(() => {
    if (!btnRef.current || !menuRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const width = Math.max(rect.width, compact ? 160 : 200);
    const menuH = menuRef.current.offsetHeight || 220;
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
  }, [compact]);

  useLayoutEffect(() => {
    if (!open) return;
    updatePos();
    window.addEventListener("resize", updatePos);
    window.addEventListener("scroll", updatePos, true);
    return () => {
      window.removeEventListener("resize", updatePos);
      window.removeEventListener("scroll", updatePos, true);
    };
  }, [open, updatePos, items.length]);

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

  const pick = (next) => {
    onChange(next);
    setOpen(false);
  };

  const menu = open
    ? createPortal(
        <div
          ref={menuRef}
          style={{ position: "fixed", zIndex: 80 }}
          className="overflow-hidden rounded-2xl border border-sky-100 bg-white shadow-[0_18px_50px_rgba(15,39,68,0.18)]"
        >
          <ul className="max-h-64 overflow-y-auto py-1.5 custom-scrollbar-soft">
            {items.map((item) => {
              const active = item.value === value;
              return (
                <li key={item.value || "empty"}>
                  <button
                    type="button"
                    onClick={() => pick(item.value)}
                    className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm font-semibold ${
                      active ? "bg-sky-50 text-[#2563eb]" : "text-stone-700 hover:bg-[#eef3f9]"
                    }`}
                  >
                    <span className="truncate">{item.label}</span>
                    {active ? <Check size={14} strokeWidth={2.6} /> : null}
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
          className={`min-w-0 flex-1 truncate font-bold ${compact ? "text-[11px]" : "text-sm"} ${
            selected ? "text-[#0f2744]" : "text-stone-400"
          }`}
        >
          {selected?.label || placeholder}
        </span>
        <ChevronDown
          size={compact ? 13 : 15}
          className={`shrink-0 text-[#2563eb] transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {menu}
    </div>
  );
}
