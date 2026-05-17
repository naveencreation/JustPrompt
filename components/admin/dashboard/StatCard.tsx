import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: ReactNode;
  sub?: string;
  accent?: "default" | "green" | "blue" | "amber";
}

const accentMap = {
  default: "text-neutral-400",
  green: "text-emerald-500",
  blue: "text-blue-500",
  amber: "text-amber-500",
};

export function StatCard({ label, value, icon, sub, accent = "default" }: StatCardProps) {
  return (
    <div className="flex flex-col rounded-md border border-neutral-200 bg-white p-5 transition-shadow duration-200 hover:shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-neutral-400">
          {label}
        </p>
        <span className={cn("opacity-60", accentMap[accent])}>{icon}</span>
      </div>
      <p className="font-serif text-3xl tracking-tight text-neutral-900">
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
      {sub && (
        <p className="mt-1.5 text-[10px] uppercase tracking-[0.1em] text-neutral-400">{sub}</p>
      )}
    </div>
  );
}
