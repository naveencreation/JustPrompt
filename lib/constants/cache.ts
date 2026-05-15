/** Cache TTLs in seconds */
export const CACHE_TTL = {
  GALLERY: 60,
  IMAGE: 3600,
  TAGS: 300,
  SETTINGS: 60,
  TRENDING: 300,
  LIKE_DELTA: 120,   // how long a Redis delta lives before forced flush
} as const;

/** Next.js revalidation tags */
export const CACHE_TAG = {
  GALLERY: "gallery",
  IMAGE: (slug: string) => `image:${slug}`,
  TAGS: "tags",
  SETTINGS: "settings",
} as const;
