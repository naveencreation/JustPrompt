import { Navbar } from "@/components/shared/Navbar";
import { SkeletonGrid } from "@/components/gallery/SkeletonCard";

export default function GalleryLoading() {
  return (
    <div className="flex min-h-full flex-col">
      <Navbar />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">
        {/* Prompt of the Day skeleton */}
        <div className="mb-10">
          <div className="skeleton h-3 w-32 mb-3 rounded" />
          <div className="skeleton h-64 w-full rounded-2xl" />
        </div>
        {/* Controls skeleton */}
        <div className="mb-6 flex gap-3">
          <div className="skeleton h-10 flex-1 max-w-xl rounded-xl" />
          <div className="skeleton h-10 w-48 rounded-xl" />
        </div>
        {/* Tag pills skeleton */}
        <div className="mb-6 flex gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton h-7 w-20 rounded-full" />
          ))}
        </div>
        <SkeletonGrid />
      </main>
    </div>
  );
}
