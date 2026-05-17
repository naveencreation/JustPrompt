"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  DashboardIcon,
  ListIcon,
  LogoutIcon,
  SettingsIcon,
  UploadIcon,
} from "@/components/icons";
import { cn } from "@/lib/utils/cn";

const NAV_ITEMS = [
  { href: "/admin/dashboard", label: "Dashboard", icon: DashboardIcon },
  { href: "/admin/upload", label: "Upload", icon: UploadIcon },
  { href: "/admin/manage", label: "Manage", icon: ListIcon },
  { href: "/admin/settings", label: "Settings", icon: SettingsIcon },
] as const;

type AdminSidebarProps = {
  isCollapsed: boolean;
  onToggle: () => void;
};

export function AdminSidebar({ isCollapsed, onToggle }: AdminSidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "sticky top-0 flex h-screen flex-shrink-0 flex-col overflow-hidden border-r border-neutral-200 bg-white transition-[width] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
        isCollapsed ? "w-16" : "w-56",
      )}
    >
      <div
        className={cn(
          "relative flex items-center h-[72px] border-b border-neutral-100",
          isCollapsed ? "justify-center" : "px-5 justify-between"
        )}
      >
        <div 
          className={cn(
            "flex flex-col transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
            isCollapsed && "absolute left-2 opacity-0 -translate-x-4 pointer-events-none"
          )}
        >
          <Link href="/" className="flex items-center gap-2 outline-none">
            <span className="sr-only">Prompt Gallery</span>
            <span aria-hidden="true" className="font-serif text-lg tracking-tight text-neutral-900">
              Prompt Gallery
            </span>
          </Link>
          <p className="mt-1 text-[10px] uppercase tracking-[0.15em] text-neutral-400">
            Admin
          </p>
        </div>

        <button
          type="button"
          onClick={onToggle}
          aria-expanded={!isCollapsed}
          aria-controls="admin-sidebar-nav"
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-md text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-300",
            !isCollapsed && "-mr-1"
          )}
        >
          {isCollapsed ? <ChevronRightIcon size={18} /> : <ChevronLeftIcon size={18} />}
        </button>
      </div>

      <nav
        id="admin-sidebar-nav"
        className={cn("flex flex-1 flex-col gap-1 p-3", isCollapsed && "items-center")}
        aria-label="Admin"
      >
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(`${href}/`);

          return (
            <Link
              key={href}
              href={href}
              title={label}
              className={cn(
                "flex items-center rounded-md py-2 text-[13px] transition-[background-color,color] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]",
                isCollapsed ? "justify-center px-2" : "gap-2.5 px-3",
                isActive
                  ? "bg-neutral-100 text-neutral-900"
                  : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900",
              )}
            >
              <Icon size={16} />
              <span
                className={cn(
                  "overflow-hidden whitespace-nowrap transition-[opacity,transform,max-width] duration-200",
                  isCollapsed
                    ? "max-w-0 opacity-0 translate-x-2"
                    : "max-w-[160px] opacity-100 translate-x-0",
                )}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </nav>

      <div className={cn("mt-auto border-t border-neutral-100 p-3", isCollapsed && "flex justify-center")}>
        <Link
          href="/admin/login"
          title="Sign out"
          className={cn(
            "flex items-center rounded-md py-2 text-[13px] text-neutral-500 transition-[background-color,color] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-neutral-100 hover:text-neutral-700",
            isCollapsed ? "justify-center px-2" : "gap-2.5 px-3",
          )}
        >
          <LogoutIcon size={16} />
          <span
            className={cn(
              "overflow-hidden whitespace-nowrap transition-[opacity,transform,max-width] duration-200",
              isCollapsed
                ? "max-w-0 opacity-0 translate-x-2"
                : "max-w-[160px] opacity-100 translate-x-0",
            )}
          >
            Sign out
          </span>
        </Link>
      </div>
    </aside>
  );
}
