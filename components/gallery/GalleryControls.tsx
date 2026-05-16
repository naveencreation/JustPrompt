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
  { value: "new", label: "Newest" },
  { value: "likes", label: "Most Liked" },
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

  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = useCallback(
    (query: string) => {
      setSearchQuery(query);
      pushParam("q", query || null);
    },
    [pushParam],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <SearchBar onSearch={handleSearch} className="flex-1" />

        {/* Sort buttons */}
        <div className="flex rounded-xl border border-neutral-200 bg-white overflow-hidden">
          {SORT_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => pushParam("sort", value === "new" ? null : value)}
              className={cn(
                "px-3 py-2 text-sm font-medium transition-colors",
                activeSort === value
                  ? "bg-neutral-900 text-white"
                  : "text-neutral-600 hover:bg-neutral-50",
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
