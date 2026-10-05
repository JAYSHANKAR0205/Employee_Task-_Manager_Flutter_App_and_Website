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

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter(option =>
    option.value && option.label.toLowerCase().includes(search.toLowerCase())
  );

  const selectedOption = options.find(option => option.value === value) || options[0];

  return (
    <div className="relative flex items-center h-full mr-2 pr-3 border-r border-gray-300 dark:border-white/20" ref={wrapperRef}>
      <div 
        className="flex items-center cursor-pointer gap-2 py-2"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="w-6 h-4 shadow-[0_0_0_1px_rgba(255,255,255,0.1)] rounded-[2px] overflow-hidden flex items-center justify-center bg-gray-100 dark:bg-white/10 shrink-0">
          {selectedOption?.value ? (
            <Icon country={selectedOption.value} label={selectedOption.label} />
          ) : (
            <span className="text-[10px] text-gray-900 dark:text-white/50">🌐</span>
          )}
        </div>
        {selectedOption?.value && (
          <span className="text-sm text-forest dark:text-sand font-bold">
            +{getCountryCallingCode(selectedOption.value as Country)}
          </span>
        )}
        <ChevronDown className="w-3 h-3 text-gray-900 dark:text-white/50 shrink-0" />
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-forest border border-forest/30 dark:border-sand/30 rounded-xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-[300px]">
          <div className="p-3 border-b border-white/10 bg-black/20 flex items-center gap-2">
            <Search className="w-4 h-4 text-gray-900 dark:text-white/50" />
            <input
              type="text"
              className="bg-transparent border-none outline-none text-sm text-gray-900 dark:text-white w-full placeholder-gray-400 dark:placeholder-white/40"
              placeholder="Search country..."
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
                  className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-white/10 transition-colors ${value === option.value ? 'bg-gray-100 dark:bg-white/10 text-forest dark:text-sand' : 'text-gray-700 dark:text-white/80'}`}
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
                    <span className="text-xs text-gray-900 dark:text-white/50 shrink-0">
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
