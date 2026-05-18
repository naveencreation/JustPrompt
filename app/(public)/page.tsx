import type { Metadata } from "next";
import { Suspense } from "react";
import { imageService } from "@/lib/services/imageService";
import { searchService } from "@/lib/services/searchService";
import { adminService } from "@/lib/services/adminService";
import { tagService } from "@/lib/services/tagService";
import { likeService } from "@/lib/services/likeService";
import { statsService } from "@/lib/services/statsService";
import { GalleryGrid } from "@/components/gallery/GalleryGrid";
import { SkeletonGrid } from "@/components/gallery/SkeletonCard";
import { FeaturedCard } from "@/components/gallery/FeaturedCard";
import { GalleryControls } from "@/components/gallery/GalleryControls";
import type { Sort } from "@/lib/db/schema";

// Next.js requires segment config exports to be statically analyzable literals.
// Keep this in sync with REVALIDATE.GALLERY in lib/constants/cache.ts.
export const revalidate = 60;

export const metadata: Metadata = {
  title: "AI Prompt Gallery — Browse AI-generated images and prompts",
  description:
    "A curated archive of AI-generated images paired with the exact prompts that produced them. Copy any prompt to recreate the image instantly.",
};

interface PageProps {
  searchParams: Promise<{ sort?: string; tag?: string; q?: string }>;
}

const KPI_LABELS = ["Prompts", "Tags", "Likes"] as const;

export default async function GalleryPage({ searchParams }: PageProps) {
  const { sort: sortParam, tag, q } = await searchParams;
  const sort: Sort =
    sortParam === "likes" || sortParam === "random" ? sortParam : "new";

  const [galleryResult, settings, popularTags, stats] = await Promise.all([
    q ? searchService.query(q) : imageService.listGallery({ sort, tagSlug: tag }),
    adminService.getSettings(),
    tagService.listPopular(),
    statsService.getPublicStats(),
  ]);

  const featuredImage = settings?.featuredImageId
    ? await imageService.getById(settings.featuredImageId)
    : null;

  const featuredLikeCount = featuredImage
    ? await likeService.getCount(featuredImage.id)
    : 0;

  const kpiValues = [stats.totalImages, stats.totalTags, stats.totalLikes];

  return (
    <main className="mx-auto w-full max-w-7xl px-4 pb-16 pt-32 sm:px-6 sm:pb-24 sm:pt-36">
      {/* ── Editorial hero ───────────────────────────────────────────────────
          Massive serif display, eyebrow tag, lede, then a KPI strip
          delineated by a hairline. Wrapped in `.grain` for the paper texture
          token defined in globals.css. */}
      <section className="grain relative mb-16 sm:mb-24">
        <div className="relative z-10 flex flex-col gap-7 sm:gap-9">
          <span className="inline-flex h-7 w-fit items-center gap-2 rounded-full border border-neutral-200 bg-neutral-50 px-3 text-eyebrow font-semibold uppercase text-neutral-500">
            <span className="h-1 w-1 rounded-full bg-ink-500" aria-hidden="true" />
            AI Prompt Gallery
          </span>

          <h1 className="max-w-4xl font-serif text-display-1 text-neutral-900">
            Prompts, made&nbsp;visible.
          </h1>

          <p className="max-w-xl text-lede text-neutral-500">
            A curated archive of AI-generated images paired with the exact prompts that produced
            them. Browse, search, copy.
          </p>

          <dl
            className="mt-2 flex flex-wrap items-baseline gap-x-10 gap-y-4 border-t border-neutral-200 pt-7 sm:gap-x-14"
            aria-label="Gallery statistics"
          >
            {KPI_LABELS.map((label, index) => (
              <div key={label} className="flex flex-col gap-1">
                <dt className="text-eyebrow font-semibold uppercase text-neutral-400">
                  {label}
                </dt>
                <dd className="font-serif text-3xl tracking-tight text-neutral-900 sm:text-4xl">
                  {(kpiValues[index] ?? 0).toLocaleString()}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {featuredImage && (
        <section className="mb-16 sm:mb-20" aria-label="Prompt of the Day">
          <p className="mb-3 text-eyebrow font-semibold uppercase text-neutral-400">
            Prompt of the Day
          </p>
          <FeaturedCard image={featuredImage} likeCount={featuredLikeCount} />
        </section>
      )}

      <section className="mb-8" aria-label="Gallery filters">
        <GalleryControls
          tags={popularTags}
          activeTag={tag ?? null}
          activeSort={sort}
        />
      </section>

      <Suspense fallback={<SkeletonGrid />}>
        <GalleryGrid
          initialItems={galleryResult.items}
          initialNextCursor={galleryResult.nextCursor}
          sort={sort}
          tagSlug={tag}
          searchQuery={q}
        />
      </Suspense>
    </main>
  );
}
