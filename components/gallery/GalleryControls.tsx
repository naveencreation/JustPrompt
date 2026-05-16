"use client";

import { useState, useCallback } from "react";
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

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <SearchBar onSearch={handleSearch} className="flex-1" />

        {/* Sort segmented control — accordion-style underlines, not boxes */}
        <div role="tablist" aria-label="Sort gallery" className="flex items-center gap-1 rounded-md border border-neutral-200 bg-white p-1">
          {SORT_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              role="tab"
              aria-selected={activeSort === value}
              onClick={() => pushParam("sort", value === "new" ? null : value)}
              className={cn(
                "rounded-[5px] px-3 py-1.5 text-[13px] font-medium",
                "transition-[background-color,color] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]",
                activeSort === value
                  ? "bg-neutral-900 text-neutral-50"
                  : "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900",
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
