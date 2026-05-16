import Link from "next/link";
import { LayoutDashboard, Upload, List, Settings, LogOut } from "lucide-react";

const NAV_ITEMS = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/upload",    label: "Upload",    icon: Upload },
  { href: "/admin/manage",    label: "Manage",    icon: List },
  { href: "/admin/settings",  label: "Settings",  icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-neutral-50">
      {/* Sidebar */}
      <aside className="flex w-56 flex-shrink-0 flex-col border-r border-neutral-200 bg-white">
        <div className="border-b border-neutral-100 p-4">
          <Link href="/" className="text-sm font-semibold text-neutral-900">
            Prompt Gallery
          </Link>
          <p className="text-xs text-neutral-400 mt-0.5">Admin</p>
        </div>

        <nav className="flex flex-1 flex-col gap-1 p-3">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 transition-colors"
            >
              <Icon className="size-4 shrink-0" />
              {label}
            </Link>
          ))}
        </nav>

        <div className="border-t border-neutral-100 p-3">
          <form action="/api/admin/auth" method="post">
            <input type="hidden" name="_method" value="DELETE" />
            <Link
              href="/api/admin/auth"
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700 transition-colors"
            >
              <LogOut className="size-4" />
              Sign out
            </Link>
          </form>
        </div>
      </aside>

      {/* Main */}
      <main className="flex flex-1 flex-col overflow-hidden">
        {children}
      </main>
    </div>
  );
}
