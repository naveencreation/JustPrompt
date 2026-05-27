"use client";

import { useState, useEffect, useCallback } from "react";
import { HeartIcon } from "@/components/icons";
import { cn } from "@/lib/utils/cn";

interface LikeButtonProps {
  imageId: string;
  initialCount: number;
}

export function LikeButton({ imageId, initialCount }: LikeButtonProps) {
  const [hasLiked, setHasLiked] = useState(false);
  const [count, setCount] = useState(initialCount);
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(`liked:${imageId}`) === "1") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHasLiked(true);
    }
  }, [imageId]);

  const handleLike = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      if (hasLiked || isPending) return;

      setHasLiked(true);
      setIsPending(true);
      setCount((n) => n + 1);
      localStorage.setItem(`liked:${imageId}`, "1");

      try {
        const res = await fetch(`/api/like/${imageId}`, { method: "POST" });
        if (res.ok) {
          const data = (await res.json()) as { count: number };
          setCount(data.count);
        } else {
          // Rollback on non-OK responses (e.g. rate limited)
          setHasLiked(false);
          setCount((n) => n - 1);
          localStorage.removeItem(`liked:${imageId}`);
        }
      } catch {
        // Rollback on network/fetch errors
        setHasLiked(false);
        setCount((n) => n - 1);
        localStorage.removeItem(`liked:${imageId}`);
      } finally {
        setIsPending(false);
      }
    },
    [hasLiked, isPending, imageId],
  );

  return (
    <button
      onClick={handleLike}
      aria-pressed={hasLiked}
      aria-label={hasLiked ? "Liked" : "Like this prompt"}
      className={cn(
        "flex items-center gap-1.5 rounded-full px-2.5 py-1",
        "text-[10px] font-medium uppercase tracking-[0.05em]",
        "transition-[background-color,color,transform] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]",
        "active:scale-95",
        hasLiked
          ? "bg-[#FDEBEC] text-[#9F2F2D]"
          : "bg-neutral-100 text-neutral-500 hover:bg-[#FDEBEC] hover:text-[#9F2F2D]",
      )}
    >
      <HeartIcon size={12} filled={hasLiked} />
      <span key={count} className="count-animate">{count} likes</span>
    </button>
  );
}
