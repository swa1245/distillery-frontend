export default function PortalPageHeader({ icon: Icon, title, subtitle, countLabel, actions }) {
  return (
    <header className="bg-white border border-sky-200/80 rounded-2xl px-5 py-4 sm:px-6 sm:py-5 shadow-[0_1px_3px_rgba(15,39,68,0.05)]">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-11 h-11 rounded-xl bg-[#2563eb] text-white flex items-center justify-center shrink-0 shadow-sm">
            {Icon ? <Icon className="w-5 h-5" strokeWidth={2.3} /> : null}
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-[#0f2744]">{title}</h1>
            {subtitle ? (
              <p className="text-xs sm:text-sm font-medium text-stone-500 mt-0.5">{subtitle}</p>
            ) : null}
          </div>
        </div>
        {(actions || countLabel) && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto shrink-0">
            {actions}
            {countLabel ? (
              <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-lg bg-[#eef3f9] border border-sky-200 text-[11px] font-bold text-stone-600">
                {countLabel}
              </span>
            ) : null}
          </div>
        )}
      </div>
    </header>
  );
}

export const PORTAL_PAGE_CLASS =
  "font-jakarta text-stone-800 pb-10 pt-4 sm:pt-6 px-4 sm:px-6 lg:px-8 max-w-[1600px] mx-auto w-full min-w-0 space-y-6";
