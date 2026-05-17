interface PureCssBarProps {
  value: number;
  max: number;
  className?: string;
  color?: "neutral" | "emerald" | "blue" | "amber";
}

const colorMap = {
  neutral: "from-neutral-400 to-neutral-600",
  emerald: "from-emerald-400 to-emerald-600",
  blue: "from-blue-400 to-blue-600",
  amber: "from-amber-400 to-amber-600",
};

export function PureCssBar({
  value,
  max,
  className,
  color = "neutral",
}: PureCssBarProps) {
  const pct = max > 0 ? Math.max(4, Math.round((value / max) * 100)) : 4;
  const gradient = colorMap[color];

  return (
    <div className={`h-1.5 w-full overflow-hidden rounded-full bg-neutral-100 ${className ?? ""}`}>
      <div
        className={`h-full rounded-full bg-gradient-to-r ${gradient} shadow-sm transition-[width] duration-500`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
