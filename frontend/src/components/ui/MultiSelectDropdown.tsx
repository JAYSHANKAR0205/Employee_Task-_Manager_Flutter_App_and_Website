import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface MultiSelectOption {
  label: string;
  value: string;
}

interface MultiSelectDropdownProps {
  label: string;
  options: MultiSelectOption[];
  selectedValues: string[];
  onChange: (newSelected: string[]) => void;
}

export const MultiSelectDropdown: React.FC<MultiSelectDropdownProps> = ({
  label,
  options,
  selectedValues = [],
  onChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const toggleOption = (val: string) => {
    if (selectedValues.includes(val)) {
      onChange(selectedValues.filter((v) => v !== val));
    } else {
      onChange([...selectedValues, val]);
    }
  };

  const activeCount = selectedValues.length;

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-bold transition-all duration-200 cursor-pointer shadow-xs ${
          activeCount > 0
            ? 'border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-slate-800 text-gray-900 dark:text-white'
            : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-slate-900 text-gray-700 dark:text-gray-200 hover:border-gray-300 dark:hover:border-gray-700'
        }`}
      >
        <span>{label}</span>
        {activeCount > 0 && (
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-gray-900 dark:bg-slate-100 text-[9px] font-bold text-white dark:text-gray-900 shadow-xs">
            {activeCount}
          </span>
        )}
        <ChevronDown size={14} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 sm:left-0 mt-2 w-48 rounded-2xl bg-white dark:bg-slate-900 shadow-xl border border-gray-200 dark:border-gray-800 p-2.5 z-50 animate-in fade-in zoom-in-95">
          <div className="px-2 py-1 mb-1 border-b border-gray-100 dark:border-gray-800">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
              Filter by {label}
            </span>
          </div>

          <div className="space-y-1">
            {options.map((opt) => {
              const isChecked = selectedValues.includes(opt.value);
              return (
                <div
                  key={opt.value}
                  onClick={() => toggleOption(opt.value)}
                  className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 cursor-pointer select-none transition"
                >
                  <div
                    className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                      isChecked
                        ? 'bg-gradient-to-r from-[#ea4c89] to-[#a855f7] border-transparent text-white'
                        : 'border-gray-300 dark:border-gray-700 bg-white dark:bg-slate-800'
                    }`}
                  >
                    {isChecked && <Check size={11} strokeWidth={3} />}
                  </div>
                  <span>{opt.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default MultiSelectDropdown;
