export const PAGE_SIZE = 24;
export const MAX_TAGS_PER_IMAGE = 20;
export const MAX_PROMPT_LENGTH = 5_000;
export const MAX_DESCRIPTION_LENGTH = 2_000;
export const TRENDING_LIKE_THRESHOLD = 100;

// Rate limits (requests per window)
export const LIKE_RATE_LIMIT = 10;
export const ADMIN_RATE_LIMIT = 60;
export const SEARCH_RATE_LIMIT = 30;

// Sitemap pagination
export const SITEMAP = {
  MAX_IMAGES_PER_SITEMAP: 5_000,
} as const;

// Admin dashboard
export const DASHBOARD = {
  RECENT_IMAGES_COUNT: 5,
  MANAGE_PAGE_SIZE: 100,
} as const;
