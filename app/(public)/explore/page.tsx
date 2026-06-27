import type { Metadata } from "next";
import { tagService } from "@/lib/services/tagService";
import { TagGrid } from "@/components/gallery/TagGrid";

export const revalidate = 60; // Cache this page for 60 seconds

export const metadata: Metadata = {
  title: "Explore Categories — AI Prompt Gallery",
  description: "Browse AI-generated images and prompts by category.",
};

export default async function ExplorePage() {
  const tagsWithPreviews = await tagService.listPopularWithPreviews(50);

  return (
    <div className="flex min-h-full flex-col w-full">
      <main className="w-full flex-1 px-4 py-8 md:px-8 md:py-12 max-w-7xl mx-auto">
        <header className="mb-10 text-center md:text-left">
          <h1 className="text-3xl font-serif tracking-tight text-neutral-900 sm:text-4xl">
            Browse by category
          </h1>
          <p className="mt-2 font-serif text-xl text-neutral-500 sm:text-2xl">
            Explore the most popular prompt themes and visual styles.
          </p>
        </header>

        <TagGrid tags={tagsWithPreviews} />
      </main>
    </div>
  );
}
