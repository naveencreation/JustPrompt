export const PAGE_SIZE = 24;
export const MAX_TAGS_PER_IMAGE = 20;
export const MAX_PROMPT_LENGTH = 5000;
export const MAX_DESCRIPTION_LENGTH = 2000;
export const TRENDING_LIKE_THRESHOLD = 100;

// Rate limits (requests per window)
export const LIKE_RATE_LIMIT = 10;       // per hour per IP per image
export const ADMIN_RATE_LIMIT = 60;      // per minute per admin session
export const SEARCH_RATE_LIMIT = 30;     // per minute per IP

// Gallery
export const FEATURED_CARD_SCALE = 2;   // Prompt of the Day card relative size
export const STAGGER_DELAY_MS = 50;     // animation stagger between cards
