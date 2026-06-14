# JustPrompt — Smell Report

**Date:** 2026-06-14  
**Mode:** `/design smell`  
**Score:** 8/10 — FAINT  
**Verdict:** 1 tell found. Strong identity. Clean.

## TL;DR

This design has a real point of view. The warm-bone neutral palette, DM Sans / Newsreader typography, and masonry gallery composition are all intentional choices that actively refuse the AI-startup gradient reflex. One faint tell remains: the Explore page uses a uniform feature-tile grid where every tag card is identical. It's not broken — tag browsing is inherently flat — but it's the single generic pattern in an otherwise authored surface. The palette, type, motion, and interactions are all project-specific decisions. This is a clean design.

**Next:** No urgent fixes needed. If the Explore page ever feels flat, `/design voice` could sharpen the art direction there.

---

## Heuristic Scores

| # | Heuristic | Score | Key Finding |
|---|---|---|---|
| 1 | Tech gradient | 1 | No blue-violet, indigo-cyan, or purple-to-teal gradients anywhere. The palette is warm bone neutrals. |
| 2 | Generic tech hue | 1 | No blue-purple identity. The only accent is a muted pale red on like buttons. |
| 3 | Feature tile grid | 0 | Explore page uses uniform tag cards (image + name + count) with no hierarchy. |
| 4 | Accent rail | 1 | No colored side-stripe borders anywhere. |
| 5 | Unearned blur | 1 | Blur is confined to sticky headers (TopBar, Navbar) — correct location. Like pill uses minimal `backdrop-blur-sm` as part of a layered depth system. |
| 6 | Stat monument | 1 | No oversized number clusters. |
| 7 | Icon topper | 1 | No rounded-square icons above section headings. |
| 8 | Bounce everywhere | 1 | All motion uses custom `cubic-bezier(0.16,1,0.3,1)` (exponential-out). No bounce, no elastic. |
| 9 | Default type | 1 | DM Sans, Newsreader, DM Mono — all project-specific choices, with a comment explicitly banning Inter/Roboto. |
| 10 | Center stack | 1 | Gallery is masonry columns. Detail page is editorial split. Only empty states and Explore page header center, and the header shifts left at `md:`. |

---

## Domain Default Check

**Industry:** AI prompt gallery

**First reflex:** neon-on-dark, indigo-to-purple gradients, terminal monospace, sci-fi aesthetic, glossy glass panels

**This design:** warm bone neutrals (`#FBFBFA`, `#2F3437`), editorial serif headings, muted pale-red accents, matte surfaces with hairline borders. The domain reflex is completely refused. A stranger would not guess "AI image gallery" from the palette alone.

**Pass.**

---

## What's Working

- **Palette is authored.** Warm bone canvas with stone undertones — `#FBFBFA` is never flat white, `#2F3437` is never flat black. Every neutral has trace chroma. The pale red (`#FDEBEC` / `#9F2F2D`) on like buttons is a restrained accent that means something.

- **Type has a reason.** DM Sans (geometric, characterful sans) for body and UI, Newsreader (editorial serif with tight tracking and 1.1 line-height) for headings, DM Mono for code and metadata. Three distinct voices, all named intentionally.

- **Motion is invisible but present.** Card tilt only on `pointer: fine` — touch devices get no jank. Stagger fade-slide-up animation at `50ms` intervals breaks mechanical uniformity. Count-up animation on likes is sub-200ms. All custom-eased with `cubic-bezier(0.16,1,0.3,1)`.

- **Gallery composition is chosen.** Masonry columns adapt from 1 to 4 columns by viewport. Images keep their natural aspect ratios. The lightbox is a clean overlay with focus management (saves and restores previous focus).

- **Interactions are complete.** Copy button has copied/uncopied states with animation. Like button has optimistic update + localStorage persistence + server rollback on failure. Hover overlay reveals prompt and model badge with staggered delays. All tap-equivalent on touch.

- **Detail page is editorial.** Image on left constrained to 72vh, metadata sidebar on right with mono prompt, description, tags, model badge, like count, date, share buttons, and copy CTA. Related images in a grid below. Clear Learn/Decide composition.

---

## Priority Issues

### P2 — Explore page uses uniform feature-tile grid

**Location:** `app/(public)/explore/page.tsx`

Every tag card uses the same `aspect-[4/3]` container with identical gradient overlay, identical text treatment, identical hover scale. All 50 tags get equal visual weight. The grid varies columns by breakpoint but the cards themselves are uniform.

**Why it's faint:** Tag browsing *is* inherently flat — every tag is a peer category. The image preview inside each card provides differentiating content. This isn't a broken pattern for an Explore surface.

**Fix (if desired):** Vary card sizing with CSS Grid spans (`col-span-2`, `row-span-2`) for the most popular tags, or introduce a weighted visual treatment (larger image, bolder name) for tags with higher image counts. This would add hierarchy without breaking the browse pattern.

---

## Signals Summary

| Signal | Verdict |
|---|---|
| Palette refuses domain default | PASS |
| Type system is intentional | PASS |
| Motion is custom-eased, no bounce | PASS |
| Depth model is layered (image → overlay → pill) | PASS |
| Gallery composition varies across surfaces | PASS |
| Interactions have complete state coverage | PASS |
| Copy is specific and action-named | PASS |
| Focus management in lightbox | PASS |
| Explore page uniform grid | FAINT SMELL |

---

## Next Modes

`/design voice` — sharpen art direction on the Explore page if the uniform grid ever feels uncommitted.

No other modes recommended. The design is clean.
