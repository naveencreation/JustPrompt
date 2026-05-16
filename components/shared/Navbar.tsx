import Link from "next/link";

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

        <nav className="flex items-center gap-1 text-sm" aria-label="Primary">
          <Link
            href="/"
            className="rounded-md px-3 py-1.5 text-neutral-500 transition-[background-color,color] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-neutral-100 hover:text-neutral-900"
          >
            Gallery
          </Link>
          <Link
            href="/?sort=likes"
            className="rounded-md px-3 py-1.5 text-neutral-500 transition-[background-color,color] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-neutral-100 hover:text-neutral-900"
          >
            Top
          </Link>
        </nav>
      </div>
    </header>
  );
}
