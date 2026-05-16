import { Navbar } from "@/components/shared/Navbar";

export default function ImagePageLoading() {
  return (
    <div className="flex min-h-full flex-col">
      <Navbar />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-[1fr_380px]">
          <div className="skeleton w-full rounded-2xl" style={{ aspectRatio: "4/3", maxHeight: "70vh" }} />
          <aside className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className={`skeleton h-3 rounded ${i === 4 ? "w-2/3" : "w-full"}`} />
              ))}
            </div>
            <div className="flex gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="skeleton h-7 w-20 rounded-full" />
              ))}
            </div>
            <div className="skeleton h-32 w-full rounded-xl" />
          </aside>
        </div>
      </main>
    </div>
  );
}
