import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { imageService } from "@/lib/services/imageService";
import { tagService } from "@/lib/services/tagService";
import { Navbar } from "@/components/shared/Navbar";
import { GalleryGrid } from "@/components/gallery/GalleryGrid";
import { REVALIDATE } from "@/lib/constants/cache";

export const revalidate = REVALIDATE.TAG_PAGE;

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: `#${slug} prompts`,
    description: `AI-generated images tagged with #${slug}. Browse and copy the exact prompts used.`,
  };
}

export default async function TagPage({ params }: PageProps) {
  const { slug } = await params;
  const tag = await tagService.findBySlug(slug);
  if (!tag) notFound();

  const result = await imageService.listGallery({ tagSlug: slug });

  return (
    <div className="flex min-h-full flex-col">
      <Navbar />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">
        <header className="mb-8">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-400">
            Tag
          </p>
          <h1 className="font-serif text-3xl tracking-tight text-neutral-900">
            #{tag.name}
          </h1>
          <p className="mt-2 text-sm text-neutral-500">
            AI-generated images tagged with this keyword
          </p>
        </header>

        <GalleryGrid
          initialItems={result.items}
          initialNextCursor={result.nextCursor}
          tagSlug={slug}
        />
      </main>
    </div>
  );
}
