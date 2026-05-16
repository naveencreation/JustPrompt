"use client";

import { useState, useCallback } from "react";
import { CopyIcon, CheckIcon } from "@/components/icons";
import { cn } from "@/lib/utils/cn";
import { TIMING } from "@/lib/constants/timing";

interface CopyButtonProps {
  text: string;
  className?: string;
}

export function CopyButton({ text, className }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), TIMING.TOAST_RESET_MS);
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      className={cn(
        "flex w-full items-center justify-center gap-2 rounded-md bg-neutral-900 px-4 py-2.5",
        "text-sm font-medium text-neutral-50",
        "transition-[background-color,transform] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]",
        "hover:bg-neutral-700 active:scale-[0.98]",
        className,
      )}
    >
      {copied ? <CheckIcon size={14} /> : <CopyIcon size={14} />}
      {copied ? "Copied" : "Copy prompt"}
    </button>
  );
}
