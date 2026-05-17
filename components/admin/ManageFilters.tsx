"use client";

import { useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { ChevronDownIcon } from "@/components/icons";
import { cn } from "@/lib/utils/cn";
import type { Tag } from "@/lib/db/schema";

interface ManageFiltersProps {
  tags: Tag[];
  activeStatus?: "published" | "draft";
  activeTag?: string;
}

export function ManageFilters({ tags, activeStatus, activeTag }: ManageFiltersProps) {
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

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-[0.1em] text-neutral-400">Status</span>
        <div className="relative">
          <select
            value={activeStatus ?? ""}
            onChange={(e) => pushParam("status", e.target.value)}
            className="appearance-none rounded-md border border-neutral-200 bg-white pl-3 pr-8 py-1.5 text-[13px] font-medium text-neutral-700 outline-none transition-[border-color,box-shadow] hover:border-neutral-300 focus:border-neutral-400 focus:ring-1 focus:ring-neutral-400 cursor-pointer"
          >
            <option value="">All</option>
            <option value="published">Published</option>
            <option value="draft">Drafts</option>
          </select>
          <ChevronDownIcon size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-[0.1em] text-neutral-400">Tag</span>
        <div className="relative">
          <select
            value={activeTag ?? ""}
            onChange={(e) => pushParam("tag", e.target.value)}
            className="appearance-none rounded-md border border-neutral-200 bg-white pl-3 pr-8 py-1.5 text-[13px] font-medium text-neutral-700 outline-none transition-[border-color,box-shadow] hover:border-neutral-300 focus:border-neutral-400 focus:ring-1 focus:ring-neutral-400 cursor-pointer"
          >
            <option value="">All Tags</option>
            {tags.map((t) => (
              <option key={t.id} value={t.slug}>{t.name}</option>
            ))}
          </select>
          <ChevronDownIcon size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
        </div>
      </div>
      
      {(activeStatus || activeTag) && (
        <button
          onClick={() => router.push(pathname)}
          className="text-xs font-medium text-neutral-400 transition-colors hover:text-neutral-700"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
