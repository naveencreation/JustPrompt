"use client";

import { useCallback, useState } from "react";
import Image from "next/image";
import { CopyIcon, CheckIcon, HeartIcon } from "@/components/icons";
import { cn } from "@/lib/utils/cn";
import { TIMING } from "@/lib/constants/timing";
import type { Image as ImageType } from "@/lib/db/schema";

interface ImageCardProps {
  image: ImageType;
  likeCount?: number;
  priority?: boolean;
  onOpen?: (image: ImageType) => void;
  animationDelay?: number;
}

const LIKE_BUMP_MS = 400;

/**
 * Editorial double-bezel image card.
 *
 * Architecture:
 *   • Outer shell  (`.rounded-xl bg-neutral-100/60 ring-1 ring-neutral-200/80 p-1.5`)
 *     — paper-tinted tray with a hairline edge.
 *   • Inner core   (`.rounded-[calc(var(--radius-xl)-6px)]`)
 *     — concentric radius, machined inner highlight via inset shadow.
 *
 * Interaction:
 *   • On hover the prompt **veil** slides up from the bottom (front never flips).
 *   • On click anywhere → opens the lightbox (touch: first tap reveals veil,
 *     second tap opens the lightbox).
 *   • Like + Copy are independent action buttons with stopPropagation.
 *   • CSS-only tilt — no JS mousemove handler, no rAF — `transform` on hover.
 */
export function ImageCard({
  image,
  likeCount = 0,
  priority = false,
  onOpen,
  animationDelay = 0,
}: ImageCardProps) {
  const [isVeilOpen, setIsVeilOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [optimisticLikes, setOptimisticLikes] = useState(likeCount);
  const [hasLiked, setHasLiked] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(`liked:${image.id}`) === "1";
  });
  const [isLikeBumping, setIsLikeBumping] = useState(false);

  const handleCardClick = useCallback(
    (event: React.MouseEvent | React.KeyboardEvent) => {
      if ((event.target as HTMLElement).closest("[data-action]")) return;

      // Touch: first tap reveals veil, second tap opens the lightbox.
      // Desktop: hover already shows the veil via CSS, so click → lightbox.
      const isTouchDevice =
        typeof window !== "undefined" &&
        window.matchMedia("(pointer: coarse)").matches;

      if (isTouchDevice && !isVeilOpen) {
        setIsVeilOpen(true);
        return;
      }
      onOpen?.(image);
    },
    [isVeilOpen, image, onOpen],
  );

  const handleCardKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        handleCardClick(event);
      }
    },
    [handleCardClick],
  );

  const handleCopyPrompt = useCallback(
    async (event: React.MouseEvent) => {
      event.stopPropagation();
      await navigator.clipboard.writeText(image.prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), TIMING.TOAST_RESET_MS);
    },
    [image.prompt],
  );

  const handleLike = useCallback(
    async (event: React.MouseEvent) => {
      event.stopPropagation();
      if (hasLiked) return;

      setHasLiked(true);
      setOptimisticLikes((n) => n + 1);
      setIsLikeBumping(true);
      setTimeout(() => setIsLikeBumping(false), LIKE_BUMP_MS);
      localStorage.setItem(`liked:${image.id}`, "1");

      try {
        const response = await fetch(`/api/like/${image.id}`, { method: "POST" });
        if (!response.ok) throw new Error("like_failed");
      } catch {
        setHasLiked(false);
        setOptimisticLikes((n) => n - 1);
        localStorage.removeItem(`liked:${image.id}`);
      }
    },
    [hasLiked, image.id],
  );

  return (
    <article
      className="group/card animate-in mb-4 break-inside-avoid"
      style={{ animationDelay: `${animationDelay}ms` }}
    >
      {/* ── Outer shell of the double-bezel ── */}
      <div
        className={cn(
          "relative rounded-xl bg-neutral-100/60 p-1.5 ring-1 ring-neutral-200/80",
          "transition-[transform,box-shadow] duration-700 ease-out-expo",
          "shadow-soft-1 group-hover/card:shadow-soft-3",
          "group-hover/card:[transform:perspective(1100px)_rotateX(1deg)_rotateY(-1.5deg)_translateY(-2px)]",
        )}
      >
        {/* ── Inner core ── */}
        <div
          role="button"
          tabIndex={0}
          aria-label={`Open prompt: ${image.prompt.slice(0, 80)}`}
          onClick={handleCardClick}
          onKeyDown={handleCardKeyDown}
          className={cn(
            "relative block w-full cursor-pointer overflow-hidden bg-neutral-100 outline-none",
            "rounded-[calc(var(--radius-xl)-6px)]",
            "shadow-[inset_0_0_0_1px_var(--color-neutral-50),inset_0_1px_0_oklch(100%_0_0/0.6)]",
            "focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-50",
          )}
          style={{ aspectRatio: `${image.width} / ${image.height}` }}
        >
          <Image
            src={image.imageUrl}
            alt={image.prompt.slice(0, 100)}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className={cn(
              "object-cover transition-transform duration-700 ease-out-expo",
              "group-hover/card:scale-[1.03]",
            )}
            priority={priority}
          />

          {/* ── Like pill ── top-right corner, button-in-button physics on hover ── */}
          <button
            type="button"
            data-action="like"
            onClick={handleLike}
            aria-label={hasLiked ? `${optimisticLikes} likes — already liked` : "Like this prompt"}
            aria-pressed={hasLiked}
            className={cn(
              "absolute right-3 top-3 z-20 flex items-center gap-1.5 rounded-full px-2.5 py-1 backdrop-blur-md",
              "text-[11px] font-medium tracking-[0.02em]",
              "transition-[background-color,color,transform] duration-200 ease-out-quart",
              "active:scale-[0.96]",
              hasLiked
                ? "bg-rose-100/95 text-rose-700"
                : "bg-white/85 text-neutral-800 hocus:bg-rose-100 hocus:text-rose-700",
            )}
          >
            <span
              className={cn(
                "inline-flex transition-transform duration-300 ease-spring",
                isLikeBumping && "scale-125",
              )}
            >
              <HeartIcon size={12} filled={hasLiked} />
            </span>
            <span>{optimisticLikes}</span>
          </button>

          {/* ── Prompt veil ── slides up from bottom on hover/tap ── */}
          <div
            className={cn(
              "pointer-events-none absolute inset-x-0 bottom-0 z-10",
              "translate-y-3 opacity-0",
              "transition-[transform,opacity] duration-500 ease-out-expo",
              "group-hover/card:translate-y-0 group-hover/card:opacity-100",
              isVeilOpen && "!translate-y-0 !opacity-100",
            )}
          >
            <div className="flex flex-col gap-3 bg-gradient-to-t from-neutral-950/92 via-neutral-950/75 to-transparent p-4 pt-12 text-neutral-50 sm:p-5 sm:pt-16">
              <p className="font-mono text-mono-sm leading-[1.5] text-neutral-100 line-clamp-3">
                {image.prompt}
              </p>
              <div className="flex items-center gap-2">
                {image.model && (
                  <span className="rounded-full bg-white/12 px-2 py-0.5 text-[10px] uppercase tracking-[0.1em] text-neutral-200">
                    {image.model}
                  </span>
                )}

                {/* Button-in-button copy CTA — magnetic hover physics on the icon island */}
                <button
                  type="button"
                  data-action="copy"
                  onClick={handleCopyPrompt}
                  aria-label="Copy prompt to clipboard"
                  className={cn(
                    "group/cta pointer-events-auto ml-auto flex items-center gap-2 rounded-full bg-white py-1 pl-3 pr-1",
                    "text-[11px] font-medium text-neutral-900",
                    "transition-[background-color,transform] duration-200 ease-out-quart",
                    "hocus:bg-neutral-50 active:scale-[0.97]",
                  )}
                >
                  <span>{copied ? "Copied" : "Copy prompt"}</span>
                  <span
                    className={cn(
                      "flex h-6 w-6 items-center justify-center rounded-full bg-neutral-900 text-neutral-50",
                      "transition-transform duration-300 ease-out-expo",
                      "group-hover/cta:translate-x-0.5 group-hover/cta:-translate-y-px group-hover/cta:scale-105",
                    )}
                  >
                    {copied ? <CheckIcon size={12} /> : <CopyIcon size={12} />}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
