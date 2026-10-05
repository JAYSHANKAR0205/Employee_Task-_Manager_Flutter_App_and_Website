import { Search } from "lucide-react";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const SearchInput = ({ value, onChange, placeholder = "Search..." }: SearchInputProps) => {
  return (
    <div className="relative w-full sm:max-w-xs">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
        <Search size={16} />
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-gray-700 dark:bg-slate-900 dark:text-white dark:focus:ring-blue-900/30"
      />
    </div>
  );
};

export default SearchInput;
