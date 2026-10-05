import React, { useState, useRef, useEffect } from 'react';
import { Filter, X, Check, Calendar, ArrowUpDown, SlidersHorizontal, SortAsc } from 'lucide-react';
import { FilterState, DatePreset, AlphabeticalSort, DateSort, FilterGroupConfig } from '../../types/filter';
import { countCustomActiveFilters } from '../../utils/filterUtils';

interface FilterPanelProps {
  filterState: FilterState;
  onApplyFilters: (newState: FilterState) => void;
  onClearFilters: () => void;
  filterGroups?: FilterGroupConfig[];
  dateFieldLabel?: string;
}

const DATE_PRESETS: { label: string; value: DatePreset }[] = [
  { label: 'All Time', value: 'all' },
  { label: 'Today', value: 'today' },
  { label: 'Yesterday', value: 'yesterday' },
  { label: 'Last 7 Days', value: 'last7days' },
  { label: 'Last 30 Days', value: 'last30days' },
  { label: 'This Month', value: 'thisMonth' },
  { label: 'Last Month', value: 'lastMonth' },
  { label: 'This Year', value: 'thisYear' },
  { label: 'Custom Range', value: 'custom' },
];

const ALPHABETICAL_SORT_OPTIONS: { label: string; value: AlphabeticalSort }[] = [
  { label: 'None (Default)', value: 'none' },
  { label: 'A → Z (Alphabetical)', value: 'a-z' },
  { label: 'Z → A (Alphabetical)', value: 'z-a' },
];

const DATE_SORT_OPTIONS: { label: string; value: DateSort }[] = [
  { label: 'None (Default)', value: 'none' },
  { label: 'Newest First', value: 'newest' },
  { label: 'Oldest First', value: 'oldest' },
];

export const FilterPanel: React.FC<FilterPanelProps> = ({
  filterState,
  onApplyFilters,
  onClearFilters,
  filterGroups = [],
  dateFieldLabel = 'Date Filter',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [draftState, setDraftState] = useState<FilterState>(filterState);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDraftState(filterState);
  }, [filterState]);

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

  const activeCount = countCustomActiveFilters(filterState);

  const handleToggleMultiSelect = (groupId: string, val: string) => {
    setDraftState((prev) => {
      const currentArr = prev.multiSelects[groupId] || [];
      const updated = currentArr.includes(val)
        ? currentArr.filter((v) => v !== val)
        : [...currentArr, val];
      return {
        ...prev,
        multiSelects: {
          ...prev.multiSelects,
          [groupId]: updated,
        },
      };
    });
  };

  const handleApply = () => {
    onApplyFilters(draftState);
    setIsOpen(false);
  };

  const handleClear = () => {
    onClearFilters();
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Main Filter Button Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-bold transition-all duration-200 cursor-pointer shadow-xs ${
          activeCount > 0
            ? 'border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-slate-800 text-gray-900 dark:text-white'
            : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-slate-900 text-gray-700 dark:text-gray-200 hover:border-gray-300 dark:hover:border-gray-700'
        }`}
      >
        <SlidersHorizontal size={15} />
        <span>Custom</span>
        {activeCount > 0 && (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-900 dark:bg-slate-100 text-[10px] font-bold text-white dark:text-gray-900 shadow-xs ml-0.5">
            {activeCount}
          </span>
        )}
      </button>

      {/* Popover Filter Modal / Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 sm:w-96 rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-gray-200 dark:border-gray-800 p-5 z-50 transform origin-top-right transition-all animate-in fade-in zoom-in-95">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3 mb-4">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Filter size={16} className="text-[#ea4c89]" />
              Filter & Sort Data
            </h3>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg p-1 transition cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          <div className="space-y-5 max-h-[70vh] overflow-y-auto custom-scrollbar pr-1">
            {/* Section 1: Date Presets */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                <Calendar size={13} className="text-[#ea4c89]" />
                {dateFieldLabel}
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {DATE_PRESETS.map((preset) => {
                  const isSelected = draftState.datePreset === preset.value;
                  return (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() =>
                        setDraftState((prev) => ({ ...prev, datePreset: preset.value }))
                      }
                      className={`px-2.5 py-1.5 text-xs font-medium rounded-lg transition-all text-center border cursor-pointer ${
                        isSelected
                          ? 'bg-gradient-to-r from-[#ea4c89] to-[#a855f7] text-white border-transparent shadow-xs font-bold'
                          : 'bg-gray-50 dark:bg-slate-800/60 border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>

              {/* Custom Date Range Pickers */}
              {draftState.datePreset === 'custom' && (
                <div className="grid grid-cols-2 gap-2 pt-2 animate-in fade-in">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 mb-1">
                      From Date
                    </label>
                    <input
                      type="date"
                      value={draftState.fromDate}
                      onChange={(e) =>
                        setDraftState((prev) => ({ ...prev, fromDate: e.target.value }))
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-slate-800 text-xs text-gray-900 dark:text-white outline-none focus:border-[#ea4c89]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 mb-1">
                      To Date
                    </label>
                    <input
                      type="date"
                      value={draftState.toDate}
                      onChange={(e) =>
                        setDraftState((prev) => ({ ...prev, toDate: e.target.value }))
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-slate-800 text-xs text-gray-900 dark:text-white outline-none focus:border-[#ea4c89]"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Section 2: Alphabetical Sorting */}
            <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-gray-800">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                <SortAsc size={13} className="text-[#ea4c89]" />
                Alphabetical Sorting
              </label>
              <select
                value={draftState.sortAlphabetical || 'none'}
                onChange={(e) =>
                  setDraftState((prev) => ({
                    ...prev,
                    sortAlphabetical: e.target.value as AlphabeticalSort,
                  }))
                }
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-slate-800 text-xs font-semibold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-[#ea4c89]/20 cursor-pointer"
              >
                {ALPHABETICAL_SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Section 3: Date Created Sorting */}
            <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-gray-800">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                <ArrowUpDown size={13} className="text-[#ea4c89]" />
                Date Created Sorting
              </label>
              <select
                value={draftState.sortDate || 'none'}
                onChange={(e) =>
                  setDraftState((prev) => ({
                    ...prev,
                    sortDate: e.target.value as DateSort,
                  }))
                }
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-slate-800 text-xs font-semibold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-[#ea4c89]/20 cursor-pointer"
              >
                {DATE_SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Section 4: Dynamic Multi-Select Checkboxes */}
            {filterGroups.map((group) => {
              const selectedValues = draftState.multiSelects[group.id] || [];
              return (
                <div
                  key={group.id}
                  className="space-y-2 pt-2 border-t border-gray-100 dark:border-gray-800"
                >
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 block">
                    {group.label}
                  </label>
                  <div className="space-y-1.5">
                    {group.options.map((opt) => {
                      const isChecked = selectedValues.includes(opt.value);
                      return (
                        <label
                          key={opt.value}
                          onClick={() => handleToggleMultiSelect(group.id, opt.value)}
                          className="flex items-center gap-2.5 text-xs text-gray-700 dark:text-gray-300 font-medium cursor-pointer hover:text-gray-900 dark:hover:text-white select-none p-1 rounded-md transition"
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
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer Actions */}
          <div className="border-t border-gray-100 dark:border-gray-800 pt-4 mt-4 flex items-center gap-2">
            <button
              type="button"
              onClick={handleClear}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 text-xs font-bold hover:bg-gray-50 dark:hover:bg-slate-800 transition cursor-pointer text-center"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#ea4c89] to-[#a855f7] text-white text-xs font-bold shadow-md hover:opacity-95 transition cursor-pointer text-center"
            >
              Apply Filters
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FilterPanel;
