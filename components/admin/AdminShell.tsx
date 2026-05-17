"use client";

import { useState } from "react";
import { Toaster } from "sonner";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { UI } from "@/lib/constants/ui";

const COLLAPSED_COOKIE_VALUE = "1";
const EXPANDED_COOKIE_VALUE = "0";

type AdminShellProps = {
  initialCollapsed: boolean;
  children: React.ReactNode;
};

function persistCollapsedState(isCollapsed: boolean) {
  const cookieValue = isCollapsed ? COLLAPSED_COOKIE_VALUE : EXPANDED_COOKIE_VALUE;
  document.cookie = `${UI.ADMIN_SIDEBAR_COLLAPSED_COOKIE}=${cookieValue}; Path=/; Max-Age=${UI.ADMIN_SIDEBAR_COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`;
}

export function AdminShell({ initialCollapsed, children }: AdminShellProps) {
  const [isCollapsed, setIsCollapsed] = useState(initialCollapsed);

  const toggleCollapsed = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      persistCollapsedState(next);
      return next;
    });
  };

  return (
    <div className="flex min-h-screen bg-neutral-50">
      <AdminSidebar isCollapsed={isCollapsed} onToggle={toggleCollapsed} />

      <main className="relative flex flex-1 flex-col">
        {children}
      </main>

      <Toaster position="bottom-right" toastOptions={{ className: "font-sans" }} />
    </div>
  );
}
