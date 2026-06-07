import { SkeletonGrid } from "@/components/gallery/SkeletonCard";

export default function GalleryLoading() {
  return (
    <div className="flex min-h-full flex-col w-full">
      <main className="w-full flex-1 px-4 py-8 md:px-8 md:py-12">
        {/* Prompt of the Day skeleton */}
        <div className="mb-12">
          <div className="skeleton h-3 w-32 mb-3 rounded" />
          <div className="skeleton h-[400px] w-full rounded-2xl" />
        </div>
        
        {/* AdSlot skeleton */}
        <div className="mb-12 w-full flex justify-center">
          <div className="skeleton h-[90px] w-full max-w-[728px] rounded-lg" />
        </div>

        <SkeletonGrid />
      </main>
    </div>
  );
}
