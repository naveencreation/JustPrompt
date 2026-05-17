interface MetricBadgeProps {
  label: string;
  value: string | number;
  trend?: "up" | "down" | "neutral";
  color?: "emerald" | "blue" | "amber" | "rose";
}

const colorClasses = {
  emerald: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
  },
  blue: {
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
  },
  amber: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
  },
  rose: {
    bg: "bg-rose-50",
    text: "text-rose-700",
    border: "border-rose-200",
  },
};

export function MetricBadge({
  label,
  value,
  trend,
  color = "emerald",
}: MetricBadgeProps) {
  const { bg, text, border } = colorClasses[color];

  return (
    <div className={`inline-flex items-center gap-2 rounded-lg border ${border} ${bg} px-3 py-2`}>
      <span className="text-xs font-medium uppercase tracking-wider text-neutral-500">
        {label}
      </span>
      <span className={`font-serif text-lg font-semibold ${text}`}>{value}</span>
      {trend && (
        <span className="text-xs">
          {trend === "up" && <span className={text}>↗</span>}
          {trend === "down" && <span className={text}>↘</span>}
        </span>
      )}
    </div>
  );
}
