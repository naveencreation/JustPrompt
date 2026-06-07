import type { Metadata } from "next";
import { Suspense } from "react";
import { imageService } from "@/lib/services/imageService";
import { searchService } from "@/lib/services/searchService";
import { adminService } from "@/lib/services/adminService";
import { tagService } from "@/lib/services/tagService";
import { likeService } from "@/lib/services/likeService";
import { GalleryGrid } from "@/components/gallery/GalleryGrid";
import { SkeletonGrid } from "@/components/gallery/SkeletonCard";
import { FeaturedCard } from "@/components/gallery/FeaturedCard";
import { AdSlot } from "@/components/shared/AdSlot";
import { config } from "@/lib/config";
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

export default async function GalleryPage({ searchParams }: PageProps) {
  const { sort: sortParam, tag, q } = await searchParams;
  const sort: Sort =
    sortParam === "likes" || sortParam === "random" ? sortParam : "new";

  const [galleryResult, settings, popularTags] = await Promise.all([
    q ? searchService.query(q) : imageService.listGallery({ sort, tagSlug: tag }),
    adminService.getSettings(),
    tagService.listPopular(),
  ]);

  const initialLikeCounts = await likeService.getBatch(galleryResult.items.map((img) => img.id));

  const featuredImage = settings?.featuredImageId
    ? await imageService.getById(settings.featuredImageId)
    : null;

  const featuredLikeCount = featuredImage
    ? await likeService.getCount(featuredImage.id)
    : 0;

  return (
    <div className="flex min-h-full flex-col w-full">
      <main className="w-full flex-1 px-4 py-8 md:px-8 md:py-12">

        {featuredImage && (
          <section className="mb-12" aria-label="Prompt of the Day">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-500">
              Prompt of the Day
            </p>
            <FeaturedCard image={featuredImage} likeCount={featuredLikeCount} />
          </section>
        )}

        <AdSlot slotId={config.adsenseSlots.galleryBanner} minHeight={90} className="mb-12" />

        <Suspense fallback={<SkeletonGrid />}>
          <GalleryGrid
            initialItems={galleryResult.items}
            initialNextCursor={galleryResult.nextCursor}
            initialLikeCounts={initialLikeCounts}
            sort={sort}
            tagSlug={tag}
            searchQuery={q}
            popularTags={popularTags}
          />
        </Suspense>
      </main>
    </div>
  );
}
