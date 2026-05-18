import { SkeletonGrid } from "@/components/gallery/SkeletonCard";

export default function GalleryLoading() {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 pb-16 pt-32 sm:px-6 sm:pb-24 sm:pt-36">
      {/* Hero skeleton */}
      <div className="mb-16 flex flex-col gap-6 sm:mb-24 sm:gap-8">
        <div className="skeleton h-7 w-44" />
        <div className="skeleton h-16 w-3/4 max-w-3xl rounded-md sm:h-24" />
        <div className="skeleton h-4 w-2/3 max-w-xl" />
        <div className="flex flex-wrap gap-x-14 gap-y-4 border-t border-neutral-200 pt-7">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-2">
              <div className="skeleton h-3 w-16" />
              <div className="skeleton h-8 w-20" />
            </div>
          ))}
        </div>
      </div>

      {/* Featured skeleton */}
      <div className="mb-16">
        <div className="skeleton mb-3 h-3 w-32" />
        <div className="skeleton h-64 w-full rounded-lg" />
      </div>

      {/* Controls skeleton */}
      <div className="mb-6 flex gap-3">
        <div className="skeleton h-10 max-w-xl flex-1 rounded-sm" />
        <div className="skeleton h-10 w-48 rounded-sm" />
      </div>

      {/* Tag pills skeleton */}
      <div className="mb-8 flex gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="skeleton h-7 w-20 rounded-full" />
        ))}
      </div>

      <SkeletonGrid />
    </main>
  );
}
