"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { ImageCard } from "./ImageCard";
import { SkeletonCard } from "./SkeletonCard";
import { Lightbox } from "./Lightbox";
import type { Image as ImageType, Sort } from "@/lib/db/schema";

interface GalleryGridProps {
  initialItems: ImageType[];
  initialNextCursor: string | null;
  sort?: Sort;
  tagSlug?: string;
  searchQuery?: string;
}

const STAGGER_MS = 50;
const MAX_STAGGER_DELAY = 400;

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

  // Reset when filters change
  useEffect(() => {
    setItems(initialItems);
    setNextCursor(initialNextCursor);
  }, [initialItems, initialNextCursor, sort, tagSlug, searchQuery]);

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

      const data = (await res.json()) as { items: ImageType[]; nextCursor: string | null };
      setItems((prev) => [...prev, ...data.items]);
      setNextCursor(data.nextCursor);
    } catch {
      // Silently fail — user can scroll back up and retry
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, nextCursor, sort, tagSlug, searchQuery]);

  // Infinite scroll via IntersectionObserver
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
      <div className="flex flex-col items-center gap-2 py-24 text-center text-neutral-400">
        <p className="text-lg font-medium text-neutral-600">No prompts found</p>
        <p className="text-sm">Try a different search or filter</p>
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
            priority={index < 8}
            onOpen={setActiveLightbox}
            animationDelay={Math.min(index * STAGGER_MS, MAX_STAGGER_DELAY)}
          />
        ))}

        {/* Loading skeletons */}
        {isLoading &&
          Array.from({ length: 4 }).map((_, i) => (
            <div key={`sk-${i}`} className="mb-4 break-inside-avoid">
              <SkeletonCard aspectRatio={[1.1, 0.85, 1.3, 0.95][i] ?? 1.1} />
            </div>
          ))}
      </div>

      {/* Infinite scroll sentinel */}
      <div ref={sentinelRef} className="h-1" aria-hidden="true" />

      {/* Lightbox */}
      {activeLightbox && (
        <Lightbox
          image={activeLightbox}
          onClose={() => setActiveLightbox(null)}
        />
      )}
    </>
  );
}
