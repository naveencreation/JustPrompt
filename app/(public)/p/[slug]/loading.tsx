export default function ImagePageLoading() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-32 sm:px-6 sm:pb-24 sm:pt-36">
      <div className="mb-3 h-3 w-16">
        <div className="skeleton h-full w-full" />
      </div>
      <div className="grid gap-10 lg:grid-cols-[1fr_380px]">
        <div
          className="skeleton w-full rounded-md"
          style={{ aspectRatio: "4/3", maxHeight: "70vh" }}
        />
        <aside className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className={`skeleton h-3 ${i === 4 ? "w-2/3" : "w-full"}`}
              />
            ))}
          </div>
          <div className="flex gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="skeleton h-7 w-20 rounded-full" />
            ))}
          </div>
          <div className="skeleton h-32 w-full rounded-md" />
        </aside>
      </div>
    </main>
  );
}
