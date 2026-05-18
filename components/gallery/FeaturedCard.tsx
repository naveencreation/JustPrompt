"use client";

import { useCallback, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpIcon,
  CheckIcon,
  CopyIcon,
  HeartIcon,
} from "@/components/icons";
import { cn } from "@/lib/utils/cn";
import { TIMING } from "@/lib/constants/timing";
import type { Image as ImageType } from "@/lib/db/schema";

interface FeaturedCardProps {
  image: ImageType;
  likeCount?: number;
}

/**
 * Editorial feature card for "Prompt of the Day".
 *
 * Same double-bezel architecture as `ImageCard`, scaled up:
 *   • outer shell at `rounded-2xl` with the hairline ring + soft elevation
 *   • inner core at concentric `calc(2xl - 8px)` with the machined inner edge
 *   • horizontal split: image on the left, editorial prompt panel on the right
 *   • button-in-button "Copy prompt" CTA with magnetic icon-island physics
 */
export function FeaturedCard({ image, likeCount = 0 }: FeaturedCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(image.prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), TIMING.TOAST_RESET_MS);
  }, [image.prompt]);

  return (
    <article className="group/featured">
      {/* ── Outer shell ── */}
      <div
        className={cn(
          "relative rounded-2xl bg-neutral-100/60 p-2 ring-1 ring-neutral-200/80",
          "transition-[transform,box-shadow] duration-700 ease-out-expo",
          "shadow-soft-2 group-hover/featured:shadow-soft-4",
          "group-hover/featured:[transform:translateY(-2px)]",
        )}
      >
        {/* ── Inner core ── */}
        <div
          className={cn(
            "relative grid overflow-hidden bg-white sm:grid-cols-[5fr_4fr]",
            "rounded-[calc(var(--radius-2xl)-8px)]",
            "shadow-[inset_0_0_0_1px_var(--color-neutral-50),inset_0_1px_0_oklch(100%_0_0/0.6)]",
          )}
        >
          {/* Image side */}
          <div className="relative aspect-[4/3] bg-neutral-100 sm:aspect-auto sm:min-h-[420px]">
            <Image
              src={image.imageUrl}
              alt={image.prompt.slice(0, 100)}
              fill
              sizes="(max-width: 640px) 100vw, 55vw"
              className="object-cover transition-transform duration-1000 ease-out-expo group-hover/featured:scale-[1.02]"
              priority
            />
            <span className="absolute left-5 top-5 inline-flex h-7 items-center gap-2 rounded-full bg-white/90 px-3 text-eyebrow font-semibold uppercase text-neutral-700 backdrop-blur-md">
              <span className="h-1 w-1 rounded-full bg-honey-500" aria-hidden="true" />
              Featured today
            </span>
          </div>

          {/* Prompt side */}
          <div className="flex flex-col gap-7 p-7 sm:p-9 lg:p-10">
            <div>
              <p className="mb-4 text-eyebrow font-semibold uppercase text-neutral-400">
                Full prompt
              </p>
              <p className="font-mono text-[15px] leading-[1.55] text-neutral-800 line-clamp-7">
                {image.prompt}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {image.model && (
                <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-eyebrow font-medium uppercase text-neutral-600">
                  {image.model}
                </span>
              )}
              <span className="flex items-center gap-1.5 rounded-full bg-rose-100 px-2.5 py-1 text-eyebrow text-rose-700">
                <HeartIcon size={10} />
                {likeCount.toLocaleString()}
              </span>
            </div>

            <div className="mt-auto flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleCopy}
                aria-label="Copy prompt to clipboard"
                className={cn(
                  "group/cta flex items-center gap-2 rounded-full bg-neutral-900 py-1.5 pl-4 pr-1.5 text-[13px] font-medium text-neutral-50",
                  "transition-[background-color,transform] duration-200 ease-out-quart",
                  "hocus:bg-neutral-700 active:scale-[0.98]",
                )}
              >
                <span>{copied ? "Copied" : "Copy prompt"}</span>
                <span
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full bg-white/12 text-neutral-50",
                    "transition-transform duration-300 ease-out-expo",
                    "group-hover/cta:translate-x-0.5 group-hover/cta:-translate-y-px group-hover/cta:scale-105",
                  )}
                >
                  {copied ? <CheckIcon size={13} /> : <CopyIcon size={13} />}
                </span>
              </button>

              <Link
                href={`/p/${image.slug}`}
                aria-label="Open full page"
                className={cn(
                  "group/link flex items-center gap-2 rounded-full border border-neutral-200 bg-white py-1.5 pl-4 pr-1.5 text-[13px] font-medium text-neutral-600",
                  "transition-[border-color,color] duration-200 ease-out-quart",
                  "hocus:border-neutral-400 hocus:text-neutral-900",
                )}
              >
                <span>Open page</span>
                <span
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full bg-neutral-100 text-neutral-700",
                    "transition-transform duration-300 ease-out-expo",
                    "group-hover/link:translate-x-0.5 group-hover/link:-translate-y-px",
                  )}
                >
                  <ArrowUpIcon size={12} className="rotate-45" />
                </span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
