"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronDownIcon } from "@/components/icons";
import { cn } from "@/lib/utils/cn";
import type { TagWithPreview } from "@/lib/services/tagService";

const INITIAL_SHOWN = 15;

export function TagGrid({ tags }: { tags: TagWithPreview[] }) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? tags : tags.slice(0, INITIAL_SHOWN);
  const hiddenCount = tags.length - INITIAL_SHOWN;

  return (
    <>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:gap-6 auto-rows-[minmax(0,1fr)]">
        {visible.map((tag, index) => {
          const isFeatured = !showAll && index < 3 && tag.count > 5;
          return (
            <Link
              key={tag.id}
              href={`/t/${tag.slug}`}
              className={cn(
                "group relative flex flex-col items-center justify-center overflow-hidden rounded-2xl bg-neutral-100 transition-transform duration-300 hover:scale-[1.02]",
                isFeatured
                  ? "aspect-[8/3] col-span-2 sm:col-span-2 row-span-1 md:aspect-[4/3] md:col-auto md:row-span-1"
                  : "aspect-[4/3] w-full col-span-1",
              )}
            >
              {tag.previewUrl && (
                <>
                  <Image
                    src={tag.previewUrl}
                    alt={`${tag.name} category preview`}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-110"
                    sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-black/10 transition-opacity duration-300 group-hover:opacity-90" />
                </>
              )}
              <div className="relative z-10 flex flex-col items-center justify-center p-4 text-center">
                <h2 className="text-lg font-bold text-white tracking-tight drop-shadow-md sm:text-xl">
                  {tag.name}
                </h2>
                <p className="mt-1 text-xs font-medium text-white/80 drop-shadow">
                  {tag.count} {tag.count === 1 ? "prompt" : "prompts"}
                </p>
              </div>
            </Link>
          );
        })}
      </div>

      {tags.length > INITIAL_SHOWN && (
        <div className="mt-10 flex justify-center">
          <button
            onClick={() => setShowAll((v) => !v)}
            className={cn(
              "group inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-6 py-3",
              "text-sm font-medium text-neutral-600 transition-all duration-300",
              "hover:border-neutral-300 hover:text-neutral-900 hover:shadow-sm",
            )}
          >
            <span>{showAll ? "Show less" : `Show ${hiddenCount} more categories`}</span>
            <ChevronDownIcon
              size={14}
              className={cn(
                "transition-transform duration-300",
                showAll && "rotate-180",
              )}
            />
          </button>
        </div>
      )}

      {tags.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="text-neutral-500">No categories found.</p>
        </div>
      )}
    </>
  );
}
