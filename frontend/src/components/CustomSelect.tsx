import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, GraduationCap } from 'lucide-react';

interface CustomSelectProps {
  name: string;
  value: string;
  onChange: (e: any) => void;
  options: string[];
  placeholder: string;
  disabled?: boolean;
  onBlur?: (e: any) => void;
}

const CustomSelect: React.FC<CustomSelectProps> = ({ name, value, onChange, options, placeholder, disabled, onBlur }) => {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(prev => {
          if (prev && onBlur) onBlur({ target: { name, value } });
          return false;
        });
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (option: string) => {
    onChange({ target: { name, value: option } });
    setIsOpen(false);
  };

  return (
    <div className={`relative w-full h-full ${disabled ? 'opacity-50 pointer-events-none' : ''}`} ref={wrapperRef}>
      <div 
        className="w-full h-full flex items-center justify-between px-4 py-3 cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={value ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'}>
          {value || placeholder}
        </span>
        <ChevronDown className="w-5 h-5 text-gray-400 dark:text-gray-500" />
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-full bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-[250px]">
          <div className="overflow-y-auto flex-1 p-2 custom-scrollbar">
            {options.map((option) => (
              <div
                key={option}
                className={`group flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-[#2a2a2a] hover:text-[#ea4c89] dark:hover:text-[#ea4c89] transition-colors ${value === option ? 'bg-gray-50 dark:bg-[#2a2a2a] text-[#ea4c89]' : 'text-gray-700 dark:text-gray-300'}`}
                onClick={() => handleSelect(option)}
              >
                <GraduationCap className={`w-5 h-5 transition-colors ${value === option ? 'text-[#ea4c89]' : 'text-gray-400 dark:text-gray-500 group-hover:text-[#ea4c89]'}`} />
                <span className="text-sm font-medium">{option}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomSelect;
