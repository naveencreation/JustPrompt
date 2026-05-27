"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { SearchBar } from "./SearchBar";
import { TagFilter } from "./TagFilter";
import { cn } from "@/lib/utils/cn";
import type { Tag } from "@/lib/db/schema";

interface GalleryControlsProps {
  tags: Tag[];
  activeTag: string | null;
  activeSort: "new" | "likes" | "random";
}

const SORT_OPTIONS = [
  { value: "new",    label: "Newest" },
  { value: "likes",  label: "Most liked" },
  { value: "random", label: "Random" },
] as const;

export function GalleryControls({ tags, activeTag, activeSort }: GalleryControlsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const pushParam = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set(key, value); else params.delete(key);
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams],
  );

  const [, setSearchQuery] = useState("");

  const handleSearch = useCallback(
    (query: string) => {
      setSearchQuery(query);
      pushParam("q", query || null);
    },
    [pushParam],
  );

  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });

  useEffect(() => {
    const container = tabsContainerRef.current;
    const activeBtn = tabRefs.current[activeSort];
    if (!container || !activeBtn) return;
    const containerRect = container.getBoundingClientRect();
    const btnRect = activeBtn.getBoundingClientRect();
    setIndicatorStyle({
      left: btnRect.left - containerRect.left,
      width: btnRect.width,
    });
  }, [activeSort]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <SearchBar onSearch={handleSearch} className="flex-1 sm:max-w-xs md:max-w-sm" />

        {/* Sort segmented control — accordion-style underlines, not boxes */}
        <div ref={tabsContainerRef} role="tablist" aria-label="Sort gallery" className="relative flex items-center gap-1 rounded-md border border-neutral-200 bg-white p-1">
          <div
            className="absolute rounded-[5px] bg-neutral-900 transition-[left,width] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]"
            style={{ left: indicatorStyle.left, width: indicatorStyle.width, top: 4, bottom: 4 }}
            aria-hidden="true"
          />
          {SORT_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              ref={(el) => { tabRefs.current[value] = el; }}
              role="tab"
              aria-selected={activeSort === value}
              onClick={() => pushParam("sort", value === "new" ? null : value)}
              className={cn(
                "relative z-10 rounded-[5px] px-3 py-1.5 text-[13px] font-medium",
                "transition-colors duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]",
                activeSort === value
                  ? "text-neutral-50"
                  : "text-neutral-500 hover:text-neutral-900",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <TagFilter
        tags={tags}
        activeSlug={activeTag}
        onSelect={(slug) => pushParam("tag", slug)}
      />
    </div>
  );
}
