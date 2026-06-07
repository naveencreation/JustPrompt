import type { Metadata } from "next";
import { config } from "@/lib/config";

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
      <Sidebar />

      {/* Main Grid View Container */}
      <div className="flex-grow flex flex-col pl-0 md:pl-20 pb-16 md:pb-0 min-w-0">
        {/* Full-width Top Search Bar */}
        <TopBar />

        {/* Dynamic page content */}
        <div className="flex-1 w-full min-w-0">
          {children}
        </div>
      </div>

      {/* Floating Mobile Bottom Navigation */}
      <BottomNav />
    </div>
  );
}
