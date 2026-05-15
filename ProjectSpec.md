# AI Prompt Gallery — Project Specification (v3, configurable & lean)

## Overview

A web application that displays AI-generated images alongside the prompts used to create them.
Users browse a public gallery of image cards. Each card flips to reveal the prompt (hover on desktop, tap on mobile). Each image has its own SEO-friendly page. An admin panel allows the owner to upload, manage, and organize all content. The site is monetized via Google AdSense.

**Designed to launch with a single external dependency (Supabase) and scale by enabling additional services through environment variables — never through code rewrites.**

The architecture targets a realistic ceiling of ~1M images and ~100k DAU (read-heavy, ~95/5 split) without requiring any structural changes.

---

## Core Principle: Everything External Is Pluggable

Every capability that *could* require a third-party service (cache, image storage, error reporting, logging, search, rate limiting) is defined as a **TypeScript interface** with **at least two implementations**:

1. A **default implementation** that works with zero extra services (in-memory, Postgres, or local). This is what runs at launch.
2. A **production implementation** powered by a paid/SaaS service (Upstash, Sentry, Cloudinary, Meilisearch, etc.).

A single config module (`lib/config.ts`) inspects environment variables at boot and picks the right implementation. **No env var = no service required.** Add the env var → the upgraded backend turns on automatically.

```ts
// lib/cache/factory.ts
export function getCache(): Cache {
  if (process.env.UPSTASH_REDIS_REST_URL) return new RedisCache();
  return new MemoryCache();          // default — works locally, works on Vercel
}
```

Same pattern for storage, logger, error reporter, rate limiter, search. **You never check `if (process.env...)` outside of factory files.**

---

## Architecture Principles

1. **Boring stack, clean seams.** Next.js + Postgres + object storage. No microservices.
2. **Pluggable adapters.** Every external dependency is behind an interface with a free fallback.
3. **Service / repository layering.** Pages and API routes never touch the DB directly — they go through services.
4. **Cache aggressively, invalidate precisely.** When a cache exists, use it; when it doesn't, fall back transparently.
5. **Cursor pagination everywhere.** `OFFSET` is banned.
6. **Validate at every boundary.** All inputs run through `zod`.
7. **Add services only when metrics demand them**, never preemptively.

---

## Service Tiers

### Tier 0 — Launch Stack (everything free, ~$0/mo)

| Capability         | Default implementation                       | Notes                                              |
|--------------------|----------------------------------------------|----------------------------------------------------|
| Database           | Supabase Postgres (free tier)                | 500 MB DB, 2 GB egress, included Auth              |
| Auth               | Supabase Auth                                | Free                                               |
| Image storage      | Supabase Storage (free tier, 1 GB)           | Free; Next.js `<Image>` handles optimization       |
| Cache              | In-process LRU (`Map` + TTL)                 | Per-instance, fine for low traffic                 |
| Like counter       | Direct Postgres increment with debounce      | Simple `update like_counts set count = count + 1`  |
| Rate limiting      | In-memory token bucket (per-instance)        | Best-effort; sufficient for early traffic          |
| Error reporting    | `console.error` + structured stdout          | Vercel captures stdout for free                    |
| Logging            | `console.log` JSON via `logger` interface    | Same                                               |
| Analytics          | None (or Vercel Analytics free tier)         | Optional                                           |
| Search             | Postgres FTS (`tsvector`)                    | Scales to ~1M rows                                 |
| Hosting            | Vercel Hobby (dev) / **Pro $20** (with ads)  | Pro required once AdSense is live                  |

**Total external services to launch: 2** (Supabase + Vercel). Maybe 3 if you want analytics.

### Tier 1 — Grow (~$20–40/mo, enable as needed)

| Capability         | Upgraded implementation         | Trigger to enable                              |
|--------------------|---------------------------------|------------------------------------------------|
| Cache              | Upstash Redis (free → $10/mo)   | DB CPU > 30%, or multi-region needs            |
| Rate limiting      | Upstash Ratelimit               | Bot abuse, distributed deploys                 |
| Error reporting    | Sentry (free → $26/mo)          | First production bug you can't reproduce       |
| Logging            | Axiom / Logflare (free tier)    | When grepping Vercel logs gets painful         |
| Analytics          | Plausible ($9/mo)               | Want privacy-friendly analytics                |
| Image transforms   | Cloudinary                      | Need fancy transforms / faster CDN             |

### Tier 2 — Scale (~$100–200/mo)

| Capability         | Upgraded implementation                  | Trigger                                |
|--------------------|------------------------------------------|----------------------------------------|
| Image storage      | Cloudflare R2 + Cloudflare Images        | Cloudinary credits exhausted           |
| Search             | Meilisearch on Fly.io (~$5/mo)           | Postgres FTS slows past 1M rows        |
| Database           | Supabase Pro ($25/mo) + read replica     | DB tier full or want backups           |
| Background jobs    | Upstash QStash / Inngest                 | Need reliable async work               |

> **Key point: each row above is enabled by setting one or two env vars. No code changes.**

---

## Tech Stack (required to start)

| Layer            | Technology              | Why                                              |
|------------------|-------------------------|--------------------------------------------------|
| Frontend+Backend | Next.js 15 (App Router) | SSR/ISR for SEO, RSC, built-in API routes        |
| Language         | TypeScript (strict)     | Required at scale                                |
| Database + Auth  | Supabase (PostgreSQL)   | Single dependency for DB + Auth + Storage        |
| Validation       | zod                     | Boundary validation                              |
| Hosting          | Vercel                  | Pro plan required once AdSense is live           |

---

## Database Schema

> The schema below works identically on Tier 0 (no Redis) and Tier 1+ (with Redis). Only the *write path* of likes changes.

### Table: `images`

| Column                | Type        | Description                                          |
|-----------------------|-------------|------------------------------------------------------|
| id                    | uuid (PK)   | Unique ID                                            |
| slug                  | text UNIQUE | URL-safe slug for `/p/[slug]` SEO pages              |
| storage_key           | text        | Provider-agnostic key (e.g. `images/abc123.webp` for Supabase, or `cloudinary_public_id` for Cloudinary) |
| storage_provider      | text        | `'supabase'` \| `'cloudinary'` — set at upload time  |
| image_url             | text        | Cached CDN URL                                       |
| width, height         | integer     | Stored at upload — eliminates layout shift (CLS)     |
| prompt                | text        | The prompt used to generate the image                |
| description           | text NULL   | Optional original commentary (helps AdSense approval)|
| model                 | text NULL   | `'sdxl'`, `'dalle3'`, `'midjourney'`, etc.           |
| is_published          | boolean     | True = visible on public gallery                     |
| display_order         | bigint      | For drag-to-reorder                                  |
| search_vector         | tsvector    | Generated FTS column                                 |
| created_at            | timestamptz | Auto-set on insert                                   |
| updated_at            | timestamptz | Auto-updated via trigger                             |

```sql
alter table images add column search_vector tsvector
  generated always as (
    setweight(to_tsvector('english', coalesce(prompt,'')), 'A') ||
    setweight(to_tsvector('english', coalesce(description,'')), 'B') ||
    setweight(to_tsvector('english', coalesce(model,'')), 'C')
  ) stored;

create index images_fts_idx     on images using gin(search_vector);
create index images_created_idx on images (created_at desc, id desc) where is_published;
create index images_order_idx   on images (display_order)            where is_published;
```

### Table: `tags` and `image_tags`

```sql
create table tags (
  id   serial primary key,
  name text unique not null,
  slug text unique not null
);

create table image_tags (
  image_id uuid references images(id) on delete cascade,
  tag_id   int  references tags(id)   on delete cascade,
  primary key (image_id, tag_id)
);
create index image_tags_tag_idx on image_tags(tag_id);
```

### Table: `like_counts`

```sql
create table like_counts (
  image_id   uuid primary key references images(id) on delete cascade,
  count      bigint not null default 0,
  updated_at timestamptz not null default now()
);
```

> **Tier 0 (no Redis):** `POST /api/like/[id]` does `update like_counts set count = count + 1 where image_id = ?`. Fine up to a few writes/sec/image.
> **Tier 1+ (Redis):** `redis.INCR like:{id}`, scheduled job flushes deltas to `like_counts`. Same read code, just `count + redis_delta`.

### Table: `settings` (singleton row)

| Column                | Type        | Description                            |
|-----------------------|-------------|----------------------------------------|
| id                    | int (PK=1)  | Always 1                               |
| featured_image_id     | uuid NULL   | Prompt of the Day                      |
| maintenance_mode      | boolean     | If true, public gallery shows banner   |

> Auth handled entirely by **Supabase Auth**. No `admin_users` table.

---

## Project Folder Structure

```
/
├── app/
│   ├── (public)/
│   │   ├── page.tsx                # Public gallery (ISR, revalidate=60)
│   │   ├── p/[slug]/page.tsx       # Per-image SEO page
│   │   ├── t/[slug]/page.tsx       # Tag page
│   │   └── sitemap.ts
│   ├── admin/
│   │   ├── login/page.tsx
│   │   ├── dashboard/page.tsx
│   │   ├── upload/page.tsx
│   │   ├── manage/page.tsx
│   │   └── settings/page.tsx
│   ├── api/
│   │   ├── images/
│   │   │   ├── route.ts            # GET (cursor paginated), POST
│   │   │   └── [id]/route.ts       # GET, PUT, DELETE
│   │   ├── like/[id]/route.ts
│   │   ├── search/route.ts
│   │   ├── revalidate/route.ts
│   │   ├── cron/flush-likes/route.ts   # No-op when Tier 0; active on Tier 1+
│   │   └── admin/auth/route.ts
│   └── layout.tsx
├── components/
│   ├── gallery/                    # GalleryGrid, ImageCard, Lightbox, SearchBar, TagFilter, SkeletonCard
│   ├── admin/                      # UploadForm, EntryTable, DashboardStats, CardPreview
│   └── shared/                     # Navbar
├── lib/
│   ├── config.ts                   # READS env, picks all implementations — single source of truth
│   ├── db/
│   │   ├── client.ts
│   │   └── schema.ts               # zod schemas
│   ├── repos/                      # Raw queries — no business logic
│   │   ├── imageRepo.ts
│   │   ├── tagRepo.ts
│   │   └── likeRepo.ts
│   ├── services/                   # Business logic — pages/APIs only call this
│   │   ├── imageService.ts
│   │   ├── likeService.ts
│   │   ├── searchService.ts
│   │   └── adminService.ts
│   ├── storage/
│   │   ├── index.ts                # interface { upload, delete, transform, signedUploadUrl }
│   │   ├── supabase.ts             # DEFAULT
│   │   ├── cloudinary.ts           # OPTIONAL
│   │   └── factory.ts              # picks based on STORAGE_PROVIDER env
│   ├── cache/
│   │   ├── index.ts                # interface { get, set, incr, del, ... }
│   │   ├── memory.ts               # DEFAULT — LRU + TTL
│   │   ├── redis.ts                # OPTIONAL — Upstash REST client
│   │   └── factory.ts
│   ├── ratelimit/
│   │   ├── index.ts                # interface { check(key, limit, windowSec) }
│   │   ├── memory.ts               # DEFAULT — token bucket per instance
│   │   ├── redis.ts                # OPTIONAL
│   │   └── factory.ts
│   ├── observability/
│   │   ├── logger.ts               # interface — defaults to console JSON
│   │   ├── errors.ts               # interface — defaults to console.error
│   │   ├── sentry.ts               # OPTIONAL
│   │   └── axiom.ts                # OPTIONAL
│   ├── search/
│   │   ├── index.ts                # interface { query, indexImage, removeImage }
│   │   ├── postgres.ts             # DEFAULT — uses tsvector
│   │   ├── meilisearch.ts          # OPTIONAL
│   │   └── factory.ts
│   └── utils/
│       ├── slug.ts
│       └── cursor.ts
├── middleware.ts                   # Protect /admin + maintenance mode
├── instrumentation.ts              # Conditional Sentry init based on env
└── next.config.ts
```

---

## `lib/config.ts` — The Single Source of Truth

```ts
// Inspect once, reuse everywhere. No process.env access outside this file.
import { z } from "zod";

const env = z
  .object({
    // Required
    NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

    // Optional — presence enables the upgraded backend
    UPSTASH_REDIS_REST_URL: z.string().url().optional(),
    UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

    CLOUDINARY_CLOUD_NAME: z.string().optional(),
    CLOUDINARY_API_KEY: z.string().optional(),
    CLOUDINARY_API_SECRET: z.string().optional(),

    SENTRY_DSN: z.string().url().optional(),
    AXIOM_TOKEN: z.string().optional(),
    MEILISEARCH_HOST: z.string().url().optional(),

    REVALIDATE_SECRET: z.string().min(16),
  })
  .parse(process.env);

export const config = {
  cache:   env.UPSTASH_REDIS_REST_URL ? "redis"      : "memory",
  rate:    env.UPSTASH_REDIS_REST_URL ? "redis"      : "memory",
  storage: env.CLOUDINARY_CLOUD_NAME  ? "cloudinary" : "supabase",
  errors:  env.SENTRY_DSN             ? "sentry"     : "console",
  logs:    env.AXIOM_TOKEN            ? "axiom"      : "console",
  search:  env.MEILISEARCH_HOST       ? "meili"      : "postgres",
  env,
} as const;
```

Every factory reads from `config.*`. Tests can pass mocks. Local dev needs only the three `SUPABASE_*` vars.

---

## Public Gallery — Features

### Layout
- Masonry grid (Pinterest-style, variable card heights)
- Fully responsive
- Cursor-based infinite scroll via `/api/images?cursor=...`
- Server-rendered first page for SEO + fast LCP

### Card Behavior
- **Front:** Next.js `<Image>` with explicit width/height — zero CLS
- **Desktop hover:** 3D flip + cursor-tracking tilt
- **Mobile tap:** Single tap flips, second tap opens lightbox
- **Back:** Prompt over faded background, **Copy Prompt** button
- **Like button:** Optimistic UI, deduped client-side via `localStorage` + server-side via rate limiter
- Tilt effect gated to `@media (pointer: fine)` — no jank on touch

### Per-Image SEO Pages (`/p/[slug]`)
- Server-rendered, ISR (`revalidate=3600`)
- `<h1>` is the prompt; OpenGraph + Twitter Card meta; JSON-LD `ImageObject`
- Related images by shared tags
- One sitemap entry per image

### Discovery
- Debounced search → `/api/search?q=...` (Postgres FTS today, Meilisearch tomorrow — same endpoint)
- Tag filter buttons → `/api/images?tag=portrait`
- Sort: Newest / Most Liked / Random (random uses `tablesample` + session seed)
- **Prompt of the Day** pinned at top, 2× size

### Monetization
- AdSense via `next/script strategy="afterInteractive"` in root layout
- Ad units: between rows (every 12 cards), in lightbox sidebar, on per-image pages
- AdSense approval requires original written content → that's why every image has a `description` field. Plan to apply only after ~50 entries with descriptions.

---

## Admin Panel — Features

### Login (`/admin/login`)
Supabase Auth (email + password). `middleware.ts` enforces session for all `/admin/*`. API mutations re-check session in-route (defense in depth).

### Dashboard (`/admin/dashboard`)
- Total images, total likes (from `like_counts` + cache delta)
- Most liked image (thumbnail + prompt preview)
- Recently added (last 5)
- Quick links

### Upload (`/admin/upload`)
- Drag & drop or click to upload
- Image preview (with detected width/height)
- Prompt textarea, description textarea (recommended for AdSense)
- Model dropdown
- Tag chips with autocomplete from existing tags
- Card preview matching public rendering
- **Publish** → calls `revalidateTag('gallery')`
- **Save as Draft** → `is_published=false`

### Manage (`/admin/manage`)
- Table or grid view, server-side pagination + filters
- Inline edit prompt/description/tags
- Delete (cascades to storage via `storage_provider` + `storage_key`)
- Hide / Unpublish toggle
- Bulk select → delete / unpublish / re-tag
- Drag to reorder → updates `display_order`

### Settings (`/admin/settings`)
- Set Prompt of the Day
- Toggle maintenance mode
- View backend status: shows which adapter is active for each capability (Tier 0 / Tier 1 / Tier 2)
- Trigger manual sitemap regeneration
- Trigger manual like-counter flush (Tier 1+ only)

---

## API Routes

All public read endpoints return:
```
Cache-Control: public, s-maxage=60, stale-while-revalidate=300
```
All mutating endpoints require a valid Supabase session AND go through `lib/ratelimit`.

### Public

| Method | Route                                | Description                                |
|--------|--------------------------------------|--------------------------------------------|
| GET    | /api/images?cursor=&limit=24         | Cursor paginated published images          |
| GET    | /api/images?tag=portrait             | Filter by tag                              |
| GET    | /api/images?sort=likes\|new\|random  | Sort                                       |
| GET    | /api/images/[id]                     | Single image                               |
| GET    | /api/search?q=cyberpunk+cat          | Full-text search (provider chosen at boot) |
| POST   | /api/like/[id]                       | Increment like (rate-limited)              |

### Admin (protected)

| Method | Route                  | Description                          |
|--------|------------------------|--------------------------------------|
| POST   | /api/images            | Create entry                         |
| PUT    | /api/images/[id]       | Update entry                         |
| DELETE | /api/images/[id]       | Delete entry + storage asset         |
| POST   | /api/admin/auth        | Login                                |
| DELETE | /api/admin/auth        | Logout                               |
| POST   | /api/revalidate        | On-demand `revalidateTag` webhook    |

### Cursor format

```ts
type Cursor = { createdAt: string; id: string };
encodeCursor(c: Cursor): string  // base64url
decodeCursor(s: string): Cursor
```

Query:
```sql
select * from images
where is_published
  and (created_at, id) < ($cursorCreatedAt, $cursorId)
order by created_at desc, id desc
limit 24;
```

---

## Image Upload Flow

The flow is identical at every tier — only the `storage` adapter differs.

1. Admin selects image in `UploadForm`
2. Client calls `POST /api/admin/upload-signature` → server returns a signed upload URL (`storage.signedUploadUrl()`)
3. Browser uploads directly to the storage provider (Supabase Storage on Tier 0, Cloudinary on Tier 1+) — bypasses Vercel function payload limits
4. Provider returns `storage_key`, `width`, `height`
5. Client `POST`s metadata + `storage_key` + `storage_provider` to `/api/images`
6. Server inserts into `images` + `image_tags`, calls `revalidateTag('gallery')`
7. ISR rebuilds gallery page on next request

---

## Caching Strategy

| Layer                       | What it caches                  | Tier 0 backend         | Tier 1+ backend     | Invalidation               |
|-----------------------------|---------------------------------|------------------------|---------------------|----------------------------|
| Vercel Edge                 | HTML + public APIs              | Built-in               | Built-in            | `revalidateTag` on publish |
| CDN                         | Images                          | Supabase Storage CDN   | Cloudinary CDN      | New `storage_key`          |
| Application cache           | Hot queries, like deltas        | In-memory LRU          | Upstash Redis       | TTL                        |
| Postgres materialized views | Trending, most-liked            | Postgres               | Postgres            | Scheduled refresh          |
| `unstable_cache`            | Per-request memoization         | Next.js                | Next.js             | Auto                       |

> The application cache key change is **transparent to callers**. They just call `cache.get(key)` and `cache.set(key, value, ttl)`. The factory decides backend.

---

## Likes — Adapter-Driven Hot Path

```ts
// lib/services/likeService.ts
async function like(imageId: string, ip: string) {
  const ok = await rateLimit.check(`like:${ip}:${imageId}`, 10, 3600);
  if (!ok) return error("rate_limited");

  const newCount = await cache.incr(`like:${imageId}`);
  if (newCount === 1) {
    // First write since last flush — schedule one
    await cache.set(`like:dirty:${imageId}`, "1", 120);
  }
  return { count: await readCount(imageId) };
}

async function readCount(imageId: string) {
  const persisted = await likeRepo.getCount(imageId);
  const delta     = (await cache.get<number>(`like:${imageId}`)) ?? 0;
  return persisted + delta;
}
```

- **Tier 0:** `cache.incr` happens in-memory; a background `setInterval` (or Vercel cron at `*/1 * * * *`) flushes deltas to Postgres. With a single Vercel instance, in-memory works. With multiple instances, you accept slight per-instance drift until flush — fine for low traffic.
- **Tier 1+:** Same code, but `cache` is Redis → all instances share the counter, no drift.

---

## Auth & Security

- Admin routes protected via `middleware.ts` checking Supabase session
- API mutations re-check session inside the route (defense in depth)
- Public APIs are read-only
- Rate limiting on all mutations + likes (in-memory or Redis backend)
- Row-Level Security enabled on all Supabase tables
- Storage uploads always signed — no unsigned client uploads
- CSP headers in `next.config.ts` (allow current `storage_provider` + AdSense)
- Sentry adapter (when enabled) scrubs PII

---

## Observability — Adapter-Driven

```ts
// lib/observability/logger.ts
export interface Logger {
  info(msg: string, meta?: object): void;
  warn(msg: string, meta?: object): void;
  error(msg: string, meta?: object): void;
}

// Tier 0: ConsoleLogger writes structured JSON to stdout — Vercel captures it for free
// Tier 1: AxiomLogger ships to Axiom in addition to stdout
```

```ts
// lib/observability/errors.ts
export interface ErrorReporter {
  capture(err: unknown, ctx?: object): void;
}

// Tier 0: ConsoleErrorReporter
// Tier 1: SentryErrorReporter (auto-tags release, traces, user context)
```

`/api/health` pings DB (and Redis/search if enabled) for uptime monitors.

---

## Deployment

### Required environment variables (Tier 0)

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
REVALIDATE_SECRET                # any 32+ char string
```

That's it. The app boots and runs the gallery + admin panel with just these.

### Optional environment variables (turn features on)

```
# Enable Redis-backed cache + rate limiting + cross-instance like counter
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN

# Switch image storage from Supabase Storage → Cloudinary
CLOUDINARY_CLOUD_NAME
CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET

# Enable Sentry error reporting
SENTRY_DSN

# Enable Axiom log shipping
AXIOM_TOKEN
AXIOM_DATASET

# Switch search from Postgres FTS → Meilisearch
MEILISEARCH_HOST
MEILISEARCH_API_KEY
```

### Vercel cron jobs (optional — only relevant on Tier 1+)

- `*/1 * * * *` → `/api/cron/flush-likes` (no-op if no Redis, so always safe to enable)
- `0 */6 * * *` → `/api/cron/refresh-trending`

---

## Free-Tier Ceilings

| Service        | Free tier                       | Outgrown around                      |
|----------------|---------------------------------|--------------------------------------|
| Supabase Free  | 500 MB DB, 2 GB egress, 1 GB storage | ~5–10k DAU / 50k images         |
| Vercel Pro     | 1 TB bandwidth, $20/mo base     | viral spike                          |
| Upstash Free   | 10k commands/day                | ~1k DAU                              |
| Sentry Free    | 5k events/mo                    | first noisy bug                      |

**Cost trajectory:**
- Tier 0 (launch): **$0–20/mo** (only Vercel Pro if AdSense is live)
- Tier 1 (growth): **$30–60/mo**
- Tier 2 (scale):  **$100–200/mo**

---

## Phased Roadmap

### Phase 0 — Ship Lean (target: 0–1k images, 0–500 DAU)
- Supabase (DB + Auth + Storage) + Vercel — that's the entire infrastructure
- Schema with all columns/indexes/FTS as specified
- Service / repo / adapter layering with **default in-process backends**
- Cursor pagination
- ISR + on-demand revalidation
- AdSense application after first ~50 entries with descriptions
- Sentry/Axiom/Plausible explicitly **not** enabled

### Phase 1 — Grow (1k–100k images, 500–10k DAU)
- Add `UPSTASH_REDIS_REST_URL` → cache, rate limit, like counter all upgrade
- Add `SENTRY_DSN` → error reporting upgrades
- Add Plausible → analytics
- Materialized views for trending / most-liked
- Sitemap index (paginated, >5k URLs per file)

### Phase 2 — Scale (100k–1M+ images, 10k+ DAU)
- Add `CLOUDINARY_*` → storage migrates (existing rows still served via `storage_provider` field)
- Add `MEILISEARCH_HOST` → search upgrades
- Supabase Pro: read replica, daily backups
- Background queue (QStash / Inngest) for async work
- Optional: pgvector embeddings for "similar prompts"

---

## Future Scope (Beyond v1)

- User accounts (Supabase Auth) — saved collections, personal likes
- Comments per image
- AI prompt generator (suggest prompts from tags via cheap LLM)
- pgvector embedding-based "similar images"
- Multi-language SEO
- Public API with API keys for third-party access

---

## Decision Log

| Decision                                  | Why                                                                |
|-------------------------------------------|--------------------------------------------------------------------|
| Adapter pattern for every external service| Lets Tier 0 launch with zero paid services; upgrades are env-only  |
| Single `lib/config.ts`                    | No `process.env` scattered across the codebase                     |
| Default to Supabase Storage, not Cloudinary | One fewer service at launch                                      |
| Likes off `images` row, in `like_counts`  | Hot path stays cacheable; row-level contention avoided             |
| Tags normalized into join table           | `text[]` doesn't scale; tag pages need indexes                     |
| Cursor pagination from day one            | API contract change is painful later                               |
| Service / repo layer                      | Single biggest factor for refactor velocity                        |
| Vercel Pro from launch                    | Hobby ToS forbids monetized sites                                  |
| Per-image SEO pages                       | Single-page galleries don't rank                                   |
| `description` column                      | AdSense approval requires original written content                 |
| Tap-to-flip on mobile                     | Touch devices have no hover                                        |
| `storage_key` + `storage_provider` columns | Lets you migrate storage providers per-row, no big-bang migration |
| `width`/`height` stored                   | Eliminates CLS, improves Core Web Vitals → SEO                     |
