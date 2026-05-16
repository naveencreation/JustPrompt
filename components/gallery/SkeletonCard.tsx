export function SkeletonCard({ aspectRatio = 1.2 }: { aspectRatio?: number }) {
  return (
    <div
      className="skeleton w-full rounded-xl overflow-hidden"
      style={{ paddingBottom: `${(1 / aspectRatio) * 100}%`, position: "relative" }}
      aria-hidden="true"
    />
  );
}

export function SkeletonGrid() {
  const ratios = [1.1, 0.8, 1.4, 1.0, 1.3, 0.9, 1.2, 1.5, 0.85, 1.1, 0.95, 1.3];
  return (
    <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 xl:columns-4">
      {ratios.map((ratio, index) => (
        <div key={index} className="mb-4 break-inside-avoid">
          <SkeletonCard aspectRatio={ratio} />
        </div>
      ))}
    </div>
  );
}
