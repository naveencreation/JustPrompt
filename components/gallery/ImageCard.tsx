"use client";

import { useState, useRef, useCallback } from "react";
import Image from "next/image";
import { Copy, Heart, Check } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { Image as ImageType } from "@/lib/db/schema";

interface ImageCardProps {
  image: ImageType;
  likeCount?: number;
  priority?: boolean;
  onOpen?: (image: ImageType) => void;
  animationDelay?: number;
}

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

  // Tilt — only applied via CSS media query (pointer: fine), so no JS guard needed
  const cardRef = useRef<HTMLDivElement>(null);

  const handleTilt = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    el.style.transform = `perspective(800px) rotateY(${x * 8}deg) rotateX(${-y * 8}deg)`;
  }, []);

  const resetTilt = useCallback(() => {
    if (cardRef.current) {
      cardRef.current.style.transform = "";
    }
  }, []);

  const handleFlip = useCallback(
    (e: React.MouseEvent) => {
      // If clicking the like or copy buttons, don't flip
      if ((e.target as HTMLElement).closest("[data-action]")) return;
      setIsFlipped((prev) => !prev);
    },
    [],
  );

  const handleCardClick = useCallback(
    (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).closest("[data-action]")) return;

      // On touch devices (coarse pointer), single tap flips; double-tap opens
      if (window.matchMedia("(pointer: coarse)").matches) {
        if (isFlipped) {
          onOpen?.(image);
        } else {
          setIsFlipped(true);
        }
        return;
      }

      // On desktop, click opens lightbox directly
      onOpen?.(image);
    },
    [isFlipped, image, onOpen],
  );

  const handleCopyPrompt = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      await navigator.clipboard.writeText(image.prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
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
          // Revert optimistic update if rate-limited
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
          className={cn("card-tilt cursor-pointer")}
          onMouseMove={handleTilt}
          onMouseLeave={() => {
            resetTilt();
            // Reset flip on mouse-leave on desktop
            if (window.matchMedia("(pointer: fine)").matches) {
              setIsFlipped(false);
            }
          }}
          onMouseEnter={() => {
            if (window.matchMedia("(pointer: fine)").matches) {
              setIsFlipped(true);
            }
          }}
          onClick={handleCardClick}
        >
          <div className={cn("card-inner rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow", isFlipped && "flipped")}>
            {/* ── Front ── */}
            <div className="card-face">
              <div className="relative w-full bg-neutral-100" style={{ paddingBottom: `${(image.height / image.width) * 100}%` }}>
                <Image
                  src={image.imageUrl}
                  alt={image.prompt.slice(0, 100)}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover"
                  priority={priority}
                />
                {/* Like button on front */}
                <button
                  data-action="like"
                  onClick={handleLike}
                  aria-label={hasLiked ? "Liked" : "Like this prompt"}
                  className={cn(
                    "absolute bottom-2 right-2 flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium backdrop-blur-sm transition-all",
                    hasLiked
                      ? "bg-rose-500 text-white"
                      : "bg-black/40 text-white hover:bg-rose-500",
                  )}
                >
                  <Heart className="size-3" fill={hasLiked ? "currentColor" : "none"} />
                  <span>{optimisticLikes}</span>
                </button>
              </div>
            </div>

            {/* ── Back ── */}
            <div className="card-face card-face-back bg-neutral-900 text-white" style={{ minHeight: `${(image.height / image.width) * 100}%` }}>
              <div className="relative h-full min-h-[200px]">
                {/* Faded image background */}
                <Image
                  src={image.imageUrl}
                  alt=""
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover opacity-15"
                  aria-hidden="true"
                />
                <div className="relative z-10 flex flex-col justify-between h-full p-4 gap-3">
                  <p className="text-sm leading-relaxed line-clamp-6 font-mono text-neutral-100">
                    {image.prompt}
                  </p>
                  <div className="flex items-center gap-2">
                    {image.model && (
                      <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-neutral-300">
                        {image.model}
                      </span>
                    )}
                    <button
                      data-action="copy"
                      onClick={handleCopyPrompt}
                      className="ml-auto flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/25 transition-colors"
                      aria-label="Copy prompt to clipboard"
                    >
                      {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
                      {copied ? "Copied!" : "Copy prompt"}
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
