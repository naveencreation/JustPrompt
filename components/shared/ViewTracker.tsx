"use client";

import { useEffect } from "react";

interface ViewTrackerProps {
  imageId: string;
}

/**
 * Invisible component that fires a view metric event on mount.
 * Must be a Client Component so it runs in the browser (not during SSR),
 * preventing false counts from server renders, preloading, and crawlers.
 */
export function ViewTracker({ imageId }: ViewTrackerProps) {
  useEffect(() => {
    fetch(`/api/metrics/view/${imageId}`, { method: "POST" }).catch(() => {});
  }, [imageId]);

  return null;
}
