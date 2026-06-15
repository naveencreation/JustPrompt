export default function ManageLoading() {
  return (
    <div className="p-6 max-w-6xl mx-auto w-full">
      <div className="skeleton mb-8 h-7 w-48 rounded" />
      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
        <div className="border-b border-neutral-100 bg-neutral-50 px-4 py-3">
          <div className="skeleton h-3 w-full rounded" />
        </div>
        <div className="divide-y divide-neutral-100">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3">
              <div className="skeleton size-12 rounded-lg shrink-0" />
              <div className="flex-1 flex flex-col gap-1.5">
                <div className="skeleton h-3 w-full rounded" />
                <div className="skeleton h-3 w-2/3 rounded" />
              </div>
              <div className="skeleton h-5 w-20 rounded-full shrink-0" />
              <div className="skeleton h-3 w-24 rounded shrink-0" />
              <div className="skeleton h-7 w-24 rounded shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
