export const metadata = {
  title: "Under maintenance — AI Prompt Gallery",
  robots: { index: false, follow: false },
};

export default function MaintenancePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-neutral-50 px-4 text-center">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-400">
        Status
      </p>
      <h1 className="font-serif text-3xl tracking-tight text-neutral-900 sm:text-4xl">
        Under maintenance
      </h1>
      <p className="max-w-sm text-sm leading-relaxed text-neutral-500">
        The gallery is temporarily offline while we ship a small update. Check back in a few
        minutes.
      </p>
      <span className="mt-2 inline-flex h-px w-12 bg-neutral-300" aria-hidden="true" />
    </div>
  );
}
