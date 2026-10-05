interface TaskSummaryCardProps {
  title: string;
  value: number;
  description: string;
  icon: string;
  variant: "total" | "pending" | "completed" | "progress";
  onClick?: () => void;
}

const variantStyles = {
  total: {
    gradient: "from-pink-500/10 via-rose-500/5 to-pink-500/10 dark:from-pink-950/20 dark:to-rose-900/20",
    border: "border-pink-200/60 dark:border-pink-800/40",
    titleColor: "text-pink-600 dark:text-pink-400",
    valueColor: "text-gray-900 dark:text-white",
    iconBg: "bg-pink-100/80 dark:bg-pink-900/40 text-pink-600 dark:text-pink-300",
    hoverRing: "group-hover:border-pink-400 dark:group-hover:border-pink-600",
    bottomBar: "bg-pink-500",
  },
  completed: {
    gradient: "from-emerald-500/10 via-teal-500/5 to-emerald-500/10 dark:from-emerald-950/20 dark:to-teal-900/20",
    border: "border-emerald-200/60 dark:border-emerald-800/40",
    titleColor: "text-emerald-600 dark:text-emerald-400",
    valueColor: "text-gray-900 dark:text-white",
    iconBg: "bg-emerald-100/80 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-300",
    hoverRing: "group-hover:border-emerald-400 dark:group-hover:border-emerald-600",
    bottomBar: "bg-emerald-500",
  },
  progress: {
    gradient: "from-purple-500/10 via-indigo-500/5 to-purple-500/10 dark:from-purple-950/20 dark:to-indigo-900/20",
    border: "border-purple-200/60 dark:border-purple-800/40",
    titleColor: "text-purple-600 dark:text-purple-400",
    valueColor: "text-gray-900 dark:text-white",
    iconBg: "bg-purple-100/80 dark:bg-purple-900/40 text-purple-600 dark:text-purple-300",
    hoverRing: "group-hover:border-purple-400 dark:group-hover:border-purple-600",
    bottomBar: "bg-purple-500",
  },
  pending: {
    gradient: "from-amber-500/10 via-orange-500/5 to-amber-500/10 dark:from-amber-950/20 dark:to-orange-900/20",
    border: "border-amber-200/60 dark:border-amber-800/40",
    titleColor: "text-amber-600 dark:text-amber-400",
    valueColor: "text-gray-900 dark:text-white",
    iconBg: "bg-amber-100/80 dark:bg-amber-900/40 text-amber-600 dark:text-amber-300",
    hoverRing: "group-hover:border-amber-400 dark:group-hover:border-amber-600",
    bottomBar: "bg-amber-500",
  },
};

const TaskSummaryCard = ({
  title,
  value,
  icon,
  variant,
  onClick,
}: TaskSummaryCardProps) => {
  const styles = variantStyles[variant];

  return (
    <div
      onClick={onClick}
      className={`
        group relative overflow-hidden rounded-2xl bg-gradient-to-br ${styles.gradient}
        border ${styles.border} ${styles.hoverRing}
        p-6 backdrop-blur-sm
        shadow-sm hover:shadow-md
        transition-all duration-300 ease-out
        hover:-translate-y-1
        active:scale-[0.98]
        ${onClick ? "cursor-pointer" : ""}
      `}
    >
      {/* Decorative ambient shine */}
      <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/40 dark:bg-white/5 transition-transform duration-700 group-hover:scale-150 blur-lg" />

      <div className="relative z-10 flex items-start justify-between">
        <div className="flex flex-col">
          <p className={`text-xs font-bold uppercase tracking-wider ${styles.titleColor}`}>{title}</p>
          <h2 className={`mt-2 text-3xl font-black tracking-tight ${styles.valueColor} transition-transform duration-300 group-hover:scale-105 origin-left`}>
            {value}
          </h2>
        </div>

        <div className={`${styles.iconBg} flex h-12 w-12 items-center justify-center rounded-xl text-xl shadow-sm transition-all duration-300 group-hover:rotate-6 group-hover:scale-110`}>
          {icon}
        </div>
      </div>

      {/* Decorative Bottom Bar */}
      <div className={`absolute bottom-0 left-0 h-1 w-full ${styles.bottomBar} opacity-40 transition-all duration-300 group-hover:opacity-100 group-hover:h-1.5`} />
    </div>
  );
};

export default TaskSummaryCard;