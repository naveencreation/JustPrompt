/**
 * Masonry-friendly placeholder that mirrors the double-bezel architecture of
 * the real `ImageCard` so the layout feels stable as content streams in.
 */
export function SkeletonCard({ aspectRatio = 1.2 }: { aspectRatio?: number }) {
  return (
    <div className="mb-4 break-inside-avoid">
      <div className="rounded-xl bg-neutral-100/60 p-1.5 ring-1 ring-neutral-200/60">
        <div
          className="skeleton w-full"
          style={{
            paddingBottom: `${(1 / aspectRatio) * 100}%`,
            position: "relative",
            borderRadius: "calc(var(--radius-xl) - 6px)",
          }}
          aria-hidden="true"
        />
      </div>
    </div>
  );
}

export function SkeletonGrid() {
  const ratios = [1.1, 0.8, 1.4, 1.0, 1.3, 0.9, 1.2, 1.5, 0.85, 1.1, 0.95, 1.3];
  return (
    <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 xl:columns-4">
      {ratios.map((ratio, index) => (
        <SkeletonCard key={index} aspectRatio={ratio} />
      ))}
    </div>
  );
}
