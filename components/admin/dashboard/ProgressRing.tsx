interface ProgressRingProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  color?: "emerald" | "blue" | "amber" | "rose";
}

const colorMap = {
  emerald: "stroke-emerald-500",
  blue: "stroke-blue-500",
  amber: "stroke-amber-500",
  rose: "stroke-rose-500",
};

export function ProgressRing({
  percentage,
  size = 120,
  strokeWidth = 6,
  color = "emerald",
}: ProgressRingProps) {
  const circumference = 2 * Math.PI * ((size - strokeWidth) / 2);
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={(size - strokeWidth) / 2}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-neutral-100"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={(size - strokeWidth) / 2}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className={`${colorMap[color]} transition-all duration-700`}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div className="text-center">
        <p className="text-lg font-semibold text-neutral-900">{Math.round(percentage)}%</p>
      </div>
    </div>
  );
}
