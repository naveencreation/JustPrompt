/** Time-related constants — all in milliseconds unless suffixed otherwise */

export const TIMING = {
  // Toast / "copied" feedback
  TOAST_RESET_MS: 2_000,

  // Search / typing debounce
  SEARCH_DEBOUNCE_MS: 350,

  // Animation
  GALLERY_STAGGER_MS: 50,
  GALLERY_MAX_STAGGER_MS: 400,

  // Middleware
  MAINTENANCE_CACHE_MS: 60_000,

  // Rate-limit windows (seconds, for the rateLimit adapter API)
  LIKE_WINDOW_SECONDS: 3_600,
  ADMIN_WINDOW_SECONDS: 60,
} as const;
