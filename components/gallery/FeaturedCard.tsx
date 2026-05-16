"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { CopyIcon, HeartIcon, CheckIcon, ExternalLinkIcon } from "@/components/icons";
import { cn } from "@/lib/utils/cn";
import { TIMING } from "@/lib/constants/timing";
import type { Image as ImageType } from "@/lib/db/schema";

interface FeaturedCardProps {
  image: ImageType;
  likeCount?: number;
}

export function FeaturedCard({ image, likeCount = 0 }: FeaturedCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(image.prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), TIMING.TOAST_RESET_MS);
  }, [image.prompt]);

  return (
    <div className="group relative overflow-hidden rounded-md border border-neutral-200 bg-white">
      <div className="flex flex-col gap-0 sm:flex-row">
        {/* Image — kept neutral, no rounded edges that fight the editorial frame */}
        <div className="relative min-h-[220px] w-full bg-neutral-100 sm:min-h-[300px] sm:w-1/2 lg:w-[42%]">
          <Image
            src={image.imageUrl}
            alt={image.prompt.slice(0, 100)}
            fill
            sizes="(max-width: 640px) 100vw, 50vw"
            className="object-cover"
            priority
          />
        </div>

        {/* Editorial prompt panel */}
        <div className="flex flex-1 flex-col justify-between gap-6 p-7 sm:p-9">
          <div>
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-400">
              Full prompt
            </p>
            <p className="font-mono text-[13px] leading-[1.6] text-neutral-700 line-clamp-6">
              {image.prompt}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {image.model && (
              <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-[10px] uppercase tracking-[0.1em] text-neutral-600">
                {image.model}
              </span>
            )}
            <span className="flex items-center gap-1 rounded-full bg-[#FDEBEC] px-2.5 py-1 text-[10px] tracking-[0.05em] text-[#9F2F2D]">
              <HeartIcon size={10} />
              {likeCount}
            </span>

            <div className="ml-auto flex gap-2">
              <button
                onClick={handleCopy}
                className={cn(
                  "flex items-center gap-1.5 rounded-md bg-neutral-900 px-4 py-2",
                  "text-[13px] font-medium text-neutral-50",
                  "transition-[background-color,transform] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]",
                  "hover:bg-neutral-700 active:scale-[0.98]",
                )}
              >
                {copied ? <CheckIcon size={13} /> : <CopyIcon size={13} />}
                {copied ? "Copied" : "Copy prompt"}
              </button>
              <Link
                href={`/p/${image.slug}`}
                aria-label="Open full page"
                className={cn(
                  "flex items-center gap-1.5 rounded-md border border-neutral-200 px-3 py-2",
                  "text-[13px] text-neutral-500",
                  "transition-[border-color,color] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]",
                  "hover:border-neutral-400 hover:text-neutral-900",
                )}
              >
                <ExternalLinkIcon size={13} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
