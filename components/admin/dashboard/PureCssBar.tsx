interface PureCssBarProps {
  value: number;
  max: number;
  className?: string;
}

/**
 * Zero-dependency, zero-bundle-cost bar chart using CSS width.
 * Used in the dashboard to show relative proportions for top queries
 * and top copied images.
 */
export function PureCssBar({ value, max, className }: PureCssBarProps) {
  const pct = max > 0 ? Math.max(4, Math.round((value / max) * 100)) : 4;
  return (
    <div className={`h-1 w-full rounded-full bg-neutral-100 ${className ?? ""}`}>
      <div
        className="h-full rounded-full bg-neutral-800 transition-[width] duration-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
