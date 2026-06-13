"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { JustPromptLogo, TrendingUpIcon, CompassIcon, HomeIcon } from "@/components/icons";
import { cn } from "@/lib/utils/cn";

export function Sidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const isHome = pathname === "/" && !searchParams.has("sort");
  const isTop = pathname === "/" && searchParams.get("sort") === "likes";
  const isExplore = pathname === "/explore";

  return (
    <aside className="fixed left-0 top-0 bottom-0 z-40 hidden w-20 flex-col items-center border-r border-neutral-200 bg-white py-6 md:flex">
      {/* Top logo */}
      <Link
        href="/"
        className="mb-8 flex items-center justify-center text-neutral-950 hover:scale-105 transition-transform"
      >
        <JustPromptLogo size={44} strokeWidth={2} />
      </Link>

      {/* Navigation links — public-only */}
      <nav className="flex flex-1 flex-col items-center gap-4 w-full px-2" aria-label="Main Navigation">
        {/* Home */}
        <Link
          href="/"
          title="Home"
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-full transition-all duration-200",
            isHome
              ? "bg-neutral-900 text-white"
              : "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
          )}
        >
          <HomeIcon />
        </Link>

        {/* Explore */}
        <Link
          href="/explore"
          title="Explore"
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-full transition-all duration-200",
            isExplore
              ? "bg-neutral-900 text-white"
              : "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
          )}
        >
          <CompassIcon size={20} />
        </Link>

        {/* Popular */}
        <Link
          href="/?sort=likes"
          title="Popular"
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-full transition-all duration-200",
            isTop
              ? "bg-neutral-900 text-white"
              : "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
          )}
        >
          <TrendingUpIcon size={20} />
        </Link>
      </nav>
    </aside>
  );
}
