"use client";

import { cn } from "@/lib/utils/cn";
import type { Tag } from "@/lib/db/schema";

interface TagFilterProps {
  tags: Tag[];
  activeSlug: string | null;
  onSelect: (slug: string | null) => void;
}

export function TagFilter({ tags, activeSlug, onSelect }: TagFilterProps) {
  if (tags.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by tag">
      <button
        onClick={() => onSelect(null)}
        className={cn(
          "rounded-full px-3 py-1 text-sm font-medium transition-colors",
          activeSlug === null
            ? "bg-neutral-900 text-white"
            : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200",
        )}
      >
        All
      </button>
      {tags.map((tag) => (
        <button
          key={tag.id}
          onClick={() => onSelect(tag.slug)}
          className={cn(
            "rounded-full px-3 py-1 text-sm font-medium transition-colors",
            activeSlug === tag.slug
              ? "bg-neutral-900 text-white"
              : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200",
          )}
        >
          #{tag.name}
        </button>
      ))}
    </div>
  );
}
