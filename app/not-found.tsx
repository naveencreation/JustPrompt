import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-400">
        404
      </p>
      <h1 className="font-serif text-3xl tracking-tight text-neutral-900 sm:text-4xl">
        Page not found
      </h1>
      <p className="max-w-sm text-sm leading-relaxed text-neutral-500">
        The prompt you&apos;re looking for doesn&apos;t exist or was removed.
      </p>
      <Link
        href="/"
        className="mt-2 rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-neutral-50 transition-[background-color,transform] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-neutral-700 active:scale-[0.98]"
      >
        Back to gallery
      </Link>
    </div>
  );
}
