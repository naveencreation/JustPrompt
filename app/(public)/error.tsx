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
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-center px-4">
      <p className="text-5xl font-bold text-neutral-200">Oops</p>
      <h1 className="text-xl font-semibold text-neutral-800">Failed to load the gallery</h1>
      <p className="text-sm text-neutral-500">This is likely temporary. Please try again.</p>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 transition-colors"
        >
          Try again
        </button>
        <Link
          href="/"
          className="rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-50 transition-colors"
        >
          Reload page
        </Link>
      </div>
    </div>
  );
}
