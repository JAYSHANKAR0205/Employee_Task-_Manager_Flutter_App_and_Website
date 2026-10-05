import React, { useRef } from 'react';

interface OtpInputProps {
  value: string;
  onChange: (val: string) => void;
  isInvalid?: boolean;
  disabled?: boolean;
  length?: number;
}

const OtpInput: React.FC<OtpInputProps> = ({ value, onChange, isInvalid, disabled }) => {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Initialize array of length 6
  const otpArray = value.split('').concat(Array(6).fill('')).slice(0, 6);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const val = e.target.value;
    if (/[^0-9]/.test(val)) return; // Only allow numbers

    const newOtp = [...otpArray];
    newOtp[index] = val.substring(val.length - 1); // Get last char in case of multiple
    
    onChange(newOtp.join(''));

    // Move to next input
    if (val && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace' && !otpArray[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6).replace(/[^0-9]/g, '');
    if (pastedData) {
      const newOtp = pastedData.split('').concat(Array(6).fill('')).slice(0, 6);
      onChange(newOtp.join(''));
      
      // Focus on the next empty input or the last one
      const focusIndex = Math.min(pastedData.length, 5);
      inputRefs.current[focusIndex]?.focus();
    }
  };

  return (
    <div className="flex justify-between items-center gap-2 w-full">
      {otpArray.map((digit, index) => (
        <input
          key={index}
          ref={(el) => { inputRefs.current[index] = el; }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          value={digit}
          disabled={disabled}
          onChange={(e) => handleChange(e, index)}
          onKeyDown={(e) => handleKeyDown(e, index)}
          onPaste={handlePaste}
          className={`w-10 h-12 sm:w-12 sm:h-14 flex-1 text-center text-lg sm:text-xl font-bold rounded-lg border transition-all duration-200 bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-white outline-none ${
            isInvalid 
              ? 'border-red-500 focus:border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.2)]' 
              : 'border-gray-300 dark:border-white/20 focus:border-forest dark:focus:border-sand shadow-sm focus:shadow-[0_0_15px_rgba(23,63,53,0.15)] dark:focus:shadow-[0_0_15px_rgba(216,194,140,0.15)]'
          }`}
        />
      ))}
    </div>
  );
};

export default OtpInput;
