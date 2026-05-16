"use client";

import { useState, useRef, useCallback } from "react";
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

const TILT_RANGE_DEG = 6;
const TILT_PERSPECTIVE_PX = 800;

export function ImageCard({
  image,
  likeCount = 0,
  priority = false,
  onOpen,
  animationDelay = 0,
}: ImageCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [copied, setCopied] = useState(false);
  const [optimisticLikes, setOptimisticLikes] = useState(likeCount);
  const [hasLiked, setHasLiked] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(`liked:${image.id}`) === "1";
  });

  const cardRef = useRef<HTMLDivElement>(null);

  const handleTilt = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    el.style.transform = `perspective(${TILT_PERSPECTIVE_PX}px) rotateY(${x * TILT_RANGE_DEG}deg) rotateX(${-y * TILT_RANGE_DEG}deg)`;
  }, []);

  const resetTilt = useCallback(() => {
    if (cardRef.current) cardRef.current.style.transform = "";
  }, []);

  const handleCardClick = useCallback(
    (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).closest("[data-action]")) return;

      // On touch devices: first tap flips, second tap opens lightbox
      if (window.matchMedia("(pointer: coarse)").matches) {
        if (isFlipped) onOpen?.(image);
        else setIsFlipped(true);
        return;
      }
      // On desktop: click opens lightbox directly
      onOpen?.(image);
    },
    [isFlipped, image, onOpen],
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

      try {
        const res = await fetch(`/api/like/${image.id}`, { method: "POST" });
        if (!res.ok) {
          setHasLiked(false);
          setOptimisticLikes((n) => n - 1);
          localStorage.removeItem(`liked:${image.id}`);
        }
      } catch {
        setHasLiked(false);
        setOptimisticLikes((n) => n - 1);
        localStorage.removeItem(`liked:${image.id}`);
      }
    },
    [hasLiked, image.id],
  );

  return (
    <div
      className="mb-4 break-inside-avoid animate-in"
      style={{ animationDelay: `${animationDelay}ms` }}
    >
      <div className="card-scene">
        <div
          ref={cardRef}
          className="card-tilt cursor-pointer"
          onMouseMove={handleTilt}
          onMouseLeave={() => {
            resetTilt();
            if (window.matchMedia("(pointer: fine)").matches) setIsFlipped(false);
          }}
          onMouseEnter={() => {
            if (window.matchMedia("(pointer: fine)").matches) setIsFlipped(true);
          }}
          onClick={handleCardClick}
        >
          <div
            className={cn(
              "card-inner overflow-hidden border border-neutral-200 bg-white",
              "rounded-md transition-[box-shadow] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
              "hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)]",
              isFlipped && "flipped",
            )}
          >
            {/* ── Front ── */}
            <div className="card-face">
              <div
                className="relative w-full bg-neutral-100"
                style={{ paddingBottom: `${(image.height / image.width) * 100}%` }}
              >
                <Image
                  src={image.imageUrl}
                  alt={image.prompt.slice(0, 100)}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover"
                  priority={priority}
                />
                {/* Like badge — pale-pastel pill, minimalist-ui spec */}
                <button
                  data-action="like"
                  onClick={handleLike}
                  aria-label={hasLiked ? "Liked" : "Like this prompt"}
                  className={cn(
                    "absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full px-2.5 py-1",
                    "text-[11px] font-medium tracking-[0.02em] backdrop-blur-sm",
                    "transition-[background-color,color] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]",
                    hasLiked
                      ? "bg-[#FDEBEC] text-[#9F2F2D]"
                      : "bg-white/90 text-neutral-800 hover:bg-[#FDEBEC] hover:text-[#9F2F2D]",
                  )}
                >
                  <HeartIcon size={12} filled={hasLiked} />
                  <span>{optimisticLikes}</span>
                </button>
              </div>
            </div>

            {/* ── Back ── editorial document-style prompt card */}
            <div
              className="card-face card-face-back bg-neutral-900 text-neutral-50"
              style={{ minHeight: `${(image.height / image.width) * 100}%` }}
            >
              <div className="relative h-full min-h-[200px]">
                <Image
                  src={image.imageUrl}
                  alt=""
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover opacity-10"
                  aria-hidden="true"
                />
                <div className="relative z-10 flex h-full flex-col justify-between gap-3 p-5">
                  <p className="font-mono text-[13px] leading-[1.55] line-clamp-6 text-neutral-100">
                    {image.prompt}
                  </p>
                  <div className="flex items-center gap-2">
                    {image.model && (
                      <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.1em] text-neutral-300">
                        {image.model}
                      </span>
                    )}
                    <button
                      data-action="copy"
                      onClick={handleCopyPrompt}
                      aria-label="Copy prompt to clipboard"
                      className={cn(
                        "ml-auto flex items-center gap-1.5 rounded-md bg-white/10 px-3 py-1.5",
                        "text-[11px] font-medium text-neutral-50",
                        "transition-[background-color] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]",
                        "hover:bg-white/20",
                      )}
                    >
                      {copied ? <CheckIcon size={12} /> : <CopyIcon size={12} />}
                      {copied ? "Copied" : "Copy prompt"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
