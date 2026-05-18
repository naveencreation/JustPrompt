import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { imageService } from "@/lib/services/imageService";
import { tagService } from "@/lib/services/tagService";
import { GalleryGrid } from "@/components/gallery/GalleryGrid";

// Keep in sync with REVALIDATE.TAG_PAGE in lib/constants/cache.ts.
export const revalidate = 300;

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
  const count = result.items.length;

  return (
    <main className="mx-auto w-full max-w-7xl px-4 pb-16 pt-32 sm:px-6 sm:pb-24 sm:pt-36">
      <header className="mb-12 sm:mb-16">
        <span className="mb-5 inline-flex h-7 w-fit items-center gap-2 rounded-full border border-neutral-200 bg-neutral-50 px-3 text-eyebrow font-semibold uppercase text-neutral-500">
          <span className="h-1 w-1 rounded-full bg-ink-500" aria-hidden="true" />
          Tag
        </span>
        <h1 className="font-serif text-display-2 text-neutral-900">
          #{tag.name}
        </h1>
        <p className="mt-3 max-w-xl text-lede text-neutral-500">
          {count > 0
            ? `${count.toLocaleString()} image${count === 1 ? "" : "s"} tagged with this keyword.`
            : "No images tagged with this keyword yet."}
        </p>
      </header>

      <GalleryGrid
        initialItems={result.items}
        initialNextCursor={result.nextCursor}
        tagSlug={slug}
      />
    </main>
  );
}
