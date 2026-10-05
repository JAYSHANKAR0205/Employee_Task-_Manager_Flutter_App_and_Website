import React from 'react';

export type PillVariant = 'red' | 'amber' | 'blue' | 'green' | 'purple' | 'cyan';

interface BadgePillProps {
  label: string;
  variant: PillVariant;
}

const VARIANT_STYLES: Record<PillVariant, string> = {
  red: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border border-red-200/50 dark:border-red-800/40',
  amber: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200/50 dark:border-amber-800/40',
  blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200/50 dark:border-blue-800/40',
  green: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border border-green-200/50 dark:border-green-800/40',
  purple: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border border-purple-200/50 dark:border-purple-800/40',
  cyan: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400 border border-cyan-200/50 dark:border-cyan-800/40',
};

export const BadgePill: React.FC<BadgePillProps> = ({ label, variant }) => {
  return (
    <span
      className={`w-28 h-8 inline-flex items-center justify-center rounded-full text-xs font-semibold tracking-wide text-center shrink-0 shadow-2xs transition-all ${VARIANT_STYLES[variant]}`}
    >
      {label}
    </span>
  );
};

export default BadgePill;
