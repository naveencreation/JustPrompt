"use client";

import { useState } from "react";
import { SearchIcon, CloseIcon } from "@/components/icons";
import { cn } from "@/lib/utils/cn";
import { TIMING } from "@/lib/constants/timing";
import { useDebounceCallback } from "@/lib/hooks/useDebounce";

interface SearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  className?: string;
}

export function SearchBar({
  onSearch,
  placeholder = "Search prompts",
  className,
}: SearchBarProps) {
  const [value, setValue] = useState("");
  
  const debouncedSearch = useDebounceCallback(onSearch, TIMING.SEARCH_DEBOUNCE_MS);

  // We only trigger the debounced callback, local state is instant
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    setValue(inputValue);
    debouncedSearch(inputValue.trim());
  };

  return (
    <div className={cn("relative w-full max-w-xl", className)}>
      <SearchIcon
        size={16}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
      />
      <input
        type="search"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        className={cn(
          "w-full rounded-md border border-neutral-200 bg-white py-2.5 pl-9 pr-9 text-sm",
          "placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-100 focus:shadow-[0_2px_12px_rgba(0,0,0,0.07)]",
          "transition-[border-color,box-shadow] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]",
        )}
        aria-label="Search prompts"
      />
      {value && (
        <button
          onClick={() => { setValue(""); debouncedSearch(""); }}
          aria-label="Clear search"
          className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700"
        >
          <CloseIcon size={16} />
        </button>
      )}
    </div>
  );
}
