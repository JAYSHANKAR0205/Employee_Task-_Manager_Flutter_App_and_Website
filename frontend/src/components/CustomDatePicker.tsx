import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';

interface CustomDatePickerProps {
  value: string; // "22 Jan 2026"
  onChange: (dateStr: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  disabled?: boolean;
  hasError?: boolean;
  placement?: 'top' | 'bottom';
  disableFuture?: boolean;
  disablePast?: boolean;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const SHORT_MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const DAYS_OF_WEEK = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export const parseDateStr = (str: string): Date => {
  if (!str || typeof str !== 'string') return new Date(2000, 0, 1);

  // Format: "22 Jan 2026"
  const spaceParts = str.trim().split(/\s+/);
  if (spaceParts.length === 3) {
    const d = parseInt(spaceParts[0], 10);
    const mIdx = SHORT_MONTHS.findIndex(m => m.toLowerCase() === spaceParts[1].toLowerCase());
    const y = parseInt(spaceParts[2], 10);
    if (!isNaN(d) && mIdx !== -1 && !isNaN(y)) {
      return new Date(y, mIdx, d);
    }
  }

  // Format: "MM/DD/YYYY"
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(str)) {
    const [m, d, y] = str.split('/').map(Number);
    return new Date(y, m - 1, d);
  }

  // Format: "YYYY-MM-DD"
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const [y, m, d] = str.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  const fallback = new Date(str);
  return isNaN(fallback.getTime()) ? new Date(2000, 0, 1) : fallback;
};

const CustomDatePicker: React.FC<CustomDatePickerProps> = ({
  value,
  onChange,
  onBlur,
  placeholder = 'Date of Birth (22 Jan 2026) *',
  disabled = false,
  hasError = false,
  placement = 'bottom',
  disableFuture = false,
  disablePast = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMonthOpen, setIsMonthOpen] = useState(false);
  const [isYearOpen, setIsYearOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const yearListRef = useRef<HTMLDivElement>(null);

  const initialDate = parseDateStr(value);
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();

  const [viewYear, setViewYear] = useState<number>(
    value && !isNaN(initialDate.getTime()) && initialDate.getFullYear() !== 2000 
      ? initialDate.getFullYear() 
      : (disablePast ? currentYear : 2000)
  );
  const [viewMonth, setViewMonth] = useState<number>(
    value && !isNaN(initialDate.getTime()) 
      ? initialDate.getMonth() 
      : (disablePast ? currentMonth : 0)
  );

  useEffect(() => {
    if (value) {
      const d = parseDateStr(value);
      if (!isNaN(d.getTime())) {
        setViewYear(d.getFullYear());
        setViewMonth(d.getMonth());
      }
    } else if (disablePast) {
      setViewYear(currentYear);
      setViewMonth(currentMonth);
    }
  }, [value, disablePast, currentYear, currentMonth]);

  // Auto-scroll selected year into view when year dropdown opens
  useEffect(() => {
    if (isYearOpen && yearListRef.current) {
      const selectedEl = yearListRef.current.querySelector('[data-selected="true"]');
      if (selectedEl) {
        selectedEl.scrollIntoView({ block: 'center' });
      }
    }
  }, [isYearOpen]);

  // Outside click listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        if (isOpen) {
          setIsOpen(false);
          setIsMonthOpen(false);
          setIsYearOpen(false);
          if (onBlur) onBlur();
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onBlur]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfWeek = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const handlePrevMonth = () => {
    setIsMonthOpen(false);
    setIsYearOpen(false);
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(prev => prev - 1);
    } else {
      setViewMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    setIsMonthOpen(false);
    setIsYearOpen(false);
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(prev => prev + 1);
    } else {
      setViewMonth(prev => prev + 1);
    }
  };

  const handleSelectDay = (day: number) => {
    const formattedDay = String(day).padStart(2, '0');
    const monthAbbr = SHORT_MONTHS[viewMonth];
    const dateStr = `${formattedDay} ${monthAbbr} ${viewYear}`;
    onChange(dateStr);
    setIsOpen(false);
    setIsMonthOpen(false);
    setIsYearOpen(false);
  };

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfWeek(viewYear, viewMonth);

  let years: number[] = [];
  if (disablePast) {
    years = Array.from({ length: 15 }, (_, i) => currentYear + i);
  } else if (disableFuture) {
    years = Array.from({ length: 100 }, (_, i) => currentYear - i);
  } else {
    years = Array.from({ length: 30 }, (_, i) => (currentYear - 10) + i);
  }

  const inputStyle = `w-full px-4 py-3 rounded-full border bg-slate-50/70 dark:bg-slate-900/60 text-[14px] font-medium text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 outline-none transition-all flex items-center justify-between cursor-pointer ${
    hasError 
      ? 'border-red-400 focus-within:border-red-500 focus-within:ring-4 focus-within:ring-red-500/10' 
      : 'border-slate-200/80 dark:border-slate-800/80 focus-within:border-[#ea4c89]/80 focus-within:ring-4 focus-within:ring-[#ea4c89]/10 hover:border-slate-300 dark:hover:border-slate-700'
  }`;

  return (
    <div className="relative w-full" ref={containerRef}>
      {/* Input box */}
      <div 
        className={inputStyle}
        onClick={() => { if (!disabled) setIsOpen(true); }}
      >
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => { if (!disabled) setIsOpen(true); }}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full bg-transparent border-none outline-none text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 text-[14px] font-medium cursor-pointer"
        />
        <CalendarIcon className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0 ml-2 pointer-events-none" />
      </div>

      {/* Calendar Dropdown Popup */}
      {isOpen && (
        <div className={`absolute ${placement === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'} left-0 w-72 bg-white dark:bg-[#121827] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-4 z-[9999] text-slate-800 dark:text-slate-200 select-none`}>
          {/* Header Controls: Custom Month & Year Selectors */}
          <div className="flex items-center justify-between mb-3 gap-1 relative">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 relative">
              {/* Month Dropdown Button */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => { setIsMonthOpen(!isMonthOpen); setIsYearOpen(false); }}
                  className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600 transition-all"
                >
                  {MONTH_NAMES[viewMonth]}
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>

                {/* Custom Month Menu */}
                {isMonthOpen && (
                  <div className="absolute top-full left-0 mt-1 w-32 max-h-48 overflow-y-auto bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 p-1 custom-scrollbar">
                    {MONTH_NAMES.map((m, idx) => (
                      <div
                        key={m}
                        onClick={() => { setViewMonth(idx); setIsMonthOpen(false); }}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg cursor-pointer transition-colors ${
                          viewMonth === idx
                            ? 'bg-[#ea4c89]/10 text-[#ea4c89]'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        {m}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Year Dropdown Button */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => { setIsYearOpen(!isYearOpen); setIsMonthOpen(false); }}
                  className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600 transition-all"
                >
                  {viewYear}
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>

                {/* Custom Year Menu */}
                {isYearOpen && (
                  <div ref={yearListRef} className="absolute top-full right-0 mt-1 w-24 max-h-48 overflow-y-auto bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 p-1 custom-scrollbar">
                    {years.map(y => (
                      <div
                        key={y}
                        data-selected={viewYear === y}
                        onClick={() => { setViewYear(y); setIsYearOpen(false); }}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg cursor-pointer text-center transition-colors ${
                          viewYear === y
                            ? 'bg-[#ea4c89]/10 text-[#ea4c89]'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        {y}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              disabled={disableFuture && viewYear >= currentYear && viewMonth >= new Date().getMonth()}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Days of week header */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {DAYS_OF_WEEK.map(d => (
              <span key={d} className="text-[11px] font-bold text-slate-400 dark:text-slate-500 py-1">
                {d}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {Array.from({ length: firstDay }).map((_, idx) => (
              <div key={`empty-${idx}`} className="w-8 h-8" />
            ))}

            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const dayNum = idx + 1;
              const dateObj = new Date(viewYear, viewMonth, dayNum);
              
              let isDisabled = false;
              if (disableFuture && dateObj > today) isDisabled = true;
              if (disablePast && dateObj < today) isDisabled = true;

              const formattedDay = String(dayNum).padStart(2, '0');
              const monthAbbr = SHORT_MONTHS[viewMonth];
              const targetDateStr = `${formattedDay} ${monthAbbr} ${viewYear}`;

              const isSelected = value === targetDateStr;

              return (
                <button
                  key={dayNum}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => handleSelectDay(dayNum)}
                  className={`w-8 h-8 rounded-full text-xs font-semibold flex items-center justify-center transition-all ${
                    isSelected
                      ? 'bg-[#ea4c89] text-white shadow-md'
                      : isDisabled
                      ? 'text-slate-300 dark:text-slate-700 cursor-not-allowed'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200'
                  }`}
                >
                  {dayNum}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomDatePicker;
