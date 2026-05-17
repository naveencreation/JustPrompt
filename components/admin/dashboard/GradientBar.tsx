interface GradientBarProps {
  value: number;
  max: number;
  color?: "neutral" | "emerald" | "blue" | "amber" | "rose";
  animated?: boolean;
}

const colorMap = {
  neutral: "from-neutral-400 to-neutral-600",
  emerald: "from-emerald-400 to-emerald-600",
  blue: "from-blue-400 to-blue-600",
  amber: "from-amber-400 to-amber-600",
  rose: "from-rose-400 to-rose-600",
};

export function GradientBar({
  value,
  max,
  color = "emerald",
  animated = true,
}: GradientBarProps) {
  const pct = max > 0 ? Math.max(2, Math.round((value / max) * 100)) : 2;
  const gradient = colorMap[color];

  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-gradient-to-r from-gray-100 to-gray-50">
      <div
        className={`h-full bg-gradient-to-r ${gradient} ${animated ? "transition-[width] duration-700" : ""} shadow-sm`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
