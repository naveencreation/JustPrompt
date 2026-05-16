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

  return (
    <html lang="en">
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-center px-4">
          <p className="text-6xl font-bold text-neutral-200">500</p>
          <h1 className="text-xl font-semibold text-neutral-800">Something went wrong</h1>
          <p className="text-sm text-neutral-500">
            We hit an unexpected error. Please try again.
          </p>
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
              Go home
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
