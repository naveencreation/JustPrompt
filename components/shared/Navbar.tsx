import Link from "next/link";
import { Search } from "lucide-react";

export function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-neutral-200 bg-neutral-50/80 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          href="/"
          className="font-semibold tracking-tight text-neutral-900 hover:text-neutral-600 transition-colors"
        >
          Prompt Gallery
        </Link>

        <nav className="flex items-center gap-2 text-sm text-neutral-500">
          <Link
            href="/"
            className="rounded-md px-3 py-1.5 hover:bg-neutral-100 hover:text-neutral-900 transition-colors"
          >
            Gallery
          </Link>
          <Link
            href="/?sort=likes"
            className="rounded-md px-3 py-1.5 hover:bg-neutral-100 hover:text-neutral-900 transition-colors"
          >
            Top
          </Link>
        </nav>
      </div>
    </header>
  );
}
