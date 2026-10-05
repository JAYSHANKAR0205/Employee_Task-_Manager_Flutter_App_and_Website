import React from "react";
import SearchInput from "./SearchInput";
import FilterPanel from "../../../components/ui/FilterPanel";
import MultiSelectDropdown from "../../../components/ui/MultiSelectDropdown";
import ActiveFilterChips from "../../../components/ui/ActiveFilterChips";
import { FilterState, FilterGroupConfig, INITIAL_FILTER_STATE } from "../../../types/filter";

export const TASK_FILTER_GROUPS: FilterGroupConfig[] = [
  {
    id: 'status',
    label: 'Task Status',
    options: [
      { label: 'Pending', value: 'Pending' },
      { label: 'In Progress', value: 'In Progress' },
      { label: 'Completed', value: 'Completed' },
    ],
  },
  {
    id: 'priority',
    label: 'Priority Level',
    options: [
      { label: 'Low', value: 'Low' },
      { label: 'Medium', value: 'Medium' },
      { label: 'High', value: 'High' },
    ],
  },
];

const STATUS_OPTIONS = [
  { label: 'Pending', value: 'Pending' },
  { label: 'In Progress', value: 'In Progress' },
  { label: 'Completed', value: 'Completed' },
];

const PRIORITY_OPTIONS = [
  { label: 'Low', value: 'Low' },
  { label: 'Medium', value: 'Medium' },
  { label: 'High', value: 'High' },
];

interface TaskFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  statusFilter?: string;
  onStatusChange?: (value: string) => void;
  priorityFilter?: string;
  onPriorityChange?: (value: string) => void;
  onReset: () => void;
  filterState: FilterState;
  onFilterStateChange: (newState: FilterState) => void;
}

const TaskFilters: React.FC<TaskFiltersProps> = ({
  searchQuery,
  onSearchChange,
  statusFilter: _statusFilter,
  onStatusChange: _onStatusChange,
  priorityFilter: _priorityFilter,
  onPriorityChange: _onPriorityChange,
  onReset,
  filterState,
  onFilterStateChange,
}) => {
  return (
    <div className="mb-6 space-y-3">
      {/* Primary Toolbar Bar */}
      <div className="flex flex-col gap-4 rounded-xl bg-white p-4 shadow-sm dark:bg-slate-900 dark:border dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput
          value={searchQuery}
          onChange={onSearchChange}
          placeholder="Search task ID, title, description, or assignee..."
        />
        
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Status Dedicated Filter Button */}
          <MultiSelectDropdown
            label="Status"
            options={STATUS_OPTIONS}
            selectedValues={filterState.multiSelects['status'] || []}
            onChange={(newSelected) => {
              onFilterStateChange({
                ...filterState,
                multiSelects: {
                  ...filterState.multiSelects,
                  status: newSelected,
                },
              });
            }}
          />

          {/* Priority Dedicated Filter Button */}
          <MultiSelectDropdown
            label="Priority"
            options={PRIORITY_OPTIONS}
            selectedValues={filterState.multiSelects['priority'] || []}
            onChange={(newSelected) => {
              onFilterStateChange({
                ...filterState,
                multiSelects: {
                  ...filterState.multiSelects,
                  priority: newSelected,
                },
              });
            }}
          />

          {/* Custom Filter Panel (Date & Sorting) */}
          <FilterPanel
            filterState={filterState}
            onApplyFilters={(newState) => onFilterStateChange(newState)}
            onClearFilters={() => onFilterStateChange(INITIAL_FILTER_STATE)}
            filterGroups={[]}
            dateFieldLabel="Due / Creation Date"
          />
        </div>
      </div>

      {/* Active Filter Chips Bar */}
      <ActiveFilterChips
        filterState={filterState}
        groups={TASK_FILTER_GROUPS}
        onRemoveMultiSelect={(groupId, val) => {
          onFilterStateChange({
            ...filterState,
            multiSelects: {
              ...filterState.multiSelects,
              [groupId]: (filterState.multiSelects[groupId] || []).filter((v) => v !== val),
            },
          });
        }}
        onRemoveDateFilter={() => onFilterStateChange({ ...filterState, datePreset: 'all', fromDate: '', toDate: '' })}
        onRemoveAlphabeticalSort={() => onFilterStateChange({ ...filterState, sortAlphabetical: 'none' })}
        onRemoveDateSort={() => onFilterStateChange({ ...filterState, sortDate: 'none' })}
        onClearAll={() => {
          onReset();
          onFilterStateChange(INITIAL_FILTER_STATE);
        }}
      />
    </div>
  );
};

export default TaskFilters;
