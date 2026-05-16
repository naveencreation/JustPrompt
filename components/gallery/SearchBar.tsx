"use client";

import { useState, useEffect, useRef } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface SearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  className?: string;
}

const DEBOUNCE_MS = 350;

export function SearchBar({
  onSearch,
  placeholder = "Search prompts…",
  className,
}: SearchBarProps) {
  const [value, setValue] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => onSearch(value.trim()), DEBOUNCE_MS);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [value, onSearch]);

  return (
    <div className={cn("relative w-full max-w-xl", className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-neutral-400" />
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className={cn(
          "w-full rounded-xl border border-neutral-200 bg-white py-2.5 pl-9 pr-9 text-sm",
          "placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-200",
          "transition-colors",
        )}
        aria-label="Search prompts"
      />
      {value && (
        <button
          onClick={() => setValue("")}
          aria-label="Clear search"
          className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}
