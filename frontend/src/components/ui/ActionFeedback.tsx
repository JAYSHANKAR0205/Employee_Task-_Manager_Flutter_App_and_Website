import React from 'react';
import { Loader2, Check, AlertCircle } from 'lucide-react';

interface ActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  isSuccess?: boolean;
  isError?: boolean;
  loadingText?: string;
  successText?: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  children: React.ReactNode;
}

export const ActionButton: React.FC<ActionButtonProps> = ({
  isLoading = false,
  isSuccess = false,
  isError = false,
  loadingText,
  successText,
  variant = 'primary',
  children,
  className = '',
  disabled,
  ...props
}) => {
  let baseVariantStyle = '';
  switch (variant) {
    case 'primary':
      baseVariantStyle = 'bg-gradient-to-r from-[#ea4c89] to-[#a855f7] text-white hover:opacity-90 shadow-sm';
      break;
    case 'secondary':
      baseVariantStyle = 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700';
      break;
    case 'danger':
      baseVariantStyle = 'bg-red-600 hover:bg-red-700 text-white shadow-sm';
      break;
    case 'ghost':
      baseVariantStyle = 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800';
      break;
  }

  const animClass = isError ? 'animate-action-shake' : '';

  return (
    <button
      {...props}
      disabled={disabled || isLoading || isSuccess}
      className={`relative inline-flex items-center justify-center font-bold transition-all duration-200 select-none disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer ${baseVariantStyle} ${animClass} ${className}`}
    >
      {isLoading ? (
        <span className="inline-flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
          {loadingText || children}
        </span>
      ) : isSuccess ? (
        <span className="inline-flex items-center gap-2 text-emerald-500 dark:text-emerald-400 animate-in fade-in zoom-in duration-200">
          <Check className="w-4 h-4 stroke-[3]" />
          {successText || 'Done'}
        </span>
      ) : isError ? (
        <span className="inline-flex items-center gap-2 text-red-500 dark:text-red-400">
          <AlertCircle className="w-4 h-4" />
          {children}
        </span>
      ) : (
        children
      )}
    </button>
  );
};

export default ActionButton;
