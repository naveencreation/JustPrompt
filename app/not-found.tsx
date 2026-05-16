import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-center px-4">
      <p className="text-6xl font-bold text-neutral-200">404</p>
      <h1 className="text-xl font-semibold text-neutral-800">Page not found</h1>
      <p className="text-sm text-neutral-500">
        The prompt you&apos;re looking for doesn&apos;t exist or was removed.
      </p>
      <Link
        href="/"
        className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 transition-colors"
      >
        Back to gallery
      </Link>
    </div>
  );
}
