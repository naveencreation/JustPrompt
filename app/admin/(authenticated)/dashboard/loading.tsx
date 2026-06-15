export default function DashboardLoading() {
  return (
    <div className="p-6 max-w-5xl mx-auto w-full">
      <div className="skeleton mb-8 h-7 w-40 rounded" />
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="skeleton h-24 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="skeleton h-40 rounded-xl" />
        <div className="skeleton h-40 rounded-xl" />
      </div>
    </div>
  );
}
