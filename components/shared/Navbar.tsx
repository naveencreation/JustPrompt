"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";

interface NavLink {
  href: string;
  label: string;
}

const NAV_LINKS: NavLink[] = [
  { href: "/", label: "Browse" },
  { href: "/?sort=likes", label: "Top" },
  { href: "/?sort=random", label: "Random" },
];

/**
 * Fluid-island Navbar.
 *
 * Closed state:  a floating glass pill detached from the top of the viewport,
 *                fixed-positioned, sized to its content (`w-max`).
 * Mobile state:  the pill collapses to logo + hamburger; the hamburger morphs
 *                into an X, and a fullscreen blurred overlay reveals nav links
 *                with a stagger.
 *
 * Pages must reserve top space (e.g. `pt-32 sm:pt-36`) since the nav floats.
 */
export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [hasScrolled, setHasScrolled] = useState(false);
  const pathname = usePathname();

  // Close the menu whenever the route changes (e.g. clicking a link).
  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  // Lock body scroll while the overlay is open.
  useEffect(() => {
    if (!isMenuOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isMenuOpen]);

  // Esc closes the menu.
  useEffect(() => {
    if (!isMenuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsMenuOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isMenuOpen]);

  // Subtle elevation increase once the user scrolls — gives the pill weight.
  useEffect(() => {
    const onScroll = () => setHasScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <header
        className="fixed inset-x-0 top-4 z-50 flex justify-center px-4 sm:top-6"
        aria-label="Site navigation"
      >
        <nav
          className={cn(
            "flex h-12 w-max items-center gap-1 rounded-full px-2 backdrop-blur-xl",
            "border border-neutral-200/70 bg-neutral-50/80",
            "transition-shadow duration-500 ease-out-expo",
            hasScrolled ? "shadow-soft-3" : "shadow-soft-1",
            "sm:gap-2 sm:pl-5 sm:pr-2",
          )}
        >
          <Link
            href="/"
            className="font-serif text-[15px] tracking-tight text-neutral-900 transition-colors duration-200 ease-out-quart hocus:text-neutral-600"
          >
            Prompt Gallery
          </Link>

          <span className="hidden h-4 w-px bg-neutral-200 sm:block" aria-hidden="true" />

          <ul className="hidden items-center gap-0.5 sm:flex">
            {NAV_LINKS.map(({ href, label }) => (
              <li key={href}>
                <Link
                  href={href}
                  className="rounded-full px-3 py-1.5 text-[13px] text-neutral-500 transition-[background-color,color] duration-200 ease-out-quart hocus:bg-neutral-100 hocus:text-neutral-900"
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={() => setIsMenuOpen((open) => !open)}
            aria-label={isMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={isMenuOpen}
            aria-controls="primary-nav-overlay"
            className="relative ml-1 flex h-10 w-10 items-center justify-center rounded-full text-neutral-900 transition-colors duration-200 ease-out-quart hocus:bg-neutral-100 sm:hidden"
          >
            <span className="relative block h-3 w-5">
              <span
                className={cn(
                  "absolute left-0 top-0 h-px w-full bg-current transition-transform duration-300 ease-out-expo",
                  isMenuOpen ? "translate-y-[6px] rotate-45" : "translate-y-0 rotate-0",
                )}
              />
              <span
                className={cn(
                  "absolute bottom-0 left-0 h-px w-full bg-current transition-transform duration-300 ease-out-expo",
                  isMenuOpen ? "-translate-y-[6px] -rotate-45" : "translate-y-0 rotate-0",
                )}
              />
            </span>
          </button>
        </nav>
      </header>

      {/* Fullscreen mobile overlay — staggered link reveal */}
      <div
        id="primary-nav-overlay"
        aria-hidden={!isMenuOpen}
        className={cn(
          "fixed inset-0 z-40 bg-neutral-50/95 backdrop-blur-2xl sm:hidden",
          "transition-[opacity,visibility] duration-500 ease-out-expo",
          isMenuOpen ? "visible opacity-100" : "invisible opacity-0",
        )}
      >
        <div className="flex min-h-[100dvh] flex-col items-start justify-center gap-6 px-8 pt-24">
          <p className="text-eyebrow font-semibold uppercase text-neutral-400">
            Navigation
          </p>
          <ul className="flex flex-col gap-4">
            {NAV_LINKS.map(({ href, label }, index) => (
              <li
                key={href}
                style={{
                  transitionDelay: isMenuOpen ? `${120 + index * 70}ms` : "0ms",
                }}
                className={cn(
                  "transition-[opacity,transform,filter] duration-700 ease-out-expo",
                  isMenuOpen
                    ? "translate-y-0 opacity-100 blur-0"
                    : "translate-y-6 opacity-0 blur-sm",
                )}
              >
                <Link
                  href={href}
                  onClick={() => setIsMenuOpen(false)}
                  className="block font-serif text-5xl tracking-tight text-neutral-900 transition-colors duration-200 ease-out-quart hocus:text-neutral-600"
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
          <span className="mt-8 inline-flex h-px w-12 bg-neutral-300" aria-hidden="true" />
          <p className="max-w-xs text-body text-neutral-500">
            Curated prompts paired with the images they made.
          </p>
        </div>
      </div>
    </>
  );
}
