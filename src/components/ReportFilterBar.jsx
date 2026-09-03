import DistillerDatePicker from "./DistillerDatePicker";
import DistillerSelect from "./DistillerSelect";
import { Plus, Search } from "lucide-react";

const labelClass = "mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-stone-500";
const searchClass =
  "h-10 w-full rounded-xl border border-sky-200/80 bg-white pl-9 pr-3 text-sm font-semibold text-stone-800 outline-none placeholder:text-stone-400 hover:border-[#2563eb]/40 focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/15";

function ButtonGroup({ options, value, onChange }) {
  return (
    <div className="flex min-h-10 flex-wrap items-stretch rounded-xl border border-sky-200/80 bg-white p-0.5 shadow-sm">
      {options.map((opt) => {
        const optValue = typeof opt === "object" ? opt.value : opt;
        const label = typeof opt === "object" ? opt.label : opt;
        const active = value === optValue;
        return (
          <button
            key={optValue}
            type="button"
            onClick={() => onChange(optValue)}
            className={`inline-flex min-h-9 items-center justify-center whitespace-nowrap rounded-[10px] px-3.5 text-sm font-bold leading-none transition-colors ${
              active ? "bg-[#2563eb] text-white shadow-sm" : "text-[#2563eb] hover:bg-sky-50"
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

export default function ReportFilterBar({
  date,
  onDateChange,
  savedDates = [],
  formatDate,
  typeLabel,
  typeValue,
  typeOptions = [],
  typeStyle = "select",
  onTypeChange,
  subTypeLabel,
  subTypeValue,
  subTypeOptions = [],
  onSubTypeChange,
  selectLabel,
  selectValue,
  selectOptions = [],
  onSelectChange,
  search,
  onSearchChange,
  searchPlaceholder,
  onAddRow,
  addLabel = "Add row",
}) {
  const savedOptions = [
    { value: "", label: savedDates.length ? "Open a saved date…" : "No saved reports yet" },
    ...savedDates.map((d) => ({ value: d, label: formatDate ? formatDate(d) : d })),
  ];
  const typeSelectOptions = [{ value: "", label: "All" }, ...typeOptions.map((opt) => ({ value: opt, label: opt }))];

  return (
    <div className="border-b border-sky-100 bg-[#eef3f9] px-5 py-3.5 sm:px-7">
      <div className="flex flex-wrap items-end gap-3">
        <label className="block min-w-[180px]">
          <span className={labelClass}>Date</span>
          <DistillerDatePicker value={date} onChange={onDateChange} />
        </label>

        <label className="block min-w-[200px] flex-1">
          <span className={labelClass}>Saved reports</span>
          <DistillerSelect
            value={savedDates.includes(date) ? date : ""}
            onChange={(v) => {
              if (v) onDateChange(v);
            }}
            options={savedOptions}
            placeholder="Open a saved date…"
          />
        </label>

        {typeLabel && typeOptions.length ? (
          typeStyle === "buttons" ? (
            <div className="block min-w-[220px]">
              <span className={labelClass}>{typeLabel}</span>
              <ButtonGroup options={typeOptions} value={typeValue} onChange={onTypeChange} />
            </div>
          ) : (
            <label className="block min-w-[160px]">
              <span className={labelClass}>{typeLabel}</span>
              <DistillerSelect
                value={typeValue}
                onChange={onTypeChange}
                options={typeSelectOptions}
                placeholder="All"
              />
            </label>
          )
        ) : null}

        {subTypeLabel && subTypeOptions.length ? (
          <div className="block min-w-[200px]">
            <span className={labelClass}>{subTypeLabel}</span>
            <ButtonGroup options={subTypeOptions} value={subTypeValue} onChange={onSubTypeChange} />
          </div>
        ) : null}

        {selectLabel && selectOptions.length ? (
          <label className="block min-w-[160px]">
            <span className={labelClass}>{selectLabel}</span>
            <DistillerSelect
              value={selectValue}
              onChange={onSelectChange}
              options={[{ value: "", label: "All" }, ...selectOptions.map((opt) => ({ value: opt, label: opt }))]}
              placeholder="All"
            />
          </label>
        ) : null}

        <label className="block min-w-[200px] flex-[2]">
          <span className={labelClass}>Search</span>
          <span className="relative block">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#2563eb]" />
            <input
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className={searchClass}
            />
          </span>
        </label>

        {onAddRow ? (
          <button
            type="button"
            onClick={onAddRow}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#2563eb] px-3.5 text-sm font-bold text-white shadow-[0_8px_16px_rgba(37,99,235,0.2)] hover:bg-[#163056]"
          >
            <Plus size={16} strokeWidth={2.4} />
            {addLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}
