import { ArrowRight } from "lucide-react";

export const PORTAL_GRID_CLASS =
  "grid w-full grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5 items-stretch";

export default function PortalModuleCard({
  title,
  description,
  meta,
  icon: Icon,
  actionLabel,
  onClick,
}) {
  const ctaLabel = actionLabel ?? "Open module";

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
      className="group flex flex-col w-full min-w-0 min-h-[168px] text-left bg-white rounded-2xl border border-sky-200/80 p-5 shadow-[0_2px_8px_rgba(15,39,68,0.06)] transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563eb]/25 hover:border-[#2563eb]/40 hover:shadow-[0_6px_16px_rgba(37,99,235,0.12)] cursor-pointer"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#2563eb]/[0.08] text-[#2563eb] border border-[#2563eb]/15 flex items-center justify-center shrink-0">
          {Icon ? <Icon className="w-[18px] h-[18px]" strokeWidth={2.25} /> : null}
        </div>
        {meta ? (
          <span className="text-[10px] font-bold uppercase tracking-wide text-stone-400 bg-[#eef3f9] border border-sky-100 px-2 py-0.5 rounded-md shrink-0">
            {meta}
          </span>
        ) : null}
      </div>

      <h2 className="mt-4 text-[15px] font-extrabold text-[#0f2744] tracking-tight leading-snug group-hover:text-[#2563eb] transition-colors">
        {title}
      </h2>

      {description ? (
        <p className="mt-1.5 text-xs font-medium text-stone-500 leading-relaxed flex-1 line-clamp-3">
          {description}
        </p>
      ) : (
        <div className="flex-1" />
      )}

      <div className="mt-4 pt-3 border-t border-sky-100 flex items-center justify-between">
        <span className="text-[11px] font-bold text-stone-400 group-hover:text-[#2563eb] transition-colors">
          {ctaLabel}
        </span>
        <span className="w-7 h-7 rounded-lg flex items-center justify-center bg-[#eef3f9] group-hover:bg-[#2563eb] text-stone-400 group-hover:text-white transition-colors">
          <ArrowRight className="w-3.5 h-3.5" strokeWidth={2.4} />
        </span>
      </div>
    </div>
  );
}
