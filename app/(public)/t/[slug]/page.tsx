import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/db/client";
import { imageService } from "@/lib/services/imageService";
import { Navbar } from "@/components/shared/Navbar";
import { GalleryGrid } from "@/components/gallery/GalleryGrid";

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

  const supabase = createAdminClient();
  const { data: tag } = await supabase
    .from("tags")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (!tag) notFound();

  const result = await imageService.listGallery({ tagSlug: slug });

  return (
    <div className="flex min-h-full flex-col">
      <Navbar />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">
        <header className="mb-8">
          <h1 className="text-2xl font-semibold text-neutral-900">
            #{(tag as { name: string }).name}
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
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
