interface SelectFilterProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  label?: string;
}

const SelectFilter = ({ value, onChange, options, label }: SelectFilterProps) => {
  return (
    <div className="flex w-full items-center gap-2 sm:w-auto">
      {label && <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{label}:</span>}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-gray-700 dark:bg-slate-900 dark:text-white dark:focus:ring-blue-900/30 sm:w-auto"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
};

export default SelectFilter;
