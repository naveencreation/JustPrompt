import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: ReactNode;
  sub?: string;
  accent?: "default" | "emerald" | "blue" | "amber" | "rose";
}

const accentMap = {
  default: {
    icon: "text-neutral-400",
    bg: "from-neutral-50 to-neutral-50/50",
    border: "border-neutral-200",
  },
  emerald: {
    icon: "text-emerald-600",
    bg: "from-emerald-50/80 to-emerald-50/30",
    border: "border-emerald-200",
  },
  blue: {
    icon: "text-blue-600",
    bg: "from-blue-50/80 to-blue-50/30",
    border: "border-blue-200",
  },
  amber: {
    icon: "text-amber-600",
    bg: "from-amber-50/80 to-amber-50/30",
    border: "border-amber-200",
  },
  rose: {
    icon: "text-rose-600",
    bg: "from-rose-50/80 to-rose-50/30",
    border: "border-rose-200",
  },
};

export function StatCard({ label, value, icon, sub, accent = "default" }: StatCardProps) {
  const colors = accentMap[accent];

  return (
    <div
      className={cn(
        "group flex flex-col rounded-lg border bg-gradient-to-br p-6 shadow-sm transition-all duration-300 hover:shadow-md hover:shadow-neutral-200/50",
        colors.border,
        colors.bg
      )}
    >
      <div className="mb-4 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
          {label}
        </p>
        <span className={cn("transition-transform duration-300 group-hover:scale-110", colors.icon)}>
          {icon}
        </span>
      </div>
      <p className="font-serif text-4xl font-semibold tracking-tight text-neutral-900">
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
      {sub && (
        <p className="mt-2 text-xs uppercase tracking-wider text-neutral-500">{sub}</p>
      )}
    </div>
  );
}
