import type { ReactNode } from "react";

interface ChartCardProps {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  accent?: "emerald" | "blue" | "amber" | "rose" | "default";
  className?: string;
}

const accentClasses = {
  emerald:
    "border-l-4 border-l-emerald-500 bg-gradient-to-br from-emerald-50/30 to-transparent",
  blue: "border-l-4 border-l-blue-500 bg-gradient-to-br from-blue-50/30 to-transparent",
  amber:
    "border-l-4 border-l-amber-500 bg-gradient-to-br from-amber-50/30 to-transparent",
  rose: "border-l-4 border-l-rose-500 bg-gradient-to-br from-rose-50/30 to-transparent",
  default: "border border-neutral-200",
};

export function ChartCard({
  title,
  icon,
  children,
  accent = "default",
  className = "",
}: ChartCardProps) {
  return (
    <div
      className={`rounded-lg border border-neutral-200 bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-md ${accentClasses[accent]} ${className}`}
    >
      <div className="mb-5 flex items-center gap-3">
        {icon && <div className="text-neutral-400">{icon}</div>}
        <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-700">
          {title}
        </h2>
      </div>
      <div>{children}</div>
    </div>
  );
}
