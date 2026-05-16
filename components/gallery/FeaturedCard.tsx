"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { Copy, Heart, Check, ExternalLink } from "lucide-react";
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
    setTimeout(() => setCopied(false), 2000);
  }, [image.prompt]);

  return (
    <div className="group relative overflow-hidden rounded-2xl bg-neutral-900 text-white shadow-lg">
      <div className="flex flex-col sm:flex-row gap-0">
        {/* Image */}
        <div className="relative min-h-[220px] sm:min-h-[280px] w-full sm:w-1/2 lg:w-2/5 bg-neutral-950">
          <Image
            src={image.imageUrl}
            alt={image.prompt.slice(0, 100)}
            fill
            sizes="(max-width: 640px) 100vw, 50vw"
            className="object-cover"
            priority
          />
        </div>

        {/* Prompt */}
        <div className="flex flex-1 flex-col justify-between gap-4 p-6">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-neutral-400">
              Full Prompt
            </p>
            <p className="font-mono text-sm leading-relaxed text-neutral-100 line-clamp-5">
              {image.prompt}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {image.model && (
              <span className="rounded-full bg-neutral-700 px-2.5 py-1 text-xs text-neutral-300">
                {image.model}
              </span>
            )}
            <span className="flex items-center gap-1 rounded-full bg-neutral-700 px-2.5 py-1 text-xs text-neutral-300">
              <Heart className="size-3" />
              {likeCount}
            </span>

            <div className="ml-auto flex gap-2">
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 rounded-lg bg-white px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-100 transition-colors"
              >
                {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                {copied ? "Copied!" : "Copy prompt"}
              </button>
              <Link
                href={`/p/${image.slug}`}
                className="flex items-center gap-1.5 rounded-lg border border-neutral-600 px-3 py-2 text-sm text-neutral-300 hover:border-neutral-400 hover:text-white transition-colors"
              >
                <ExternalLink className="size-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
