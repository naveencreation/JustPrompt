"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { TrendingUpIcon, CompassIcon, HomeIcon } from "@/components/icons";
import { cn } from "@/lib/utils/cn";

export function BottomNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const isHome = pathname === "/" && !searchParams.has("sort");
  const isTop = pathname === "/" && searchParams.get("sort") === "likes";
  const isExplore = pathname === "/explore";

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 flex h-16 items-center justify-around border-t border-neutral-200 bg-white px-4 md:hidden shadow-[0_-2px_12px_rgba(0,0,0,0.04)]"
      aria-label="Mobile Navigation"
    >
      {/* Home */}
      <Link
        href="/"
        className={cn(
          "flex h-11 w-11 flex-col items-center justify-center rounded-full transition-colors",
          isHome ? "bg-neutral-900 text-white shadow-sm" : "text-neutral-500 active:bg-neutral-100"
        )}
      >
        <HomeIcon />
      </Link>

      {/* Explore */}
      <Link
        href="/explore"
        className={cn(
          "flex h-11 w-11 flex-col items-center justify-center rounded-full transition-colors",
          isExplore ? "bg-neutral-900 text-white shadow-sm" : "text-neutral-500 active:bg-neutral-100"
        )}
      >
        <CompassIcon size={18} />
      </Link>

      {/* Popular / Top */}
      <Link
        href="/?sort=likes"
        className={cn(
          "flex h-11 w-11 flex-col items-center justify-center rounded-full transition-colors",
          isTop ? "bg-neutral-900 text-white shadow-sm" : "text-neutral-500 active:bg-neutral-100"
        )}
      >
        <TrendingUpIcon size={18} />
      </Link>
    </nav>
  );
}
