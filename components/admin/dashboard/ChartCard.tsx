import type { ReactNode } from "react";

interface ChartCardProps {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  accent?: "emerald" | "blue" | "amber" | "rose" | "default";
  className?: string;
}

const accentClasses = {
  emerald: "border border-neutral-200",
  blue: "border border-neutral-200",
  amber: "border border-neutral-200",
  rose: "border border-neutral-200",
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
      className={`rounded-lg bg-neutral-50 p-6 shadow-sm transition-all duration-300 hover:shadow-md ${accentClasses[accent]} ${className}`}
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
