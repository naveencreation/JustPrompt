"use client";

import { useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { X, Copy, Heart, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { Image as ImageType } from "@/lib/db/schema";

interface LightboxProps {
  image: ImageType;
  likeCount?: number;
  onClose: () => void;
}

export function Lightbox({ image, likeCount = 0, onClose }: LightboxProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  // Focus trap and keyboard handling
  useEffect(() => {
    closeRef.current?.focus();
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(image.prompt);
  }, [image.prompt]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label="Image preview"
    >
      <div className="relative flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-neutral-900 shadow-2xl lg:flex-row animate-in">
        {/* Image panel */}
        <div className="relative flex-1 min-h-[40vh] bg-neutral-950">
          <Image
            src={image.imageUrl}
            alt={image.prompt.slice(0, 100)}
            fill
            sizes="(max-width: 1024px) 100vw, 60vw"
            className="object-contain"
            priority
          />
        </div>

        {/* Prompt panel */}
        <div className="flex w-full flex-col gap-4 p-6 text-white lg:w-80 lg:border-l lg:border-neutral-700 overflow-y-auto">
          <div className="flex items-start justify-between gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">
              Prompt
            </h2>
            <button
              ref={closeRef}
              onClick={onClose}
              aria-label="Close lightbox"
              className="rounded-full p-1 text-neutral-400 hover:bg-neutral-700 hover:text-white transition-colors"
            >
              <X className="size-4" />
            </button>
          </div>

          <p className="flex-1 font-mono text-sm leading-relaxed text-neutral-100">
            {image.prompt}
          </p>

          {image.description && (
            <p className="text-sm text-neutral-400 leading-relaxed">{image.description}</p>
          )}

          <div className="flex flex-wrap gap-2 text-xs">
            {image.model && (
              <span className="rounded-full bg-neutral-700 px-2.5 py-1 text-neutral-300">
                {image.model}
              </span>
            )}
            <span className="rounded-full bg-neutral-700 px-2.5 py-1 text-neutral-300 flex items-center gap-1">
              <Heart className="size-3" />
              {likeCount}
            </span>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleCopy}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-100 transition-colors"
            >
              <Copy className="size-4" />
              Copy prompt
            </button>
            <a
              href={`/p/${image.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "flex items-center justify-center rounded-lg border border-neutral-600 px-3 py-2",
                "text-sm text-neutral-300 hover:border-neutral-400 hover:text-white transition-colors",
              )}
              aria-label="Open full page"
            >
              <ExternalLink className="size-4" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
