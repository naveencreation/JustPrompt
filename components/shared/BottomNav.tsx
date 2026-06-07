"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  DashboardIcon,
  UploadIcon,
  SettingsIcon,
  TrendingUpIcon,
} from "@/components/icons";
import { cn } from "@/lib/utils/cn";

export function BottomNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const isHome = pathname === "/" && !searchParams.has("sort");
  const isTop = pathname === "/" && searchParams.get("sort") === "likes";
  const isAdmin = pathname.startsWith("/admin");
  const isUpload = pathname === "/admin/upload";
  const isSettings = pathname === "/admin/settings";

  // Simple custom Home icon
  const HomeIcon = () => (
    <svg
      width={18}
      height={18}
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

      {/* Upload */}
      <Link
        href="/admin/upload"
        className={cn(
          "flex h-11 w-11 flex-col items-center justify-center rounded-full transition-colors",
          isUpload ? "bg-neutral-900 text-white shadow-sm" : "text-neutral-500 active:bg-neutral-100"
        )}
      >
        <UploadIcon size={18} />
      </Link>

      {/* Admin */}
      <Link
        href="/admin/dashboard"
        className={cn(
          "flex h-11 w-11 flex-col items-center justify-center rounded-full transition-colors",
          isAdmin && !isUpload && !isSettings ? "bg-neutral-900 text-white shadow-sm" : "text-neutral-500 active:bg-neutral-100"
        )}
      >
        <DashboardIcon size={18} />
      </Link>

      {/* Settings */}
      <Link
        href="/admin/settings"
        className={cn(
          "flex h-11 w-11 flex-col items-center justify-center rounded-full transition-colors",
          isSettings ? "bg-neutral-900 text-white shadow-sm" : "text-neutral-500 active:bg-neutral-100"
        )}
      >
        <SettingsIcon size={18} />
      </Link>
    </nav>
  );
}
