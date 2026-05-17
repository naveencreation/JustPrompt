import type { Metadata } from "next";
import { Suspense } from "react";
import { imageService } from "@/lib/services/imageService";
import { searchService } from "@/lib/services/searchService";
import { adminService } from "@/lib/services/adminService";
import { tagService } from "@/lib/services/tagService";
import { likeService } from "@/lib/services/likeService";
import { Navbar } from "@/components/shared/Navbar";
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

export default async function GalleryPage({ searchParams }: PageProps) {
  const { sort: sortParam, tag, q } = await searchParams;
  const sort: Sort =
    sortParam === "likes" || sortParam === "random" ? sortParam : "new";

  const [galleryResult, settings, popularTags] = await Promise.all([
    q ? searchService.query(q) : imageService.listGallery({ sort, tagSlug: tag }),
    adminService.getSettings(),
    tagService.listPopular(),
  ]);

  const featuredImage = settings?.featuredImageId
    ? await imageService.getById(settings.featuredImageId)
    : null;

  const featuredLikeCount = featuredImage
    ? await likeService.getCount(featuredImage.id)
    : 0;

  return (
    <div className="flex min-h-full flex-col">
      <Navbar />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-12 sm:px-6 sm:py-16">
        {/* Editorial intro — once per session, sets tone */}
        <header className="mb-12 sm:mb-16">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-400">
            AI Prompt Gallery
          </p>
          <h1 className="font-serif text-4xl text-neutral-900 sm:text-5xl">
            Prompts, made&nbsp;visible.
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-neutral-500">
            A curated archive of AI-generated images paired with the exact prompts that produced
            them. Browse, search, copy.
          </p>
        </header>

        {featuredImage && (
          <section className="mb-12" aria-label="Prompt of the Day">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-400">
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
    </div>
  );
}
