/**
 * Design system constants — JS-side mirror of CSS tokens in `app/globals.css`.
 *
 * Use these whenever JavaScript needs to reference a duration, easing, or
 * spring physics value. Keep them in sync with `@theme` in globals.css —
 * the visual language must stay coherent across CSS and JS.
 */

/** Easing functions — matched to `--ease-*` tokens in globals.css. */
export const EASE = {
  /** Gentle hover state changes (color, opacity). */
  OUT_QUART: "cubic-bezier(0.25, 1, 0.5, 1)",
  /** Card transitions, layout shifts. */
  OUT_QUINT: "cubic-bezier(0.22, 1, 0.36, 1)",
  /** Default exit / entry curve. Matches Apple-Linear feel. */
  OUT_EXPO: "cubic-bezier(0.16, 1, 0.30, 1)",
  /** Slow-start deceleration (Apple-style large motion). */
  APPLE: "cubic-bezier(0.32, 0.72, 0, 1)",
  /** Subtle overshoot for delightful micro-interactions. */
  SPRING: "cubic-bezier(0.34, 1.56, 0.64, 1)",
} as const;

/** Animation durations, in milliseconds. */
export const DURATION_MS = {
  /** Quick hover / focus state transitions. */
  HOVER: 200,
  /** Standard UI transition (sidebar, button, badge). */
  STANDARD: 300,
  /** Card flips, modal opens. */
  CARD: 600,
  /** Hero / page-level entry animations. */
  HERO: 800,
} as const;

/** Stagger delays for list reveals. */
export const STAGGER_MS = {
  /** Per-item delay in a small list (cards, nav items). */
  LIST: 50,
  /** Cap on total stagger so the last item doesn't take forever. */
  LIST_MAX: 400,
} as const;

/** Breakpoints — keep in sync with Tailwind defaults. */
export const BREAKPOINT_PX = {
  SM: 640,
  MD: 768,
  LG: 1024,
  XL: 1280,
  XXL: 1536,
} as const;
