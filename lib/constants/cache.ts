/** Cache TTLs in seconds */
export const CACHE_TTL = {
  GALLERY: 60,
  IMAGE: 3_600,
  TAGS: 300,
  SETTINGS: 60,
  TRENDING: 300,
  LIKE_DELTA: 120,
} as const;

/** Next.js `revalidate` exports (in seconds) */
export const REVALIDATE = {
  GALLERY: 60,
  IMAGE_PAGE: 3_600,
  TAG_PAGE: 300,
} as const;

/** Cache-Control headers for API routes */
export const HTTP_CACHE = {
  PUBLIC_READ: "public, s-maxage=60, stale-while-revalidate=300",
} as const;

/** Next.js revalidation tags */
export const CACHE_TAG = {
  GALLERY: "gallery",
  IMAGE: (slug: string) => `image:${slug}`,
  TAGS: "tags",
  SETTINGS: "settings",
} as const;
