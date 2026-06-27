"use client";

import { useEffect, useState, useCallback, useRef, Suspense } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { SearchIcon, CloseIcon, JustPromptLogo } from "@/components/icons";
import { cn } from "@/lib/utils/cn";
import { useDebounceCallback } from "@/lib/hooks/useDebounce";
import { TIMING } from "@/lib/constants/timing";
import Link from "next/link";
import { SearchSuggestions } from "./SearchSuggestions";

function TopBarContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [value, setValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keep input value in sync with URL queries
  useEffect(() => {
    setValue(searchParams.get("q") ?? "");
  }, [searchParams]);

  const handleSearchUpdate = useCallback(
    (query: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (query) {
        params.set("q", query);
      } else {
        params.delete("q");
      }
      
      // If we are not on the gallery landing page, redirect to home page with search params
      if (pathname !== "/") {
        router.push(`/?${params.toString()}`);
      } else {
        router.push(`${pathname}?${params.toString()}`);
      }
    },
    [router, pathname, searchParams]
  );

  const debouncedSearch = useDebounceCallback(handleSearchUpdate, TIMING.SEARCH_DEBOUNCE_MS);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    setValue(inputValue);
    debouncedSearch(inputValue.trim());
  };

  const handleClear = () => {
    setValue("");
    handleSearchUpdate("");
  };

  const handleSuggestionSelect = (tagName: string) => {
    setValue(tagName);
    setIsFocused(false);
    inputRef.current?.blur();
    handleSearchUpdate(tagName);
  };

  return (
    <div className="flex-1 flex items-center w-full gap-2">
      {/* Mobile-only logo */}
      <Link href="/" className="md:hidden flex items-center justify-center text-neutral-950">
        <JustPromptLogo size={28} strokeWidth={2} />
      </Link>

      {/* Brand Name on Desktop */}
      <Link href="/" className="hidden md:block select-none shrink-0 hover:opacity-80 transition-opacity">
        <span className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-wide text-neutral-900">
          Just Prompt
        </span>
      </Link>

      {/* Pill Search Input */}
      <div className="relative flex-1 flex items-center group">
        <SearchIcon
          size={16}
          className="pointer-events-none absolute left-4 text-neutral-500 transition-colors group-focus-within:text-neutral-800"
        />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 150)}
          placeholder="Search tags or models..."
          className={cn(
            "w-full rounded-full border-none bg-neutral-100 py-3 pl-11 pr-11 text-[14px]",
            "placeholder:text-neutral-500 outline-none text-neutral-800 hover:bg-neutral-200/70",
            "focus:bg-white focus:ring-2 focus:ring-neutral-900 focus:shadow-[0_2px_12px_rgba(0,0,0,0.06)]",
            "transition-all duration-200"
          )}
          aria-label="Search tags or models"
        />
        {value && (
          <button
            onClick={handleClear}
            aria-label="Clear search"
            className="absolute right-4 text-neutral-400 hover:text-neutral-700 transition-colors p-1"
          >
            <CloseIcon size={14} />
          </button>
        )}
        <SearchSuggestions
          query={value}
          isFocused={isFocused}
          onSelect={handleSuggestionSelect}
          onClose={() => { setIsFocused(false); inputRef.current?.blur(); }}
        />
      </div>

      {/* Secondary User Profile indicator for mobile */}
      <Link
        href="/admin/dashboard"
        className="md:hidden flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-xs font-bold text-neutral-600 border border-neutral-200"
      >
        A
      </Link>
    </div>
  );
}

export function TopBar() {
  return (
    <header className="sticky top-0 z-30 h-16 w-full flex items-center bg-white/95 border-b border-neutral-100 backdrop-blur">
      <div className="flex-1 flex items-center h-full px-4 md:px-8 w-full">
        <Suspense fallback={<div className="flex-1 h-10 bg-neutral-100 rounded-full animate-pulse" />}>
          <TopBarContent />
        </Suspense>
      </div>
    </header>
  );
}
