import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown } from 'lucide-react';
import { getCountryCallingCode, Country } from 'react-phone-number-input';

interface CountryOption {
  value?: string;
  label: string;
}

interface CustomCountrySelectProps {
  value?: string;
  onChange: (value: string) => void;
  options: CountryOption[];
  iconComponent: React.ComponentType<{ country: string; label: string }>;
}

const CustomCountrySelect: React.FC<CustomCountrySelectProps> = ({ value, onChange, options, iconComponent: Icon }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Handle outside clicks and Esc key press
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const filteredOptions = options.filter(option => {
    if (!option.value) return false;
    if (!search.trim()) return true;

    const query = search.trim().toLowerCase();
    const cleanQuery = query.replace(/^\+/, '');

    // 1. Label match (e.g. "United States", "India")
    const labelMatch = option.label.toLowerCase().includes(query);

    // 2. ISO match (e.g. "US", "IN")
    const isoMatch = option.value.toLowerCase().includes(cleanQuery);

    // 3. Country Calling Code match (e.g. "1", "+1", "91", "+91", "57", "+57")
    let codeMatch = false;
    try {
      const callingCode = getCountryCallingCode(option.value as Country);
      const fullCode = `+${callingCode}`;
      codeMatch = callingCode.includes(cleanQuery) || fullCode.includes(query);
    } catch (e) {
      codeMatch = false;
    }

    return labelMatch || isoMatch || codeMatch;
  });

  const lastValidCountryRef = useRef<string>('US');

  useEffect(() => {
    if (value) {
      lastValidCountryRef.current = value;
    }
  }, [value]);

  const targetValue = value || lastValidCountryRef.current || 'US';
  const selectedOption = options.find(option => option.value === targetValue) || options.find(option => !!option.value) || options[0];

  const currentCountry = (selectedOption?.value || 'US') as Country;
  const callingCode = getCountryCallingCode(currentCountry);

  return (
    <div className="relative flex items-center h-full mr-2 pr-3 border-r border-gray-300 dark:border-white/20" ref={wrapperRef}>
      <div 
        className="flex items-center cursor-pointer gap-2 py-2"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="w-6 h-4 shadow-[0_0_0_1px_rgba(255,255,255,0.1)] rounded-[2px] overflow-hidden flex items-center justify-center bg-gray-100 dark:bg-white/10 shrink-0">
          <Icon country={currentCountry} label={selectedOption?.label || currentCountry} />
        </div>
        <span className="text-[15px] text-gray-500 dark:text-gray-400 font-medium">
          +{callingCode}
        </span>
        <ChevronDown className="w-4 h-4 text-gray-400 dark:text-gray-500 shrink-0" />
      </div>

      {isOpen && (
        <div 
          className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-[300px]"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-3 border-b border-white/10 bg-black/20 flex items-center gap-2">
            <Search className="w-4 h-4 text-gray-900 dark:text-white/50" />
            <input
              type="text"
              className="bg-transparent border-none outline-none text-sm text-gray-900 dark:text-white w-full placeholder-gray-400 dark:placeholder-white/40"
              placeholder="Search country or code (e.g. +91, 57)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              autoFocus
            />
          </div>
          <div className="overflow-y-auto flex-1 p-2 custom-scrollbar">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => (
                <div
                  key={option.value || 'undefined'}
                  className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-[#2a2a2a] hover:text-[#ea4c89] dark:hover:text-[#ea4c89] transition-colors ${value === option.value ? 'bg-gray-50 dark:bg-[#2a2a2a] text-[#ea4c89]' : 'text-gray-700 dark:text-gray-300'}`}
                  onClick={() => {
                    if (option.value) {
                      onChange(option.value);
                    }
                    setIsOpen(false);
                    setSearch('');
                  }}
                >
                  <div className="w-5 h-3.5 flex items-center justify-center overflow-hidden rounded-[2px] shadow-[0_0_0_1px_rgba(255,255,255,0.1)] bg-gray-50 dark:bg-white/5 shrink-0">
                    {option.value && <Icon country={option.value} label={option.label} />}
                  </div>
                  <span className="text-sm truncate font-medium flex-1">{option.label}</span>
                  {option.value && (
                    <span className="text-xs text-gray-900 dark:text-white/50 shrink-0 font-semibold">
                      +{getCountryCallingCode(option.value as Country)}
                    </span>
                  )}
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-sm text-gray-900 dark:text-white/50">
                No countries found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomCountrySelect;
