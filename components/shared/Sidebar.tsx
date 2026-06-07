"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { PinterestIcon, TrendingUpIcon } from "@/components/icons";
import { cn } from "@/lib/utils/cn";

export function Sidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const isHome = pathname === "/" && !searchParams.has("sort");
  const isTop = pathname === "/" && searchParams.get("sort") === "likes";

  const HomeIcon = () => (
    <svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0"
    >
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );

  return (
    <aside className="fixed left-0 top-0 bottom-0 z-40 hidden w-20 flex-col items-center border-r border-neutral-200 bg-white py-6 md:flex">
      {/* Top logo */}
      <Link
        href="/"
        className="mb-8 flex items-center justify-center text-[#E60023] hover:scale-105 transition-transform"
      >
        <PinterestIcon size={32} useBrandColor />
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
