import React from 'react';
import { X, RotateCcw } from 'lucide-react';
import { FilterState, FilterGroupConfig } from '../../types/filter';

interface ActiveFilterChipsProps {
  filterState: FilterState;
  groups?: FilterGroupConfig[];
  onRemoveMultiSelect: (groupId: string, value: string) => void;
  onRemoveDateFilter: () => void;
  onRemoveAlphabeticalSort: () => void;
  onRemoveDateSort: () => void;
  onClearAll: () => void;
}

const DATE_PRESET_LABELS: Record<string, string> = {
  today: 'Today',
  yesterday: 'Yesterday',
  last7days: 'Last 7 Days',
  last30days: 'Last 30 Days',
  thisMonth: 'This Month',
  lastMonth: 'Last Month',
  thisYear: 'This Year',
  custom: 'Custom Date Range',
};

const ALPHABETICAL_SORT_LABELS: Record<string, string> = {
  'a-z': 'Alphabetical (A → Z)',
  'z-a': 'Alphabetical (Z → A)',
};

const DATE_SORT_LABELS: Record<string, string> = {
  newest: 'Newest First',
  oldest: 'Oldest First',
};

export const ActiveFilterChips: React.FC<ActiveFilterChipsProps> = ({
  filterState,
  groups = [],
  onRemoveMultiSelect,
  onRemoveDateFilter,
  onRemoveAlphabeticalSort,
  onRemoveDateSort,
  onClearAll,
}) => {
  const hasDateFilter = filterState.datePreset !== 'all';
  const hasAlphaSort = filterState.sortAlphabetical && filterState.sortAlphabetical !== 'none';
  const hasDateSort = filterState.sortDate && filterState.sortDate !== 'none';
  
  const totalMultiSelects = Object.values(filterState.multiSelects).reduce(
    (acc, arr) => acc + arr.length,
    0
  );

  if (!hasDateFilter && !hasAlphaSort && !hasDateSort && totalMultiSelects === 0) {
    return null;
  }

  const getGroupLabel = (groupId: string) => {
    const group = groups.find((g) => g.id === groupId);
    if (group) return group.label;
    if (groupId === 'status') return 'Status';
    if (groupId === 'priority') return 'Priority';
    if (groupId === 'role') return 'Role';
    return groupId;
  };

  return (
    <div className="flex flex-wrap items-center gap-2 py-2 px-1 text-xs font-semibold animate-in fade-in">
      <span className="text-gray-400 dark:text-gray-500 uppercase tracking-wider font-bold mr-1">
        Active Filters:
      </span>

      {/* Date Filter Badge */}
      {hasDateFilter && (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700/80 font-semibold shadow-xs">
          Date: {DATE_PRESET_LABELS[filterState.datePreset] || filterState.datePreset}
          {filterState.datePreset === 'custom' && filterState.fromDate && (
            <span> ({filterState.fromDate} to {filterState.toDate || 'Now'})</span>
          )}
          <button
            type="button"
            onClick={onRemoveDateFilter}
            className="hover:text-red-500 transition cursor-pointer"
            aria-label="Remove date filter"
          >
            <X size={13} />
          </button>
        </span>
      )}

      {/* Alphabetical Sort Badge */}
      {hasAlphaSort && (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700/80 font-semibold shadow-xs">
          Sort: {ALPHABETICAL_SORT_LABELS[filterState.sortAlphabetical] || filterState.sortAlphabetical}
          <button
            type="button"
            onClick={onRemoveAlphabeticalSort}
            className="hover:text-red-500 transition cursor-pointer"
            aria-label="Remove alphabetical sort"
          >
            <X size={13} />
          </button>
        </span>
      )}

      {/* Date Sort Badge */}
      {hasDateSort && (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700/80 font-semibold shadow-xs">
          Date Sort: {DATE_SORT_LABELS[filterState.sortDate] || filterState.sortDate}
          <button
            type="button"
            onClick={onRemoveDateSort}
            className="hover:text-red-500 transition cursor-pointer"
            aria-label="Remove date sort"
          >
            <X size={13} />
          </button>
        </span>
      )}

      {/* Multi-Select Badges */}
      {Object.entries(filterState.multiSelects).map(([groupId, values]) =>
        values.map((val) => (
          <span
            key={`${groupId}-${val}`}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700/80 font-semibold shadow-xs"
          >
            {getGroupLabel(groupId)}: {val}
            <button
              type="button"
              onClick={() => onRemoveMultiSelect(groupId, val)}
              className="hover:text-red-500 transition cursor-pointer"
              aria-label={`Remove ${val} filter`}
            >
              <X size={13} />
            </button>
          </span>
        ))
      )}

      {/* Clear All Button */}
      <button
        type="button"
        onClick={onClearAll}
        className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition cursor-pointer font-bold ml-1 border border-red-200/60 dark:border-red-900/40"
      >
        <RotateCcw size={12} />
        Clear All
      </button>
    </div>
  );
};

export default ActiveFilterChips;
