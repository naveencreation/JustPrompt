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

  const baseClasses =
    "rounded-full px-3 py-1 text-[11px] font-medium uppercase tracking-[0.05em] transition-[background-color,color] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]";

  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by tag">
      <button
        onClick={() => onSelect(null)}
        className={cn(
          baseClasses,
          activeSlug === null
            ? "bg-neutral-900 text-neutral-50"
            : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 hover:text-neutral-900",
        )}
      >
        All
      </button>
      {tags.map((tag) => (
        <button
          key={tag.id}
          onClick={() => onSelect(tag.slug)}
          className={cn(
            baseClasses,
            activeSlug === tag.slug
              ? "bg-neutral-900 text-neutral-50"
              : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 hover:text-neutral-900",
          )}
        >
          {tag.name}
        </button>
      ))}
    </div>
  );
}
