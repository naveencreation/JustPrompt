import type { Metadata } from "next";
import { Suspense } from "react";
import { imageService } from "@/lib/services/imageService";
import { adminService } from "@/lib/services/adminService";
import { tagRepo } from "@/lib/repos/tagRepo";
import { likeService } from "@/lib/services/likeService";
import { Navbar } from "@/components/shared/Navbar";
import { GalleryGrid } from "@/components/gallery/GalleryGrid";
import { SkeletonGrid } from "@/components/gallery/SkeletonCard";
import { FeaturedCard } from "@/components/gallery/FeaturedCard";
import { GalleryControls } from "@/components/gallery/GalleryControls";
import type { Sort } from "@/lib/db/schema";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "AI Prompt Gallery — Browse AI-generated images and prompts",
  description:
    "Discover thousands of AI-generated images with the exact prompts used to create them. Copy any prompt and recreate it instantly.",
};

interface PageProps {
  searchParams: Promise<{ sort?: string; tag?: string }>;
}

export default async function GalleryPage({ searchParams }: PageProps) {
  const { sort: sortParam, tag } = await searchParams;
  const sort: Sort =
    sortParam === "likes" || sortParam === "random" ? sortParam : "new";

  const [galleryResult, settings, popularTags] = await Promise.all([
    imageService.listGallery({ sort, tagSlug: tag }),
    adminService.getSettings(),
    tagRepo.popular(16),
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
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">
        {/* Prompt of the day */}
        {featuredImage && (
          <section className="mb-10" aria-label="Prompt of the Day">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-neutral-400">
              Prompt of the Day
            </p>
            <FeaturedCard image={featuredImage} likeCount={featuredLikeCount} />
          </section>
        )}

        {/* Controls */}
        <section className="mb-6" aria-label="Gallery filters">
          <GalleryControls
            tags={popularTags}
            activeTag={tag ?? null}
            activeSort={sort}
          />
        </section>

        {/* Gallery */}
        <Suspense fallback={<SkeletonGrid />}>
          <GalleryGrid
            initialItems={galleryResult.items}
            initialNextCursor={galleryResult.nextCursor}
            sort={sort}
            tagSlug={tag}
          />
        </Suspense>
      </main>
    </div>
  );
}
