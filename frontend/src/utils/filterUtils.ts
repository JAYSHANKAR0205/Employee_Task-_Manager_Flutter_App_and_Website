import { FilterState } from '../types/filter';

export const isWithinDateRange = (dateStr: string | Date | undefined, filterState: FilterState): boolean => {
  if (!dateStr || filterState.datePreset === 'all') return true;

  const targetDate = new Date(dateStr);
  if (isNaN(targetDate.getTime())) return true;

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  switch (filterState.datePreset) {
    case 'today': {
      const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000 - 1);
      return targetDate >= startOfToday && targetDate <= endOfToday;
    }
    case 'yesterday': {
      const startOfYesterday = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000);
      const endOfYesterday = new Date(startOfToday.getTime() - 1);
      return targetDate >= startOfYesterday && targetDate <= endOfYesterday;
    }
    case 'last7days': {
      const sevenDaysAgo = new Date(startOfToday.getTime() - 7 * 24 * 60 * 60 * 1000);
      return targetDate >= sevenDaysAgo;
    }
    case 'last30days': {
      const thirtyDaysAgo = new Date(startOfToday.getTime() - 30 * 24 * 60 * 60 * 1000);
      return targetDate >= thirtyDaysAgo;
    }
    case 'thisMonth': {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      return targetDate >= startOfMonth;
    }
    case 'lastMonth': {
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      return targetDate >= startOfLastMonth && targetDate <= endOfLastMonth;
    }
    case 'thisYear': {
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      return targetDate >= startOfYear;
    }
    case 'custom': {
      let valid = true;
      if (filterState.fromDate) {
        const from = new Date(filterState.fromDate);
        if (!isNaN(from.getTime())) valid = valid && targetDate >= from;
      }
      if (filterState.toDate) {
        const to = new Date(filterState.toDate);
        if (!isNaN(to.getTime())) {
          to.setHours(23, 59, 59, 999);
          valid = valid && targetDate <= to;
        }
      }
      return valid;
    }
    default:
      return true;
  }
};

export const countCustomActiveFilters = (filterState: FilterState): number => {
  let count = 0;
  if (filterState.datePreset !== 'all') count += 1;
  if (filterState.sortAlphabetical && filterState.sortAlphabetical !== 'none') count += 1;
  if (filterState.sortDate && filterState.sortDate !== 'none') count += 1;
  return count;
};

export const countActiveFilters = (filterState: FilterState): number => {
  let count = countCustomActiveFilters(filterState);
  Object.values(filterState.multiSelects).forEach((selectedValues) => {
    count += selectedValues.length;
  });
  return count;
};
