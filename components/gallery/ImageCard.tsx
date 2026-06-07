"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Image from "next/image";
import { CopyIcon, CheckIcon, HeartIcon } from "@/components/icons";
import { cn } from "@/lib/utils/cn";
import { TIMING } from "@/lib/constants/timing";
import type { Image as ImageType } from "@/lib/db/schema";
import { useModelLabel } from "@/lib/hooks/useModels";

interface ImageCardProps {
  image: ImageType;
  likeCount?: number;
  priority?: boolean;
  onOpen?: (image: ImageType) => void;
  onLike?: (id: string, delta?: number) => void;
  animationDelay?: number;
}

export function ImageCard({
  image,
  likeCount = 0,
  priority = false,
  onOpen,
  onLike,
  animationDelay = 0,
}: ImageCardProps) {
  const [copied, setCopied] = useState(false);
  const [optimisticLikes, setOptimisticLikes] = useState(likeCount);
  const [hasLiked, setHasLiked] = useState(false);

  useEffect(() => {
    setOptimisticLikes(likeCount);
    if (localStorage.getItem(`liked:${image.id}`) === "1") {
      setHasLiked(true);
    } else {
      setHasLiked(false);
    }
  }, [image.id, likeCount]);

  const modelLabel = useModelLabel(image.model);

  const handleCardClick = useCallback(
    (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).closest("[data-action]")) return;

      // On mobile/touch: click directly opens lightbox, avoiding confusing double tap flip
      onOpen?.(image);
    },
    [image, onOpen],
  );

  const handleCopyPrompt = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      await navigator.clipboard.writeText(image.prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), TIMING.TOAST_RESET_MS);
    },
    [image.prompt],
  );

  const handleLike = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      if (hasLiked) return;

      setHasLiked(true);
      setOptimisticLikes((n) => n + 1);
      localStorage.setItem(`liked:${image.id}`, "1");
      onLike?.(image.id, 1);

      try {
        const res = await fetch(`/api/like/${image.id}`, { method: "POST" });
        if (!res.ok) {
          setHasLiked(false);
          setOptimisticLikes((n) => n - 1);
          localStorage.removeItem(`liked:${image.id}`);
          onLike?.(image.id, -1);
        }
      } catch {
        setHasLiked(false);
        setOptimisticLikes((n) => n - 1);
        localStorage.removeItem(`liked:${image.id}`);
        onLike?.(image.id, -1);
      }
    },
    [hasLiked, image.id, onLike],
  );

  return (
    <div
      className="mb-6 md:mb-8 break-inside-avoid animate-in"
      style={{ animationDelay: `${animationDelay}ms` }}
    >
      <div
        tabIndex={0}
        role="button"
        aria-label={`View prompt: ${image.prompt.slice(0, 80)}`}
        className="card-tilt group relative overflow-hidden rounded-2xl border border-neutral-200/70 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 bg-white"
        onClick={handleCardClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onOpen?.(image);
          }
        }}
      >
        {/* ── Layer 1: Image (z-10) — scales up 3% on hover ── */}
        <div
          className="relative w-full bg-neutral-100 overflow-hidden"
          style={{ paddingBottom: `${(image.height / image.width) * 100}%` }}
        >
          <Image
            src={image.imageUrl}
            alt={image.prompt.slice(0, 100)}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.03]"
            priority={priority}
            placeholder={(image as ImageType & { blurDataUrl?: string }).blurDataUrl ? "blur" : "empty"}
            blurDataURL={(image as ImageType & { blurDataUrl?: string }).blurDataUrl || undefined}
          />
        </div>

        {/* ── Layer 2: Gradient Overlay (z-20) — fades in on hover/focus-within ── */}
        <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/90 via-black/55 to-transparent p-4 pt-16 opacity-0 transition-opacity duration-200 ease-out group-hover:opacity-100 group-focus-within:opacity-100">
          {/* Prompt text — 3 lines max, soft fade mask at bottom */}
          <p className="mb-3 font-sans text-[12px] leading-[1.55] text-white line-clamp-3 [mask-image:linear-gradient(to_bottom,white_60%,transparent_100%)]">
            {image.prompt}
          </p>
          {/* Footer row: model pill + copy button */}
          <div className="flex items-center gap-2 opacity-0 transition-opacity duration-150 delay-75 group-hover:opacity-100 group-focus-within:opacity-100">
            {image.model && (
              <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] uppercase tracking-[0.1em] text-white/80">
                {modelLabel}
              </span>
            )}
            <button
              data-action="copy"
              tabIndex={-1} /* Focus managed by group-focus-within */
              onClick={handleCopyPrompt}
              className={cn(
                "ml-auto flex items-center gap-1.5 rounded-md bg-white/15 px-3 py-1.5 text-[11px] font-medium text-white transition-all duration-150",
                "hover:bg-white/25 active:scale-[0.94]",
                copied && "scale-[1.04]"
              )}
            >
              {copied ? <CheckIcon size={12} /> : <CopyIcon size={12} />}
              {copied ? "Copied" : "Copy prompt"}
            </button>
          </div>
        </div>

        {/* ── Layer 3: Like pill (z-30) — always visible ── */}
        <button
          data-action="like"
          onClick={handleLike}
          aria-label={hasLiked ? "Liked" : "Like this prompt"}
          className={cn(
            "absolute top-3 right-3 z-30",
            "flex items-center gap-1.5 rounded-full px-2.5 py-1",
            "text-[11px] font-medium backdrop-blur-sm",
            "transition-all duration-200 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100",
            hasLiked
              ? "bg-[#FDEBEC] text-[#9F2F2D]"
              : "bg-black/30 text-white hover:bg-[#FDEBEC] hover:text-[#9F2F2D]",
          )}
        >
          <HeartIcon size={12} filled={hasLiked} />
          <span key={optimisticLikes} className="count-animate">{optimisticLikes}</span>
        </button>
      </div>
    </div>
  );
}
