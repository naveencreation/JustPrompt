# How This System Actually Works

## AI Prompt Gallery — Complete Technical Analysis

---

## Phase 1: Repository Overview

### What problem this system solves

This is a **curated gallery of AI-generated images** where each image is displayed alongside the exact prompt that created it. Visitors browse a masonry grid, flip cards to reveal prompts, copy them, like images, and share them. The site is monetized via Google AdSense.

### Primary business purpose

To be the go-to reference for AI prompt inspiration — a community-driven gallery where people discover, copy, and learn from AI image prompts.

### Core workflows

1. **Visitor browsing** — scroll through the gallery, flip cards to see prompts, copy prompts, like images, search by tags/models
2. **Content management (admin)** — upload AI-generated images with prompts, publish/draft, organize, track analytics
3. **SEO acquisition** — every image has a dedicated SEO page (`/p/[slug]`) with JSON-LD, OG metadata, ISR for search crawlers
4. **Monetization** — AdSense in-feed ad slots every 12th gallery item, ad above fold on image detail pages

### Evidence from code

- `app/(public)/page.tsx` — main gallery page with `AdSlot` every 12 items
- `app/(public)/p/[slug]/page.tsx` — SEO image page with `generateMetadata`, JSON-LD, `generateStaticParams` (ISR)
- `app/admin/(authenticated)/dashboard/page.tsx` — admin dashboard with analytics (total images, views, likes, copies, search intelligence)
- `next.config.ts` — rewrites `/admin` to `/admin/dashboard`, sets CSP headers, compresses responses

---

## Phase 2: Repository Structure

```
JustPrompt/
├── app/                          Next.js App Router — pages + API routes
│   ├── layout.tsx                Root layout (fonts, AdSense script, metadata)
│   ├── globals.css               Tailwind v4 + theme tokens
│   ├── error.tsx                 Global error boundary
│   ├── not-found.tsx             404 page
│   ├── robots.ts                 Generated robots.txt
│   ├── sitemap.ts                Paginated sitemap index
│   ├── (public)/                 Public gallery route group
│   │   ├── layout.tsx            Sidebar + TopBar + BottomNav shell
│   │   ├── page.tsx              Gallery home (ISR 60s, Prompt of the Day)
│   │   ├── explore/page.tsx      Tag explorer
│   │   ├── p/[slug]/page.tsx     Image detail SEO page (ISR 3600s)
│   │   └── t/[slug]/page.tsx     Tag-filtered gallery (ISR 300s)
│   ├── admin/                    Admin panel
│   │   ├── layout.tsx            Pass-through (no sidebar)
│   │   ├── login/page.tsx        Login form
│   │   ├── error.tsx             Admin error boundary
│   │   └── (authenticated)/      Auth-gated admin routes
│   │       ├── layout.tsx        Session check + AdminShell sidebar
│   │       ├── dashboard/page.tsx
│   │       ├── upload/page.tsx
│   │       ├── manage/page.tsx
│   │       └── settings/page.tsx
│   ├── api/                      API endpoints
│   │   ├── images/               GET (list), POST (create), [id]/GET/PUT/DELETE
│   │   ├── images/reorder/       POST bulk reorder
│   │   ├── search/               GET full-text search
│   │   ├── like/[id]/            POST like
│   │   ├── metrics/view/[id]/    POST record view
│   │   ├── metrics/copy/[id]/    POST record copy
│   │   ├── models/               GET list, POST create
│   │   ├── tags/popular/         GET popular tags
│   │   ├── admin/auth/           POST login, DELETE logout
│   │   ├── admin/settings/       GET/POST maintenance + featured
│   │   ├── admin/upload-signature/ POST signed URL
│   │   ├── cron/flush-likes/     GET flush cache → DB
│   │   ├── cron/refresh-trending/ GET revalidate cache tag
│   │   ├── revalidate/           POST on-demand ISR
│   │   └── health/               GET health check
│   └── maintenance/page.tsx      Maintenance mode landing
├── components/                   React components
│   ├── admin/                    Admin UI (15 components)
│   │   ├── dashboard/            StatCard, ChartCard, BarChart, etc.
│   │   ├── AdminShell.tsx        Sidebar wrapper + cookie persistence
│   │   ├── AdminSidebar.tsx      Collapsible nav sidebar
│   │   ├── UploadForm.tsx        Drag-drop upload + form
│   │   ├── EntryTable.tsx        DnD table management
│   │   ├── EditImageModal.tsx    Inline edit modal
│   │   ├── ModelCombobox.tsx     Model autocomplete
│   │   ├── TagCombobox.tsx       Tag chip autocomplete
│   │   └── ...                   ConfirmModal, FeaturedImagePicker, etc.
│   ├── gallery/                  Gallery UI (8 components)
│   │   ├── GalleryGrid.tsx       Masonry + infinite scroll + lightbox
│   │   ├── ImageCard.tsx         Card with flip, copy, like
│   │   ├── Lightbox.tsx          Full-screen modal with focus trap
│   │   └── ...                   SkeletonCard, galleryControls, etc.
│   ├── icons/                    In-house SVG icons (35 exports)
│   │   ├── index.tsx             All icons, strokeWidth=1.5
│   │   └── animated/send.tsx     Motion-animated send icon
│   └── shared/                   Shared across public + admin (8 components)
│       ├── TopBar.tsx            Brand + search bar
│       ├── Sidebar.tsx           Desktop left nav
│       ├── BottomNav.tsx         Mobile bottom nav
│       ├── AdSlot.tsx            Google AdSense slot
│       ├── LikeButton.tsx        Like with optimistic update
│       ├── CopyButton.tsx        Copy + analytics
│       ├── ShareButtons.tsx      Twitter/Pinterest/WhatsApp
│       └── ViewTracker.tsx       Fire-and-forget view tracking
├── lib/                          Business logic (the engine)
│   ├── config.ts                 ONLY file reading process.env
│   ├── auth/index.ts             Auth guards (requireAdminSession, etc.)
│   ├── db/
│   │   ├── client.ts             Supabase client factories (browser/route/admin)
│   │   └── schema.ts             Zod schemas + branded types
│   ├── repos/                    7 data access objects (raw DB, no logic)
│   ├── services/                 8 orchestrators (business logic)
│   ├── cache/                    Adapter: memory (free) / redis (upgrade)
│   ├── storage/                  Adapter: supabase (free) / cloudinary (upgrade)
│   ├── ratelimit/                Adapter: memory / redis
│   ├── search/                   Adapter: postgres FTS / meilisearch (stub)
│   ├── observability/            Adapter: console / sentry + axiom
│   ├── hooks/                    useDebounce, useModels (SWR), useTags (SWR)
│   ├── constants/                cache, http, limits, tags, timing, ui
│   └── utils/                    cn (clsx+twMerge), cursor (pagination), slug
├── supabase/migrations/          5 SQL migration files
│   ├── 0001_initial_schema.sql   Core tables + RLS + triggers + FTS
│   ├── 0002_add_metrics.sql      copy_counts, view_counts, search_logs
│   ├── 0003_expand_models.sql    Additional model check values
│   ├── 0004_models_table.sql     Dedicated models table
│   └── 0005_search_tags_refinement.sql  Trigger-based FTS rebuild
├── docs/                         api-smoke.md, runbook.md
├── public/                       logo.png, window.svg, 1.svg, 2.svg
├── package.json                  Dependencies + scripts
├── next.config.ts                Rewrites, CSP, image domains, compression
├── proxy.ts                      Next.js middleware logic
├── vercel.json                   Cron jobs (flush-likes, refresh-trending)
├── vitest.config.ts              Testing config
├── .env.example                  Template with live credentials
└── AGENTS.md / ProjectSpec.md    AI agent onboarding + design spec
```

---

## Phase 3: Entry Points

### 1. Next.js Pages (Browser)

| Entry File | Trigger | Downstream Flow |
|---|---|---|
| `app/(public)/page.tsx` | `GET /` | `imageService.listGallery()` → `imageRepo.listPublished()` → DB → render `GalleryGrid` |
| `app/(public)/p/[slug]/page.tsx` | `GET /p/:slug` | `imageService.getBySlug()` → `imageRepo.findBySlug()` → DB → render detail page |
| `app/(public)/t/[slug]/page.tsx` | `GET /t/:slug` | `tagService.findBySlug()` → `imageService.listGallery({tag})` → render filtered gallery |
| `app/(public)/explore/page.tsx` | `GET /explore` | `tagService.listPopularWithPreviews()` → render tag grid |
| `app/admin/login/page.tsx` | `GET /admin/login` | Client-only login form → `POST /api/admin/auth` |
| `app/admin/(authenticated)/dashboard/page.tsx` | `GET /admin/dashboard` | `adminService.getDashboardStats()` → parallel repo calls → render dashboard |
| `app/admin/(authenticated)/upload/page.tsx` | `GET /admin/upload` | Render `UploadForm` |
| `app/admin/(authenticated)/manage/page.tsx` | `GET /admin/manage` | `imageService.listAll()` + `tagService.listPopular()` → render `EntryTable` |
| `app/admin/(authenticated)/settings/page.tsx` | `GET /admin/settings` | `adminService.getSettings()` → render `SettingsForm` |

### 2. API Routes (HTTP Endpoints)

| Entry File | Trigger | Auth Guard | Flow |
|---|---|---|---|
| `api/images/route.ts` | `GET` | None | See Phase 6 |
| `api/images/route.ts` | `POST` | `requireAdminMutation()` | Validate Zod → `imageService.create()` → DB insert + tag attach + search sync |
| `api/images/[id]/route.ts` | `PUT` | `requireAdminMutation()` | `imageService.update()` → DB update + tag sync |
| `api/images/[id]/route.ts` | `DELETE` | `requireAdminMutation()` | `imageService.remove()` → storage delete + DB delete |
| `api/images/reorder/route.ts` | `POST` | `requireAdminMutation()` | `imageRepo.updateOrder()` bulk |
| `api/like/[id]/route.ts` | `POST` | Rate-limit by IP | `likeService.like()` → delta cache + DB increment |
| `api/metrics/view/[id]/route.ts` | `POST` | None | `metricService.recordView()` → DB increment |
| `api/metrics/copy/[id]/route.ts` | `POST` | None | `metricService.recordCopy()` → delta cache + DB increment |
| `api/admin/auth/route.ts` | `POST` | None | Validate Zod → `authService.signIn()` → Supabase auth |
| `api/admin/auth/route.ts` | `DELETE` | None | `authService.signOut()` |
| `api/admin/settings/maintenance/route.ts` | `POST` | `requireAdminMutation()` | `settingsRepo.setMaintenanceMode()` |
| `api/admin/upload-signature/route.ts` | `POST` | `requireAdminMutation()` | `storage.signedUploadUrl()` |

### 3. Cron Jobs (Vercel Cron)

| Entry File | Trigger | Flow |
|---|---|---|
| `api/cron/flush-likes/route.ts` | Daily 3am (vercel.json) | `likeService.flush()` → iterate cached deltas → `likeRepo.incrementBy()` |
| `api/cron/refresh-trending/route.ts` | Daily 4am (vercel.json) | `revalidateTag(CACHE_TAG.GALLERY)` |

### 4. Background Processes

| Entry | Trigger | Flow |
|---|---|---|
| `searchSync.index()` | Called from `imageService.create/update` | No-op for Postgres (FTS triggers handle it); Meilisearch REST API when enabled |
| `ViewTracker` component | Browser mount on `/p/[slug]` | `POST /api/metrics/view/:id` → `metricService.recordView()` |

---

## Phase 4: Architecture Analysis

### Architectural Pattern: **Modular Monolith with Adapter Pattern**

This is a **Next.js App Router monolith** with strict layering and pluggable external service adapters. It's a single deployable (one Next.js app on Vercel) but with clear internal module boundaries.

**Why not microservices:** No service discovery, no inter-service auth, no independent scaling. Everything runs in one process.

**Why it's modular:** Clear separation of concerns with `app/` (routing), `components/` (UI), `lib/repos/` (data access), `lib/services/` (business logic), `lib/cache|storage|search|ratelimit|observability/` (adapters).

### Layers

```
┌─────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                        │
│  app/ pages + layouts + API routes + components/            │
├─────────────────────────────────────────────────────────────┤
│                    API / ROUTING LAYER                       │
│  API route handlers (app/api/**/route.ts)                   │
│  Zod input validation at boundary                           │
│  Auth guards (requireAdminSession/requireAdminMutation)     │
├─────────────────────────────────────────────────────────────┤
│                    SERVICE LAYER                             │
│  lib/services/ — 8 orchestration classes                    │
│  Business logic, caching, validation, cross-cutting         │
├─────────────────────────────────────────────────────────────┤
│                    DATA ACCESS LAYER                         │
│  lib/repos/ — 7 repository objects                          │
│  Raw Supabase queries, no business logic                    │
├─────────────────────────────────────────────────────────────┤
│                    INFRASTRUCTURE LAYER                      │
│  Adapter implementations (memory/redis, supabase/cloudinary)│
│  Supabase client factories (browser/route/admin)            │
│  Observability (console/sentry/axiom)                       │
└─────────────────────────────────────────────────────────────┘
```

**Interaction pattern:** Page/API → Service → Repo → Supabase client → PostgreSQL. Pages never touch `createAdminClient()` or `supabase.from()` directly.

---

## Phase 5: Dependency Graph

```
                         ┌──────────────────────┐
                         │    lib/config.ts     │  ← reads process.env ONCE
                         └──────────┬───────────┘
                  ┌─────────────────┼──────────────────┐
                  │                 │                  │
    ┌─────────────▼──┐   ┌────────▼────────┐  ┌───────▼──────────┐
    │ lib/constants/ │   │ lib/db/         │  │ Adapter Factories│
    │ (zero deps)    │   │ client + schema │  │ cache, storage,  │
    └───────┬────────┘   └───────┬─────────┘  │ ratelimit,search,│
            │                    │             │ observability    │
            │    ┌───────────────┼──────┐      └───────┬──────────┘
            │    │               │      │              │
            ▼    ▼               ▼      ▼              │
    ┌─────────────────────────────────────────┐       │
    │           lib/repos/ (7 files)           │       │
    │  imageRepo  likeRepo  metricRepo        │       │
    │  modelRepo  searchLogRepo  settingsRepo │       │
    │  tagRepo                                │       │
    │  (all use createAdminClient() internally)│       │
    └──────────────────┬──────────────────────┘       │
                       │                              │
                       ▼                              │
    ┌─────────────────────────────────────────┐       │
    │        lib/services/ (8 files)           │       │
    │  adminService  authService  imageService │       │
    │  likeService   metricService  modelService│      │
    │  searchService tagService                │       │
    └────────┬─────────┬──────────┬───────────┘       │
             │         │          │                    │
             ▼         ▼          ▼                    │
    ┌──────────────────────────────────────────┐      │
    │  lib/cache  lib/ratelimit  lib/storage    │◄─────┘
    │  lib/search  lib/observability            │
    └──────────────────────────────────────────┘
             │
             ▼
    ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
    │  lib/auth/   │  │ lib/hooks/   │  │ lib/utils/   │
    │  (route guard)│  │ (React + SWR)│  │ cn,cursor,slug│
    └──────────────┘  └──────────────┘  └──────────────┘
```

### Tight Coupling Concerns

- **None significant.** The adapter pattern decouples external services. The service→repo layering prevents DB coupling. The config.ts singleton centralizes env access.
- **No circular dependencies.** All imports flow downward: pages → services → repos → DB, or pages → services → adapters.
- **One architectural violation noted:** `proxy.ts` (middleware logic kept as a separate file, not in `middleware.ts`) reads `settingsRepo` directly without going through services. This is a minor leak of the data layer into middleware.

---

## Phase 6: API Analysis

### Gallery Image Listing

```
GET /api/images?cursor={cursor}&sort={sort}&tag={tagSlug}&limit={limit}
```
```
Request
 → app/api/images/route.ts (GET handler)
 → Zod: sort (new|likes|random), cursor (base64url), tagSlug, limit (max PAGE_SIZE)
 → imageService.listGallery({ sort, cursor, tagSlug, limit })
 → cache.get(galleryKey) → if hit: return cached
 → imageRepo.listPublished({ sort, cursor: decoded, tagSlug, limit })
 → createAdminClient().from("images").select("*").order().range() // cursor-paginated
 → PostgreSQL query on "images" with partial indexes
 → encodeCursor(lastItem) → cache.set(galleryKey, result, TTL)
 → Response: { items: ImageType[], nextCursor?: string, likeCounts?: Record }
```

Files involved: `app/api/images/route.ts`, `lib/services/imageService.ts`, `lib/repos/imageRepo.ts`, `lib/utils/cursor.ts`, `lib/cache/factory.ts`

### Like Image

```
POST /api/like/:id
```
```
Request (no body)
 → app/api/like/[id]/route.ts (POST handler)
 → Zod: params.id (validate)
 → likeService.like(id)
 → rateLimit.check(ip, LIMIT, WINDOW) → if exceeded: 429
 → cache.incr(`likes:${id}`, 1) → delta cached
 → likeRepo.incrementBy(id, 1) → DB RPC or .upsert()
 → logger.info("like registered")
 → Response: { count: newCount }
```

Files: `app/api/like/[id]/route.ts`, `lib/services/likeService.ts`, `lib/repos/likeRepo.ts`, `lib/ratelimit/factory.ts`, `lib/cache/factory.ts`

### Search

```
GET /api/search?q={query}&cursor={cursor}&limit={limit}
```
```
Request
 → app/api/search/route.ts (GET handler)
 → Zod: q (required, min 1), cursor, limit
 → searchService.query(q, { cursor, limit })
 → search.query(q, { cursor: decoded, limit }) → adapter
   ├── Postgres: .textSearch("search_vector", q, {type:"websearch"})
   └── Meilisearch: REST API /indexes/images/search (stub)
 → searchLogRepo.logSearch(q, results.length) (fire-and-forget)
 → encodeCursor(lastItem)
 → Response: { items: SearchResultItem[], nextCursor?, total }
```

Files: `app/api/search/route.ts`, `lib/services/searchService.ts`, `lib/search/factory.ts`, `lib/search/postgres.ts`, `lib/repos/searchLogRepo.ts`

### Admin Login

```
POST /api/admin/auth
Body: { email, password }
```
```
Request
 → app/api/admin/auth/route.ts (POST handler)
 → Zod: email (string.email), password (string.min(6))
 → authService.signIn(email, password)
 → createRouteClient().auth.signInWithPassword({ email, password })
 → Supabase Auth API → sets httpOnly session cookies
 → Response: { user: { id, email } } or { error }
```

Files: `app/api/admin/auth/route.ts`, `lib/services/authService.ts`, `lib/db/client.ts`

---

## Phase 7: Service Layer Analysis

| Service | Responsibility | Key Methods | Dependencies |
|---|---|---|---|
| **imageService** | CRUD for images, gallery listing with caching, tag attachment, search sync, storage cleanup | `listGallery()`, `getBySlug()`, `create()`, `update()`, `remove()`, `listAll()`, `null` revalidateTag | imageRepo, tagRepo, cache, storage, searchSync, logger, errors |
| **likeService** | Like counting with rate limiting, delta caching, batch fetches | `like()`, `getCount()`, `getBatch()`, `flush()`, `totalLikes()` | likeRepo, cache, rateLimit, logger |
| **adminService** | Dashboard aggregation (stats, top copied, search intelligence) | `getDashboardStats()`, `getSettings()` | imageRepo, likeRepo, metricRepo, searchLogRepo, settingsRepo, likeService, metricService |
| **authService** | Login/logout via Supabase Auth | `signIn()`, `signOut()` | createRouteClient(), logger |
| **searchService** | Full-text search delegation + result logging | `query()` | search adapter, searchLogRepo, errors |
| **metricService** | View/copy counting with delta caching | `recordCopy()`, `recordView()`, `flush()` | metricRepo, cache, logger |
| **modelService** | Cached model listing, create | `listAll()`, `create()` | modelRepo, cache |
| **tagService** | Tag management, popular tags, preview images | `listPopular()`, `listPopularWithPreviews()`, `findBySlug()`, `listByImage()` | tagRepo, imageRepo, cache |

---

## Phase 8: Database Analysis

### Database: PostgreSQL via Supabase

8 tables, 5 migration files, full RLS policies, GIN FTS indexes, trigger-based FTS maintenance.

### Entity-Relationship Diagram

```
┌──────────────┐       ┌──────────────┐
│    models    │       │   settings   │ (singleton, id=1)
│──────────────│       │──────────────│
│ PK slug (PK) │◄──────│ PK id (=1)   │
│   name       │       │ FK featured  │──┐
│   short_name │       │   maintenance│  │
└──────────────┘       └──────────────┘  │
       ▲                                  │
       │ FK (images.model→models.slug)    │ FK (ON DELETE SET NULL)
       │                                  │
┌──────┴──────────────────────────────────┘
│                  images                          │
│─────────────────────────────────────────────────│
│ PK id (uuid)                                    │
│    slug (UNIQUE), storage_key, image_url        │
│    width, height, prompt, description           │
│ FK model → models.slug                          │
│    is_published, display_order                  │
│    search_tags (text[]), search_vector (tsvector)│
│    created_at, updated_at                       │
└──────┬──────────┬──────────┬──────────┬─────────┘
       │ CASCADE  │ CASCADE  │ CASCADE  │ CASCADE
       ▼          ▼          ▼          ▼
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐
│like_counts│ │copy_counts│ │view_counts│ │ image_tags│
│──────────│ │──────────│ │──────────│ │───────────│
│PK image_id│ │PK image_id│ │PK image_id│ │PK image_id│
│  count    │ │  count    │ │  count    │ │PK tag_id  │──┐
│ updated_at│ │ updated_at│ │ updated_at│ └───────────┘  │
└──────────┘ └──────────┘ └──────────┘                  │
                                                         │ FK
                                                         ▼
                                              ┌──────────────┐
                                              │     tags      │
                                              │──────────────│
                                              │ PK id (serial)│
                                              │   name (UNIQUE)│
                                              │   slug (UNIQUE)│
                                              └──────────────┘

┌──────────────┐
│ search_logs  │  (append-only, no FK)
│──────────────│
│ PK id (bigserial)
│   query      │
│ results_count│
│ created_at   │
└──────────────┘
```

### Key Indexes
- `images_fts_idx` — GIN on `search_vector` (full-text search)
- `images_created_idx` — partial on `(created_at DESC, id DESC) WHERE is_published` (gallery cursor pagination)
- `images_order_idx` — partial on `(display_order ASC) WHERE is_published` (admin reorder)
- `images_slug_idx` — on `slug` (lookup by URL)
- `image_tags_tag_idx` — on `tag_id` (reverse tag→images lookup)
- `search_logs_query_idx` — on `query` (aggregation)

### RLS Summary
- Public SELECT on: `images` (published only), `tags`, `image_tags`, `like_counts`, `settings`, `models`
- Public INSERT/UPDATE/DELETE: **None** (all mutations via service_role admin client)
- Admin access: service_role key bypasses all RLS

---

## Phase 9: End-to-End Business Flows

### Flow 1: Visitor Browsing Gallery

```
Browser: GET /
 → app/(public)/page.tsx (server)
 → imageService.listGallery({ sort: "new", cursor: null })
 → cache.get("gallery:new:null") → miss
 → imageRepo.listPublished({ sort: "new", cursor: null, limit: 24 })
 → createAdminClient().from("images").select("*")
   .eq("is_published", true)
   .order("created_at", { ascending: false })
   .limit(24) → PostgreSQL → 24 rows
 → encodeCursor({ createdAt: lastRow.created_at, id: lastRow.id })
 → cache.set("gallery:new:null", { items, nextCursor }, 60s)
 → likeService.getBatch(ids) → DB join
 → Return: { items: ImageType[], nextCursor, likeCounts }
 → Render <FeaturedCard /> + <AdSlot /> + <GalleryGrid initialItems=... />
 → GalleryGrid mounts (client) → renders ImageCard × 24 in CSS columns
 → Scroll down → IntersectionObserver fires
 → FETCH /api/images?cursor=nextCursor&sort=new
 → Same path as server → append items → re-render
```

Files: `app/(public)/page.tsx`, `lib/services/imageService.ts`, `lib/repos/imageRepo.ts`, `lib/services/likeService.ts`, `lib/utils/cursor.ts`, `lib/cache/factory.ts`, `components/gallery/GalleryGrid.tsx`, `components/gallery/ImageCard.tsx`, `components/shared/FeaturedCard.tsx`

### Flow 2: User Likes an Image

```
Browser: click heart icon on ImageCard
 → ImageCard.handleLike() (client)
 → optimistic: setHasLiked(true), setOptimisticLikes(n+1), localStorage.setItem(`liked:${id}`, "1")
 → fetch("/api/like/:id", { method: "POST" })
 → app/api/like/[id]/route.ts (POST handler)
 → rateLimit.check(`like:${ip}`, 10, 3600) → Redis or memory sliding window
 → cache.incr(`likes:${imageId}`, 1) → delta cached for cron flush
 → likeRepo.incrementBy(imageId, 1) → RPC increment_like_count()
 → return Response { count: newCount }
 ← if OK: nothing (already optimistic)
 ← if fail: rollback setHasLiked(false), setOptimisticLikes(n-1), localStorage.removeItem(`liked:${id}`)
```

Files: `components/gallery/ImageCard.tsx`, `app/api/like/[id]/route.ts`, `lib/services/likeService.ts`, `lib/repos/likeRepo.ts`, `lib/ratelimit/factory.ts`, `lib/cache/factory.ts`

### Flow 3: Admin Uploads an Image

```
Browser: /admin/upload → UploadForm
 → User drops file → read dimensions from file
 → Click "Generate Upload URL"
 → fetch("/api/admin/upload-signature", { method: "POST" })
 → requireAdminMutation() → session + rate-limit check
 → storage.signedUploadUrl(key, contentType)
   ├── Supabase: supabase.storage.createSignedUploadUrl("images", key)
   └── Cloudinary: sha1 sign timestamp + params → signed URL
 → UploadForm receives { url, publicUrl }
 → PUT/POST file to storage signed URL
 → Click "Publish"
 → fetch("/api/images", { method: "POST", body: { slug, storageKey, ... } })
 → imageService.create(input)
 → imageRepo.create() → DB INSERT into images
 → tagRepo.findOrCreate(tags) → attachToImage() → image_tags INSERT
 → searchSync.index(image) → no-op (Postgres trigger handles FTS)
 → revalidateTag(CACHE_TAG.GALLERY)
 → Return { id, slug }
```

Files: `components/admin/UploadForm.tsx`, `app/api/admin/upload-signature/route.ts`, `lib/storage/factory.ts`, `lib/storage/supabase.ts` or `lib/storage/cloudinary.ts`, `app/api/images/route.ts`, `lib/services/imageService.ts`, `lib/repos/imageRepo.ts`, `lib/repos/tagRepo.ts`

### Flow 4: Cron Flushes Like Deltas

```
Vercel Cron @ 3am → GET /api/cron/flush-likes
 → likeService.flush()
 → cache.keys() → find all `likes:*` keys
 → for each key: delta = cache.get(key)
 → if delta > 0:
     likeRepo.incrementBy(imageId, delta)
     cache.del(key)
 → Same pattern for copy counts via metricService.flush()
 → logger.info("flush complete", { likesFlushed, copiesFlushed })
```

Files: `vercel.json`, `app/api/cron/flush-likes/route.ts`, `lib/services/likeService.ts`, `lib/services/metricService.ts`, `lib/repos/likeRepo.ts`, `lib/repos/metricRepo.ts`, `lib/cache/factory.ts`

---

## Phase 10: Background Processing

| Process | Trigger | Execution | Retry |
|---|---|---|---|
| Like delta flush | Vercel Cron (daily 3am) | `likeService.flush()` → iterate cache keys → `likeRepo.incrementBy()` | None (idempotent on next run) |
| Copy delta flush | Vercel Cron (daily 3am) | `metricService.flush()` → same pattern as likes | None |
| Trending revalidation | Vercel Cron (daily 4am) | `revalidateTag(CACHE_TAG.GALLERY)` | None |
| Search index sync | Image create/update | `searchSync.index(image)` → no-op (Postgres triggers handle it) or Meilisearch REST | None |
| View tracking | Browser mount | `ViewTracker` component → `POST /api/metrics/view/:id` → `metricRepo.incrementViewBy()` | None (fire-and-forget) |
| Search logging | Search request | `searchLogRepo.logSearch()` → fire-and-forget INSERT | None |

---

## Phase 11: External Integrations

| Service | Purpose | Auth | Files |
|---|---|---|---|
| **Supabase** | PostgreSQL + Auth + Storage | URL + anon key + service_role key | `lib/db/client.ts`, `lib/repos/*`, `lib/storage/supabase.ts` |
| **Upstash Redis** | Distributed cache + rate limiting | REST URL + token | `lib/cache/redis.ts`, `lib/ratelimit/redis.ts` |
| **Cloudinary** | Image CDN + storage | Cloud name + API key + secret (SHA-1 signing) | `lib/storage/cloudinary.ts` |
| **Google AdSense** | In-feed ad monetization | Client ID + slot IDs | `components/shared/AdSlot.tsx`, `lib/config.ts` |
| **Sentry** | Error tracking | DSN | `lib/observability/sentry.ts` (stub, logs to console) |
| **Axiom** | Structured logging | Token + dataset | `lib/observability/axiom.ts` |
| **Meilisearch** | Search engine | Host + API key | `lib/search/meilisearch.ts` (stub, throws) |
| **Vercel** | Hosting + cron jobs | — | `vercel.json`, `next.config.ts` |

### Failure Handling
- **Redis unavailable:** Falls back to memory (same process). If `require("./redis")` fails, the factory catches it and returns memory.
- **Cloudinary unavailable:** If `CLOUDINARY_CLOUD_NAME` is not set, Supabase Storage is used.
- **Sentry/Axiom:** Both have stub implementations that log to console if the service is unreachable.
- **Search logging failures:** `searchLogRepo.logSearch()` uses `.catch(noop)` — logging failures never affect the search response.

---

## Phase 12: Configuration Analysis

| Variable | Required | Default | Used In |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | **Yes** | — | `lib/config.ts`, `lib/db/client.ts` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **Yes** | — | `lib/config.ts`, `lib/db/client.ts` |
| `SUPABASE_SERVICE_ROLE_KEY` | **Yes** | — | `lib/config.ts`, `lib/db/client.ts` |
| `REVALIDATE_SECRET` | **Yes** | — | `api/revalidate/route.ts` |
| `NEXT_PUBLIC_APP_URL` | **Yes** | `http://localhost:3000` | `lib/config.ts`, metadata, sitemap |
| `UPSTASH_REDIS_REST_URL` | Tier 1 | — | `lib/cache/factory.ts`, `lib/ratelimit/factory.ts` |
| `UPSTASH_REDIS_REST_TOKEN` | Tier 1 | — | `lib/cache/redis.ts`, `lib/ratelimit/redis.ts` |
| `SENTRY_DSN` | Tier 1 | — | `lib/observability/errors.ts` |
| `AXIOM_TOKEN` | Tier 1 | — | `lib/observability/axiom.ts` |
| `CLOUDINARY_CLOUD_NAME` | Tier 2 | — | `lib/storage/cloudinary.ts` |
| `CLOUDINARY_API_KEY` | Tier 2 | — | `lib/storage/cloudinary.ts` |
| `CLOUDINARY_API_SECRET` | Tier 2 | — | `lib/storage/cloudinary.ts` |
| `MEILISEARCH_HOST` | Tier 2 | — | `lib/search/factory.ts` |
| `MEILISEARCH_API_KEY` | Tier 2 | — | `lib/search/meilisearch.ts` |
| `NEXT_PUBLIC_ADSENSE_CLIENT` | Monetization | — | `components/shared/AdSlot.tsx` |
| `ADSENSE_SLOT_GALLERY_INFEED` | Monetization | — | `components/shared/AdSlot.tsx` |
| `ADSENSE_SLOT_DETAIL_SIDEBAR` | Monetization | — | `components/shared/AdSlot.tsx` |
| `ADSENSE_SLOT_DETAIL_BELOW_CONTENT` | Monetization | — | `components/shared/AdSlot.tsx` |

---

## Phase 13: Authentication & Authorization

### No middleware — per-route auth

There is **no `middleware.ts`**. Auth is enforced at two levels:

1. **Layout-level** (admin pages): `app/admin/(authenticated)/layout.tsx` calls `getOptionalSession()` → redirects to `/admin/login` if no user
2. **API-level** (admin mutations): Each API route calls `requireAdminSession()` or `requireAdminMutation()` inline

### Auth flow

```
Login: POST /api/admin/auth
 → authService.signIn(email, password)
 → supabase.auth.signInWithPassword({ email, password })
 → Supabase validates credentials
 → Sets httpOnly session cookies (sb-access-token, sb-refresh-token)

Session check (server):
 → createRouteClient() → supabase.auth.getUser()
 → reads cookies from next/headers → validates with Supabase
 → returns User | null

Session check (layout):
 → getOptionalSession() → redirect("/admin/login") if null

Session check (API):
 → requireAdminSession() → throws AuthError(401) if null
 → requireAdminMutation() → requireAdminSession() + rateLimit.check()
```

### Permission model (RBAC)

- **Single admin role** — if you can log in, you're an admin. No role hierarchy.
- All mutations require both: authenticated Supabase user AND service_role key (via repos)
- The service_role key is the true authorization mechanism — it bypasses RLS entirely
- **No database-level admin role check** — the application trusts that if you passed `requireAdminSession()`, you're authorized

---

## Phase 14: Execution Trace

### Most Important Flow: Gallery Page Load (Visitor opens gallery)

```
1. Browser: GET /
   ↓
2. app/(public)/layout.tsx (server)
   renderPublicLayout()
   → Sidebar, TopBar, BottomNav wrappers
   → {children} = page.tsx
   ↓
3. app/(public)/page.tsx (server, ISR revalidate=60)
   GalleryHomePage()
   → imageService.listGallery({ sort: "new", cursor: null })
   ↓
4. lib/services/imageService.ts
   listGallery(opts)
   → cacheKey = "gallery:new:null"
   → cache.get(cacheKey) → null (first visit)
   → repos.imageRepo.listPublished(opts)
   ↓
5. lib/repos/imageRepo.ts
   listPublished({ sort: "new", cursor: null, limit: 24 })
   → query = supabaseAdmin.from("images").select("*")
     .eq("is_published", true)
     .order("created_at", { ascending: false })
     .limit(25)  // 25 to detect next page
   ↓
6. PostgreSQL
   → Uses index: images_created_idx (partial: created_at DESC, id DESC WHERE is_published=true)
   → Returns 25 rows
   ↓
7. lib/utils/cursor.ts
   encodeCursor({ createdAt: rows[23].created_at, id: rows[23].id })
   → base64url encode → nextCursor string
   ↓
8. lib/services/imageService.ts (continued)
   → cache.set(cacheKey, { items: rows.slice(0,24), nextCursor }, 60s)
   → likeService.getBatch(ids)
   ↓
9. lib/services/likeService.ts
   getBatch(ids)
   → cache.mget(`likes:${id}`) for all ids
   → likeRepo.getBatch(ids) for misses
   → return { [id]: count }
   ↓
10. Return to page.tsx
    → featuredImage = getPromptOfTheDay()
    → <PageContent>
      → <FeaturedCard image={featured} />
      → <AdSlot slotId="gallery-infeed" />
      → <GalleryGrid initialItems={items} nextCursor={...} likeCounts={...} />
    ↓
11. components/gallery/GalleryGrid.tsx (client, mounts in browser)
    GalleryGrid({ initialItems })
    → useState<ImageType[]>(initialItems) → first 24 cards
    → CSS columns masonry grid rendered
    → ImageCard × 24
    ↓
12. components/gallery/ImageCard.tsx (client)
    ImageCard({ image, likeCount, priority })
    → next/Image with aspect-ratio padding-bottom
    → priority={true} for first 12 (loading="eager")
    → priority={false} for rest (loading="lazy")
    → CSS columns determine position; cards flow by height
    ↓
13. Scroll down → IntersectionObserver fires
    → loadMore()
    → fetch("/api/images?cursor=nextCursor&sort=new")
    → Same path: api/images/route.ts → imageService.listGallery → repo → DB
    → append items to state → re-render new ImageCards
    → Repeat until nextCursor === null
```

---

## Phase 15: Code Quality Assessment

### Strengths

1. **Strict adapter pattern** — Every external service has a TypeScript interface, a free default, and a paid upgrade behind env vars. No runtime cost from unused adapters (lazy `require()`).
2. **Clean layering** — Pages → Services → Repos → DB. No leaks. `config.ts` is the single `process.env` boundary.
3. **Cursor pagination everywhere** — `OFFSET` is banned. All list queries use `(created_at, id) < (cursor)` pattern.
4. **Zod validation at boundaries** — Every API route validates input with Zod. DB schemas use branded types (`ImageId`, `TagId`).
5. **In-house icon system** — No icon library dependency. All SVGs hand-drawn with consistent `strokeWidth={1.5}`.
6. **Self-contained SWR hooks** — `useModels()` and `usePopularTags()` deduplicate with 60s stale time, re-exported from shared hooks.
7. **Optimistic UI with rollback** — LikeButton and ImageCard both optimistically update, persist to localStorage, and roll back on failure.
8. **Postgres FTS trigger maintenance** — Search index maintained by database triggers, not application code. No drift possible.
9. **AdSlot conditional rendering** — Returns `null` if AdSense not configured. Zero-cost when not monetized.
10. **Fire-and-forget analytics** — View tracking and search logging never block the user response.

### Weaknesses

1. **No middleware for route protection** — Auth checking is duplicated per-route. A new admin page could be added without auth by forgetting the layout guard.
2. **Service role bypass is single point of auth** — All mutations use `createAdminClient()` which bypasses RLS. If `requireAdminSession()` is forgotten on an API route, anyone can mutate data.
3. **Sentry stub** — `lib/observability/sentry.ts` logs to console with `source: "sentry"` but doesn't actually send to Sentry. Has a TODO comment.
4. **Meilisearch stub** — Constructor throws. Not yet implemented.
5. **proxy.ts as separate file** — Middleware logic lives in a separately-imported file instead of `middleware.ts`, which is unconventional and easy to miss.
6. **Dashboard is `force-dynamic`** — No caching on the admin dashboard, which makes heavy queries (7+ parallel DB calls) on every page load.
7. **searchLogRepo does in-memory aggregation** — `getTopQueries()` fetches last 500 rows and aggregates in JS. Won't scale past moderate traffic.
8. **No automated tests found** — `vitest.config.ts` exists but no `.test.ts` files were found in the codebase. Testing setup is present but unused.

### Architecture Drift

- **None detected.** The codebase strictly follows its own conventions (AGENTS.md, .cursor/rules/). The adapter pattern is consistently applied. No `process.env` reads exist outside `lib/config.ts`.

---

## Phase 16: Knowledge Transfer Document

# How This System Actually Works

## The architecture in one sentence

A Next.js App Router monolith where pages and API routes call **services** (orchestrators with business logic), which call **repos** (raw DB queries), which call **Supabase** (PostgreSQL behind a service-role client that bypasses RLS). Every external capability — cache, storage, rate limiting, search, logging, error reporting — is behind a TypeScript interface with a free default and a paid upgrade, selected by a single `lib/config.ts` file that reads `process.env`.

## The critical files a new engineer must read

1. **`lib/config.ts`** — The single env var boundary. Understand this to understand all feature flags.
2. **`lib/db/client.ts`** — Three Supabase clients: browser (anon, RLS enforced), route (anon, reads cookies), admin (service_role, RLS bypassed).
3. **`lib/services/imageService.ts`** — The central service. Gallery listing, CRUD, caching, search sync, revalidation.
4. **`app/(public)/page.tsx`** — Gallery home. Shows how ISR, service calls, and component props fit together.
5. **`components/gallery/GalleryGrid.tsx`** — The gallery component. Infinite scroll, lightbox, like management, AdSlot integration.
6. **`app/admin/(authenticated)/layout.tsx`** — Admin auth guard. Shows session checking and redirect pattern.

## The data flow

```
Browser → Page/API Route (app/)
  → Service (lib/services/) — orchestrates, caches, validates
    → Repo (lib/repos/) — raw DB queries, cursor pagination
      → createAdminClient() → Supabase Postgres
    → Adapter (lib/cache|storage|search|ratelimit|observability/)
      → Memory/Redis/Cloudinary/Sentry/Axiom/Meilisearch
```

## The runtime behavior

1. **First visit (cold):** Server renders gallery → 24 images from DB → ISR caches for 60s → client mounts GalleryGrid (hydrates from server HTML) → scroll triggers API fetch for next 24 → repeat
2. **Image detail:** Server renders `/p/[slug]` → ISR caches for 1hr → client mounts ViewTracker (fire-and-forget POST) → LikeButton with optimistic update → CopyButton with analytics
3. **Admin login:** POST to `/api/admin/auth` → Supabase Auth → sets cookies → redirect to `/admin/dashboard` → layout calls `getOptionalSession()` → passes → renders AdminShell with sidebar
4. **Upload:** Client POSTs to `/api/admin/upload-signature` → gets signed URL → uploads file directly to storage → POSTs metadata to `/api/images` → creates DB row + attaches tags + syncs search + invalidates cache
5. **Like:** Client clicks heart → optimistic UI + localStorage → POST `/api/like/:id` → rate-limited by IP → delta cached in Redis/memory → DB increment → daily cron flushes remaining deltas
6. **Cron (daily 3am):** Vercel hits `/api/cron/flush-likes` → iterates all `likes:*` and `copies:*` cache keys → flushes deltas to DB → clears keys

## The tier model

| Tier | Cost | What's enabled |
|---|---|---|
| 0 — Launch | $0–20/mo | Supabase + Vercel, memory cache, Postgres FTS, Supabase Storage, console logging |
| 1 — Grow | $30–60/mo | + Upstash Redis (cache + rate limit), Sentry, Axiom |
| 2 — Scale | $100–200/mo | + Cloudinary, Meilisearch, Supabase Pro |

Switching tiers is purely an env-var change. Setting `UPSTASH_REDIS_REST_URL` upgrades both cache and rate-limiting simultaneously. Setting `CLOUDINARY_CLOUD_NAME` switches storage. No code changes, no npm installs needed for Redis or Cloudinary (they use REST APIs directly).

## The conventions (enforced by .cursor/rules/)

1. `process.env` only in `lib/config.ts`
2. No `OFFSET` pagination — cursor pagination via `lib/utils/cursor.ts`
3. No direct Supabase calls from pages or API routes — go through services → repos
4. Every new external service gets an adapter (interface + default + upgrade + factory) with a free fallback
5. Validate every external input with Zod at the boundary
6. All errors via `errors.capture()`, never raw `console.error`
7. Likes are not stored on `images` — they live in `like_counts` + cache
8. Tags are normalized — `tags` + `image_tags` join, not `text[]`
9. Every image has explicit `width`/`height` from DB, renders via Next.js `<Image>`
10. Hover UX must have a tap equivalent (touch devices have no hover)
