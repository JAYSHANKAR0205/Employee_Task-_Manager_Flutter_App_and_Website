export type DatePreset = 
  | 'all'
  | 'today' 
  | 'yesterday' 
  | 'last7days' 
  | 'last30days' 
  | 'thisMonth' 
  | 'lastMonth' 
  | 'thisYear' 
  | 'custom';

export type AlphabeticalSort = 'none' | 'a-z' | 'z-a';
export type DateSort = 'none' | 'newest' | 'oldest';
export type SortOrder = 'newest' | 'oldest' | 'a-z' | 'z-a' | 'none';

export interface FilterOption {
  label: string;
  value: string;
}

export interface FilterGroupConfig {
  id: string;
  label: string;
  options: FilterOption[];
}

export interface FilterState {
  datePreset: DatePreset;
  fromDate: string;
  toDate: string;
  sortAlphabetical: AlphabeticalSort;
  sortDate: DateSort;
  sortOrder?: SortOrder;
  multiSelects: Record<string, string[]>;
}

export const INITIAL_FILTER_STATE: FilterState = {
  datePreset: 'all',
  fromDate: '',
  toDate: '',
  sortAlphabetical: 'none',
  sortDate: 'none',
  sortOrder: 'none',
  multiSelects: {},
};
