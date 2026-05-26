"use client";

import { useEffect, useRef } from "react";
import { config } from "@/lib/config";
import { cn } from "@/lib/utils/cn";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

interface AdSlotProps {
  slotId: string | undefined;
  format?: "auto" | "fluid";
  minHeight?: number;
  className?: string;
}

export function AdSlot({
  slotId,
  format = "auto",
  minHeight = 90,
  className,
}: AdSlotProps) {
  const initialized = useRef(false);
  const client = config.adsenseClient;

  useEffect(() => {
    if (!client || !slotId) return;
    
    // Prevent double-pushing for this component instance
    if (initialized.current) return;
    initialized.current = true;

    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (err) {
      // Catch errors silently (e.g. ad blockers blocking the script load)
      console.warn("AdSense push failed:", err);
    }
  }, [client, slotId]);

  // Render absolutely nothing if not configured (env vars not set)
  if (!client || !slotId) {
    return null;
  }

  return (
    <div
      className={cn(
        "w-full my-6 flex flex-col items-center justify-center overflow-hidden",
        className
      )}
      aria-label="Advertisement"
    >
      <span className="text-[9px] uppercase tracking-widest text-neutral-400 dark:text-neutral-500 mb-2 select-none font-medium">
        Advertisement
      </span>
      <div
        className="w-full flex items-center justify-center bg-neutral-50 dark:bg-neutral-900/40 border border-neutral-100 dark:border-neutral-800/50 rounded-xl overflow-hidden"
        style={{ minHeight: `${minHeight}px` }}
      >
        <ins
          className="adsbygoogle"
          style={{ display: "block", width: "100%", height: "100%" }}
          data-ad-client={client}
          data-ad-slot={slotId}
          data-ad-format={format}
          {...(format === "fluid"
            ? { "data-ad-layout": "in-article" }
            : { "data-full-width-responsive": "true" })}
        />
      </div>
    </div>
  );
}
