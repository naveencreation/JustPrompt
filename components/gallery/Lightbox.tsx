"use client";

import { useEffect, useCallback, useRef, useState } from "react";
import Image from "next/image";
import { CloseIcon, CopyIcon, HeartIcon, ExternalLinkIcon, CheckIcon } from "@/components/icons";
import { cn } from "@/lib/utils/cn";
import { TIMING } from "@/lib/constants/timing";
import type { Image as ImageType } from "@/lib/db/schema";
import { useModelLabel } from "@/lib/hooks/useModels";

interface LightboxProps {
  image: ImageType;
  likeCount?: number;
  onClose: () => void;
}

export function Lightbox({ image, likeCount = 0, onClose }: LightboxProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const modelLabel = useModelLabel(image.model);
  const [copied, setCopied] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setIsOpen(true), 0);
    return () => clearTimeout(t);
  }, []);

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(onClose, 150);
  }, [onClose]);

  useEffect(() => {
    closeRef.current?.focus();
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [handleClose]);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(image.prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), TIMING.TOAST_RESET_MS);
  }, [image.prompt]);

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center p-4",
        "bg-black/80 backdrop-blur-sm",
        "transition-opacity duration-200",
        !isOpen || isClosing ? "opacity-0" : "opacity-100"
      )}
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label="Image preview"
    >
      <div
        className={cn(
          "relative flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-md border border-neutral-800 bg-neutral-900 shadow-2xl lg:flex-row",
          "transition-[opacity,transform] duration-200",
          !isOpen || isClosing ? "opacity-0 translate-y-2" : "opacity-100 translate-y-0"
        )}
      >
        {/* Image panel */}
        <div className="relative min-h-[40vh] flex-1 bg-neutral-950">
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
        <div className="flex w-full flex-col gap-5 overflow-y-auto border-t border-neutral-800 p-7 text-neutral-50 lg:w-[420px] xl:w-[440px] lg:border-l lg:border-t-0 [scrollbar-width:thin] [scrollbar-color:theme(colors.neutral.700)_transparent]">
          <div className="flex items-start justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-300">
              Prompt
            </p>
            <button
              ref={closeRef}
              onClick={handleClose}
              aria-label="Close lightbox"
              className={cn(
                "rounded-md p-1.5 text-neutral-400",
                "transition-[background-color,color] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]",
                "hover:bg-white/5 hover:text-neutral-50",
              )}
            >
              <CloseIcon size={16} />
            </button>
          </div>

          <p className="flex-1 font-mono text-[13px] leading-[1.6] text-neutral-50">
            {image.prompt}
          </p>

          {image.description && (
            <p className="text-sm leading-relaxed text-neutral-400">{image.description}</p>
          )}

          <div className="flex flex-wrap gap-2 text-[10px]">
            {image.model && (
              <span className="rounded-full bg-white/10 px-2.5 py-1 uppercase tracking-[0.1em] text-neutral-300">
                {modelLabel}
              </span>
            )}
            <span className="flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-neutral-300">
              <HeartIcon size={10} />
              {likeCount}
            </span>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleCopy}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-md bg-white px-4 py-2.5",
                "text-sm font-medium text-neutral-900",
                "transition-[background-color,transform] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]",
                "hover:bg-neutral-100 active:scale-[0.94] transition-transform duration-150",
                copied && "scale-[1.04]"
              )}
            >
              {copied ? <CheckIcon size={14} /> : <CopyIcon size={14} />}
              {copied ? "Copied" : "Copy prompt"}
            </button>
            <a
              href={`/p/${image.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "flex items-center justify-center rounded-md border border-neutral-700 px-3 py-2",
                "text-sm text-neutral-300",
                "transition-[border-color,color] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]",
                "hover:border-neutral-500 hover:text-neutral-50",
              )}
              aria-label="Open full page"
            >
              <ExternalLinkIcon size={14} />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
