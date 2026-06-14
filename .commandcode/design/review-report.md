# JustPrompt — Review Report

**Date:** 2026-06-14
**Mode:** `/design review`
**Score:** 42/50 — STRONG
**Verdict:** Good design with a clear voice. Two gaps in hierarchy and interaction completeness. No structural failures.

## First Impression

The warm bone canvas (`#FBFBFA`) against `#2F3437` text, editorial serif headings, and pale-red single-note accent make a specific impression: this is a publication, not a tool. The masonry gallery of AI images with prompt overlays suggests a magazine or archive, not a SaaS dashboard. The identity is clear within two seconds. An AI image gallery rendered in cream editorial would not be guessed from the domain. The decision to refuse neon-on-dark is the strongest signal here.

**Score: 9/10**

## Hierarchy

**Gallery page:** Prompt of the Day (eyebrow label → featured card) → Ad break → masonry grid. Clear information architecture. The FeaturedCard splits attention between image (left) and prompt panel (right) — editorial split that works.

**Detail page:** Image on left (constrained to 72vh) → metadata sidebar (prompt, description, tags, model, date, share, copy) → more ad → related images grid. Clean decide-to-learn flow.

**Explore page:** Header → uniform grid of 50 equal tag cards. This is where hierarchy weakens. There's no differentiation between tags with 200 images and tags with 2 images. Every card gets the same aspect ratio, same gradient overlay, same typography. The content inside (different preview images) carries the only visual variation. For an Explore surface, some card-spanning variation would give the page a visual rhythm it currently lacks.

**Score: 8/10**

## Color Voice

Warm bone neutrals across the full scale (`#FBFBFA` → `#2F3437`) with a single accent: pale red (`#FDEBEC` / `#9F2F2D`) on like buttons. The red is earned — it means affection. It appears nowhere else. The neutral scale has deliberate trace chroma (the stone undertone in `#78716C`, the warmth in `#F5F4F1`). `#EAEAEA` borders are consistently 1px hairline. No gradients, no glossy overlays, no blue-purple.

The like button transition from `bg-black/30 text-white` to `bg-[#FDEBEC] text-[#9F2F2D]` on toggle is a thoughtful state change that doesn't introduce a new hue.

**Score: 9/10**

## Type Voice

DM Sans (geometric sans with personality), Newsreader (editorial serif, tight tracking -0.022em, 1.1 line-height), DM Mono (code and metadata). Three distinct voices with assigned roles.

Body: DM Sans at 13-15px, 1.55-1.65 leading. Headings: Newsreader at 3xl/4xl with tight tracking. Prompts: DM Mono at 13-15px for raw AI output. The font hierarchy distinguishes content type — you know whether you're reading a heading, a prompt, or UI copy.

The heading scale is slightly compressed. The jump from `text-[11px] tracking-[0.2em]` eyebrow labels to `text-3xl font-serif` headings skips a middle tier. A 2xl subtitle between eyebrow and h1 would give the editorial sections more rhythm.

**Score: 8/10**

## Interaction Feel

**Copy flow:** Click button → clipboard write → check icon replaces copy icon → `scale-[1.04]` micro-bounce → resets after timeout. Complete state coverage.

**Like flow:** Click heart → optimistic count++ + localStorage → POST /api/like/:id → on failure: rollback count + clear localStorage + notify parent. Proper undo via rollback rather than confirm.

**Card hover (desktop):** Image scales 3% → gradient overlay fades in → prompt text appears → model badge + copy button appear with 75ms stagger. Like pill appears on group hover. Three layers with distinct animation timing.

**Card tap (mobile):** Click opens lightbox directly — no double-tap confusion. `data-action` scoped clicks don't trigger card open.

**Lightbox:** Saves and restores previous focus element. Full image with metadata sidebar.

**Gap:** No `prefers-reduced-motion` media query. The stagger animation and count-up animation run unconditionally on all devices. Keyboard like-state visibility is limited — `group-focus-within` shows the overlay, but the like button inside doesn't get its own focus ring indicator.

**Score: 8/10**

## Smell Check

The smell report found one faint tell (Explore page uniform grid). Review confirms: it's the only generic pattern across the surfaces. The palette, type, motion, and interaction feel are all authored.

## Recommendations

1. **Add hierarchy to Explore page** — vary card sizing for popular tags with CSS Grid spans. Most popular 2-3 tags get `col-span-2 row-span-1` or larger. `/design voice` or direct edit.
2. **Add `prefers-reduced-motion`** — gate all animations behind the media query. `/design motion`.
3. **Add mid-tier heading scale** — a 2xl serif weight between eyebrow labels and h1s. `/design typeset` or direct addition.
4. **Add safe-area-inset** — `padding-bottom: env(safe-area-inset-bottom)` on BottomNav. Direct edit.
