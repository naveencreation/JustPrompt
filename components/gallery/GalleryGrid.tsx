"use client";

import { useState, useCallback, useEffect, useRef, Fragment } from "react";
import Link from "next/link";
import { ImageCard } from "./ImageCard";
import { SkeletonCard } from "./SkeletonCard";
import { Lightbox } from "./Lightbox";
import { AdSlot } from "@/components/shared/AdSlot";
import { config } from "@/lib/config";

import type { Image as ImageType, Sort, Tag } from "@/lib/db/schema";

interface GalleryGridProps {
  initialItems: ImageType[];
  initialNextCursor: string | null;
  initialLikeCounts?: Record<string, number>;
  sort?: Sort;
  tagSlug?: string;
  searchQuery?: string;
  popularTags?: Tag[];
}

const PRIORITY_IMAGE_COUNT = 8;
const SKELETON_RATIOS = [1.1, 0.85, 1.3, 0.95];

export function GalleryGrid({
  initialItems,
  initialNextCursor,
  initialLikeCounts = {},
  sort = "new",
  tagSlug,
  searchQuery,
  popularTags,
}: GalleryGridProps) {
  const [items, setItems] = useState<ImageType[]>(initialItems);
  const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor);
  const [isLoading, setIsLoading] = useState(false);
  const [activeLightbox, setActiveLightbox] = useState<ImageType | null>(null);
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>(initialLikeCounts);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const handleLikeUpdate = useCallback((id: string, delta: number = 1) => {
    setLikeCounts((prev) => ({
      ...prev,
      [id]: (prev[id] ?? 0) + delta,
    }));
  }, []);

  const [prevInitialItems, setPrevInitialItems] = useState(initialItems);

  useEffect(() => {
    if (activeLightbox) {
      previousFocusRef.current = document.activeElement as HTMLElement;
    } else if (previousFocusRef.current) {
      previousFocusRef.current.focus();
      previousFocusRef.current = null;
    }
  }, [activeLightbox]);

  if (initialItems !== prevInitialItems) {
    setItems(initialItems);
    setNextCursor(initialNextCursor);
    setLikeCounts(initialLikeCounts);
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

      const json = (await res.json()) as {
        items: ImageType[];
        nextCursor: string | null;
        likeCounts?: Record<string, number>;
      };
      setItems((prev) => [...prev, ...json.items]);
      setNextCursor(json.nextCursor);
      if (json.likeCounts) {
        setLikeCounts((prev) => ({ ...prev, ...json.likeCounts }));
      }
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
      <div className="flex flex-col items-center gap-4 py-32 text-center">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-300">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
          <path d="M11 8v6M8 11h6" className="text-neutral-200" />
        </svg>
        <p className="font-serif text-2xl tracking-tight text-neutral-700">
          No prompts found
        </p>
        <p className="text-sm text-neutral-400 mb-2">Try a different search or filter</p>
        
        <Link href="/" className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-neutral-800">
          Clear filters
        </Link>

        {popularTags && popularTags.length > 0 && (
          <div className="mt-6 flex flex-col items-center gap-3">
            <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-neutral-400">Popular tags</span>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {popularTags.slice(0, 3).map(t => (
                <Link key={t.id} href={`/?tag=${t.slug}`} className="rounded-full bg-neutral-100 px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.05em] text-neutral-600 transition-colors hover:bg-neutral-200 hover:text-neutral-900">
                  {t.name}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <div className={`columns-1 gap-6 sm:columns-2 md:columns-2 lg:columns-3 xl:columns-3 2xl:columns-4 sm:gap-8 md:gap-10 transition-[filter] duration-200 ${activeLightbox ? "pointer-events-none brightness-75" : ""}`}>
        {items.map((image, index) => (
          <Fragment key={image.id}>
            {index > 0 && index % 12 === 0 && (
              <div className="mb-4 break-inside-avoid">
                <AdSlot slotId={config.adsenseSlots.galleryInfeed} format="fluid" minHeight={280} />
              </div>
            )}
            <ImageCard
              image={image}
              likeCount={likeCounts[image.id] ?? 0}
              priority={index < PRIORITY_IMAGE_COUNT}
              onOpen={setActiveLightbox}
              onLike={handleLikeUpdate}
              animationDelay={(index % 12) * 50}
            />
          </Fragment>
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
          likeCount={likeCounts[activeLightbox.id] ?? 0}
          onClose={() => setActiveLightbox(null)}
          onLike={handleLikeUpdate}
        />
      )}
    </>
  );
}
