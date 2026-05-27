import Link from "next/link";
import { Suspense } from "react";
import { NavLinks } from "./NavLinks";

export function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-neutral-200 bg-neutral-50/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-6 px-4 sm:px-6">
        <Link
          href="/"
          className="font-serif text-base tracking-tight text-neutral-900 transition-colors hover:text-neutral-600"
        >
          Prompt Gallery
        </Link>

        <Suspense fallback={
          <nav className="flex items-center gap-1 text-sm" aria-label="Primary">
            <span className="px-3 py-1.5 text-neutral-500">Gallery</span>
            <span className="px-3 py-1.5 text-neutral-500">Top</span>
          </nav>
        }>
          <NavLinks />
        </Suspense>
      </div>
    </header>
  );
}
