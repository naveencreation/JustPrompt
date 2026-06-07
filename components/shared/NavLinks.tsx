"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils/cn";

export function NavLinks() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isTop = searchParams.get("sort") === "likes";
  const isExplore = pathname === "/explore";
  const isGallery = pathname === "/" && !isTop;

  return (
    <nav className="flex items-center gap-1 text-sm" aria-label="Primary">
      <Link
        href="/"
        className={cn(
          "rounded-md px-3 py-1.5 transition-[background-color,color] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]",
          isGallery
            ? "font-medium text-neutral-900"
            : "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
        )}
      >
        Gallery
      </Link>
      <Link
        href="/explore"
        className={cn(
          "rounded-md px-3 py-1.5 transition-[background-color,color] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]",
          isExplore
            ? "font-medium text-neutral-900"
            : "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
        )}
      >
        Explore
      </Link>
      <Link
        href="/?sort=likes"
        className={cn(
          "rounded-md px-3 py-1.5 transition-[background-color,color] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]",
          isTop
            ? "font-medium text-neutral-900"
            : "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
        )}
      >
        Top
      </Link>
    </nav>
  );
}
