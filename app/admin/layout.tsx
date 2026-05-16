import Link from "next/link";
import { DashboardIcon, UploadIcon, ListIcon, SettingsIcon, LogoutIcon } from "@/components/icons";

const NAV_ITEMS = [
  { href: "/admin/dashboard", label: "Dashboard", icon: DashboardIcon },
  { href: "/admin/upload",    label: "Upload",    icon: UploadIcon },
  { href: "/admin/manage",    label: "Manage",    icon: ListIcon },
  { href: "/admin/settings",  label: "Settings",  icon: SettingsIcon },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-neutral-50">
      <aside className="flex w-56 flex-shrink-0 flex-col border-r border-neutral-200 bg-white">
        <div className="border-b border-neutral-100 p-5">
          <Link href="/" className="font-serif text-base tracking-tight text-neutral-900">
            Prompt Gallery
          </Link>
          <p className="mt-1 text-[10px] uppercase tracking-[0.15em] text-neutral-400">
            Admin
          </p>
        </div>

        <nav className="flex flex-1 flex-col gap-0.5 p-3" aria-label="Admin">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] text-neutral-600 transition-[background-color,color] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-neutral-100 hover:text-neutral-900"
            >
              <Icon size={16} />
              {label}
            </Link>
          ))}
        </nav>

        <div className="border-t border-neutral-100 p-3">
          <Link
            href="/admin/login"
            className="flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] text-neutral-500 transition-[background-color,color] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-neutral-100 hover:text-neutral-700"
          >
            <LogoutIcon size={16} />
            Sign out
          </Link>
        </div>
      </aside>

      <main className="flex flex-1 flex-col overflow-hidden">{children}</main>
    </div>
  );
}
