export const metadata = {
  title: "Under Maintenance | AI Prompt Gallery",
  robots: { index: false, follow: false },
};

export default function MaintenancePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-neutral-50 px-4 text-center">
      <div className="flex flex-col items-center gap-4">
        <div className="text-5xl">🛠️</div>
        <h1 className="text-2xl font-semibold text-neutral-900">
          We&apos;re doing some maintenance
        </h1>
        <p className="max-w-sm text-sm leading-relaxed text-neutral-500">
          The gallery is temporarily offline for maintenance. We&apos;ll be back shortly — check
          back in a few minutes.
        </p>
      </div>
    </div>
  );
}
