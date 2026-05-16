"use client";

import { useEffect } from "react";
import Link from "next/link";
import { errors } from "@/lib/observability/errors";

export default function PublicError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    errors.capture(error, { segment: "public", digest: error.digest });
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-400">
        Error
      </p>
      <h1 className="font-serif text-3xl tracking-tight text-neutral-900 sm:text-4xl">
        Failed to load the gallery
      </h1>
      <p className="max-w-sm text-sm leading-relaxed text-neutral-500">
        This is likely temporary. Please try again.
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
          Reload
        </Link>
      </div>
    </div>
  );
}
