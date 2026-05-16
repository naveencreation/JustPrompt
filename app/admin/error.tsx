"use client";

import { useEffect } from "react";
import Link from "next/link";
import { errors } from "@/lib/observability/errors";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    errors.capture(error, { segment: "admin", digest: error.digest });
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-center px-4">
      <p className="text-5xl font-bold text-neutral-200">Error</p>
      <h1 className="text-xl font-semibold text-neutral-800">Something broke in the admin panel</h1>
      <p className="text-sm text-neutral-500 max-w-xs">
        {process.env["NODE_ENV"] === "development" ? error.message : "An unexpected error occurred."}
      </p>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 transition-colors"
        >
          Try again
        </button>
        <Link
          href="/admin/dashboard"
          className="rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-50 transition-colors"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
