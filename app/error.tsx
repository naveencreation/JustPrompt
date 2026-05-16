"use client";

import { useEffect } from "react";
import Link from "next/link";
import { errors } from "@/lib/observability/errors";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    errors.capture(error, { digest: error.digest });
  }, [error]);

  // Per-route error boundary: do NOT render <html>/<body> here — those live
  // in the root layout. Use `app/global-error.tsx` for the catastrophic case.
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-400">
        500
      </p>
      <h1 className="font-serif text-3xl tracking-tight text-neutral-900 sm:text-4xl">
        Something went wrong
      </h1>
      <p className="max-w-sm text-sm leading-relaxed text-neutral-500">
        An unexpected error occurred. Try again, or head back to the gallery.
      </p>
      <div className="mt-2 flex gap-3">
        <button
          onClick={reset}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-neutral-50 transition-[background-color,transform] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-neutral-700 active:scale-[0.98]"
        >
          Try again
        </button>
        <Link
          href="/"
          className="rounded-md border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-600 transition-[background-color,border-color] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:border-neutral-400 hover:bg-neutral-50"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
