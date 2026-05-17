"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { ImageCard } from "./ImageCard";
import { SkeletonCard } from "./SkeletonCard";
import { Lightbox } from "./Lightbox";
import { TIMING } from "@/lib/constants/timing";
import type { Image as ImageType, Sort } from "@/lib/db/schema";

interface GalleryGridProps {
  initialItems: ImageType[];
  initialNextCursor: string | null;
  sort?: Sort;
  tagSlug?: string;
  searchQuery?: string;
}

const PRIORITY_IMAGE_COUNT = 8;
const SKELETON_RATIOS = [1.1, 0.85, 1.3, 0.95];

export function GalleryGrid({
  initialItems,
  initialNextCursor,
  sort = "new",
  tagSlug,
  searchQuery,
}: GalleryGridProps) {
  const [items, setItems] = useState<ImageType[]>(initialItems);
  const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor);
  const [isLoading, setIsLoading] = useState(false);
  const [activeLightbox, setActiveLightbox] = useState<ImageType | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const [prevInitialItems, setPrevInitialItems] = useState(initialItems);

  if (initialItems !== prevInitialItems) {
    setItems(initialItems);
    setNextCursor(initialNextCursor);
    setPrevInitialItems(initialItems);
  }

  const loadMore = useCallback(async () => {
    if (isLoading || !nextCursor) return;
    setIsLoading(true);

    try {
      const params = new URLSearchParams();
      params.set("cursor", nextCursor);
      if (sort !== "new") params.set("sort", sort);
      if (tagSlug) params.set("tag", tagSlug);

      const endpoint = searchQuery
        ? `/api/search?q=${encodeURIComponent(searchQuery)}&cursor=${nextCursor}`
        : `/api/images?${params.toString()}`;

      const res = await fetch(endpoint);
      if (!res.ok) return;

      const json = (await res.json()) as { items: ImageType[]; nextCursor: string | null };
      setItems((prev) => [...prev, ...json.items]);
      setNextCursor(json.nextCursor);
    } catch {
      // Silently fail — user can scroll back up and retry
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, nextCursor, sort, tagSlug, searchQuery]);

  useEffect(() => {
    observerRef.current?.disconnect();
    observerRef.current = new IntersectionObserver(
      (entries) => { if (entries[0]?.isIntersecting) void loadMore(); },
      { rootMargin: "400px" },
    );
    if (sentinelRef.current) observerRef.current.observe(sentinelRef.current);
    return () => observerRef.current?.disconnect();
  }, [loadMore]);

  if (items.length === 0 && !isLoading) {
    return (
      <div className="flex flex-col items-center gap-2 py-32 text-center">
        <p className="font-serif text-2xl tracking-tight text-neutral-700">
          No prompts found
        </p>
        <p className="text-sm text-neutral-400">Try a different search or filter</p>
      </div>
    );
  }

  return (
    <>
      <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 xl:columns-4">
        {items.map((image, index) => (
          <ImageCard
            key={image.id}
            image={image}
            priority={index < PRIORITY_IMAGE_COUNT}
            onOpen={setActiveLightbox}
            animationDelay={Math.min(
              index * TIMING.GALLERY_STAGGER_MS,
              TIMING.GALLERY_MAX_STAGGER_MS,
            )}
          />
        ))}

        {isLoading &&
          SKELETON_RATIOS.map((ratio, i) => (
            <div key={`sk-${i}`} className="mb-4 break-inside-avoid">
              <SkeletonCard aspectRatio={ratio} />
            </div>
          ))}
      </div>

      <div ref={sentinelRef} className="h-1" aria-hidden="true" />

      {activeLightbox && (
        <Lightbox
          image={activeLightbox}
          onClose={() => setActiveLightbox(null)}
        />
      )}
    </>
  );
}
