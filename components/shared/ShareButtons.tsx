"use client";

import { useEffect, useState } from "react";
import { TwitterIcon, PinterestIcon, WhatsAppIcon, ShareIcon } from "@/components/icons";
import { cn } from "@/lib/utils/cn";
import { clientErrors } from "@/lib/observability/clientErrors";

interface ShareButtonsProps {
  url: string;
  title: string;
  imageUrl: string;
  className?: string;
}

export function ShareButtons({ url, title, imageUrl, className }: ShareButtonsProps) {
  const [isShareSupported, setIsShareSupported] = useState(false);

  useEffect(() => {
    if (typeof navigator !== "undefined" && !!navigator.share) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsShareSupported(true);
    }
  }, []);

  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);
  const encodedImage = encodeURIComponent(imageUrl);

  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`;
  const pinterestUrl = `https://pinterest.com/pin/create/button/?url=${encodedUrl}&media=${encodedImage}&description=${encodedTitle}`;
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodedTitle}%20${encodedUrl}`;

  const handleNativeShare = async () => {
    if (!navigator.share) return;
    try {
      await navigator.share({
        title: title,
        text: title,
        url: url,
      });
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        clientErrors.capture(error, { op: "share.native", url });
      }
    }
  };

  return (
    <div className={cn("flex flex-col gap-2.5", className)}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-neutral-400">
        Share
      </p>
      <div className="flex items-center gap-2.5">
        <a
          href={twitterUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-500 shadow-sm transition-all duration-200 hover:border-black/20 hover:text-black active:scale-95"
          aria-label="Share on Twitter"
        >
          <TwitterIcon size={16} />
        </a>

        <a
          href={pinterestUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-500 shadow-sm transition-all duration-200 hover:border-[#E60023]/20 hover:text-[#E60023] active:scale-95"
          aria-label="Share on Pinterest"
        >
          <PinterestIcon size={16} />
        </a>

        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-500 shadow-sm transition-all duration-200 hover:border-[#25D366]/20 hover:text-[#25D366] active:scale-95"
          aria-label="Share on WhatsApp"
        >
          <WhatsAppIcon size={16} />
        </a>

        {isShareSupported && (
          <button
            onClick={handleNativeShare}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-500 shadow-sm transition-all duration-200 hover:border-[#007AFF]/20 hover:text-[#007AFF] active:scale-95"
            aria-label="Share using device options"
          >
            <ShareIcon size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
