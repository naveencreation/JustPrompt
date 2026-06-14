import type { Metadata } from "next";
import { config } from "@/lib/config";

import { Suspense } from "react";
import { Sidebar } from "@/components/shared/Sidebar";
import { TopBar } from "@/components/shared/TopBar";
import { BottomNav } from "@/components/shared/BottomNav";

export const metadata: Metadata = {
  metadataBase: new URL(config.appUrl),
  alternates: { canonical: config.appUrl },
};

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex bg-white text-neutral-900 w-full">
      {/* Sticky Desktop Sidebar */}
      <Suspense fallback={<aside className="hidden w-20 flex-col items-center border-r border-neutral-200 bg-white py-6 md:flex" />}>
        <Sidebar />
      </Suspense>

      {/* Main Grid View Container */}
      <div className="flex-grow flex flex-col pl-0 md:pl-20 pb-[calc(4rem+env(safe-area-inset-bottom,0px))] md:pb-0 min-w-0">
        {/* Full-width Top Search Bar */}
        <TopBar />

        {/* Dynamic page content */}
        <div className="flex-1 w-full min-w-0">
          {children}
        </div>
      </div>

      {/* Floating Mobile Bottom Navigation */}
      <Suspense fallback={<nav className="fixed bottom-0 left-0 right-0 z-40 flex h-16 items-center justify-around border-t border-neutral-200 bg-white px-4 pb-[env(safe-area-inset-bottom,0px)] md:hidden shadow-[0_-2px_12px_rgba(0,0,0,0.04)]" />}>
        <BottomNav />
      </Suspense>
    </div>
  );
}
