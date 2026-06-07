import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { tagService } from "@/lib/services/tagService";

export const revalidate = 60; // Cache this page for 60 seconds

export const metadata: Metadata = {
  title: "Explore Categories — AI Prompt Gallery",
  description: "Browse AI-generated images and prompts by category.",
};

export default async function ExplorePage() {
  // Fetch up to 50 popular tags, each with a preview image URL
  const tagsWithPreviews = await tagService.listPopularWithPreviews(50);

  return (
    <div className="flex min-h-full flex-col w-full">
      <main className="w-full flex-1 px-4 py-8 md:px-8 md:py-12 max-w-7xl mx-auto">
        <header className="mb-10 text-center md:text-left">
          <h1 className="text-3xl font-serif tracking-tight text-neutral-900 sm:text-4xl">
            Browse by category
          </h1>
          <p className="mt-2 text-neutral-500">
            Explore the most popular prompt themes and visual styles.
          </p>
        </header>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:gap-6">
          {tagsWithPreviews.map((tag) => (
            <Link
              key={tag.id}
              href={`/t/${tag.slug}`}
              className="group relative flex aspect-[4/3] w-full flex-col items-center justify-center overflow-hidden rounded-2xl bg-neutral-100 transition-transform duration-300 hover:scale-[1.02]"
            >
              {tag.previewUrl && (
                <>
                  <Image
                    src={tag.previewUrl}
                    alt={`${tag.name} category preview`}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-110"
                    sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
                  />
                  {/* Subtle dark gradient to ensure text readability */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-black/10 transition-opacity duration-300 group-hover:opacity-90" />
                </>
              )}

              {/* Text Overlay */}
              <div className="relative z-10 flex flex-col items-center justify-center p-4 text-center">
                <h2 className="text-lg font-bold text-white tracking-tight drop-shadow-md sm:text-xl">
                  {tag.name}
                </h2>
                <p className="mt-1 text-xs font-medium text-white/80 drop-shadow">
                  {tag.count} {tag.count === 1 ? "prompt" : "prompts"}
                </p>
              </div>
            </Link>
          ))}
        </div>

        {tagsWithPreviews.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-neutral-500">No categories found.</p>
          </div>
        )}
      </main>
    </div>
  );
}
