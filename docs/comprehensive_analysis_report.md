# Comprehensive Repository Analysis Report

> **Methodology Note**: This entire report was reverse-engineered exclusively from the application’s source code, configurations, database models, and service logic—adhering strictly to the constraint of zero reliance on external architectural documentation.

---

## 1. Executive Summary & Product Overview

**Project Name**: AI Prompt Gallery
**Version**: `0.1.0` (as defined in `package.json`)

The application is a Next.js 15 (App Router) web application that serves as an "AI Prompt Gallery." It is a curated archive where users can browse, search, and copy AI-generated images paired with their exact generation prompts. 

Key product mechanics (evidenced by code):
- **Public Masonry Gallery**: A public-facing UI displaying images dynamically using `GalleryGrid` and `FeaturedCard` components (`app/(public)/page.tsx`).
- **Admin Dashboard**: A secure backend panel (`app/admin/*`) for managing images, viewing realtime stats (likes, views, prompt copies, copy rate, failed searches), and uploading content.
- **Monetization integration**: Built-in support for Google AdSense slots (Banner, Sidebar, Infeed) configured directly in `lib/config.ts`.
- **Pluggable Architecture Tiering**: The app dynamically swaps adapter implementations (cache, storage, rate-limiting, search, observability) based strictly on available environment variables.

---

## 2. Feature Inventory

Based on the actual APIs, pages, and components found in the tree:

### Public Features
- **Gallery Feed**: Fetches paginated images via `imageService.listGallery()` based on `sort`, `tagSlug`, and `limit`.
- **Image Detail View**: `/p/[slug]` route displaying prompt, image, and related images (`imageService.getRelated()`).
- **Tag Filtering**: Filtering images by active tag (e.g., `/t/[slug]`).
- **Prompt Copying**: Telemetry tracked via `copyCount` incrementation.
- **Liking Mechanism**: Optimistic UI like updates synchronized via `likeService` (with rate limiting).
- **Search**: Full-text search queries targeting image prompts. Tracks "Top Searches" and "Failed Searches" for content gap analysis (`searchLogRepo.ts`).

### Admin Features
- **Dashboard Analytics**: Tracks `totalImages`, `totalLikes`, `totalCopies`, `totalViews`, `copyRate`, `topCopied`, and `failedSearches` (`adminService.getDashboardStats()`).
- **Image Upload & Management**: Creates drafts or published images, attaches tags, uploads directly to chosen storage provider (`app/admin/manage`, `app/admin/upload`).
- **Maintenance Mode**: A database-driven toggle (`middleware.ts`) that intercepts public traffic and routes to `/maintenance`.

---

## 3. Architecture Analysis

The repository leverages a strict **Layered Architecture** with a Pluggable Adapter Pattern.

**Execution Flow (Boundary to Database)**:
1. **Next.js App Router (`app/`)**: Handles the HTTP request lifecycle. Direct DB queries are forbidden here.
2. **Services (`lib/services/`)**: Contains the business logic. Examples include `imageService`, `likeService`, `searchService`.
3. **Adapters/Factories (`lib/cache`, `lib/storage`, `lib/observability`)**: Abstracts external integrations based on `lib/config.ts`.
4. **Repositories (`lib/repos/`)**: The only layer containing direct database transactions (`supabase.from(...)`). PostgREST responses are mapped here to standard TypeScript interfaces (e.g., `toSnakeCase` and `fromRow`).

**Pluggable Adapter Factory Pattern**:
In `lib/config.ts`, capabilities are mapped dynamically:
- Cache: `memory` vs `redis` (Upstash)
- Storage: `supabase` vs `cloudinary`
- Errors: `console` vs `sentry`
- Search: `postgres` vs `meili` (Meilisearch)

If an env var (e.g., `UPSTASH_REDIS_REST_URL`) is present, the app upgrades its caching tier seamlessly.

---

## 4. Database Analysis

Based on `lib/db/schema.ts`, the database is PostgreSQL managed via Supabase.

### Primary Entities:
- **Image** (`images`): The core entity. Stores `id`, `slug`, `storageKey`, `storageProvider`, `imageUrl`, dimensions, `prompt`, `description`, `model`, `isPublished`, and `displayOrder`.
- **Tag** (`tags`): Stores categorization (`id`, `name`, `slug`). Many-to-many relationship with Images via an inferred `image_tags` join table (evident in `imageRepo.listPublished`).
- **Model** (`models`): Lookup table for AI generation models (e.g., Midjourney, DALL-E).
- **Telemetry Counters** (`like_counts`, `copy_counts`, `view_counts`): Separated from the `images` table to avoid massive row locks during high-frequency writes.
- **SearchLog** (`search_logs`): Tracks queries and `resultsCount` to identify user demand gaps.
- **Settings** (`settings`): A singleton row (`id: 1`) storing the `featuredImageId` and the `maintenanceMode` boolean.

> [!NOTE]
> Database interactions utilize Zod for rigorous validation at the boundary before writing to Supabase.

---

## 5. API Documentation

Internal APIs are located in `app/api/`. These serve as handlers for client components and webhooks:

- **`/api/like/[id]`**: POST. Increments the like count for an image. Rate-limited by IP/imageId (`lib/services/likeService.ts`).
- **`/api/images`**: Admin CRUD routes for image manipulation.
- **`/api/search`**: Processes client-side search requests, routing through `searchService.query()`.
- **`/api/cron/flush-counts`**: Background job endpoint. Likely flushes telemetry counts (likes, views, copies) from Upstash Redis (Tier 1 cache) down to the PostgreSQL database to reduce DB write pressure.
- **`/api/revalidate`**: Webhook to trigger Next.js cache invalidations (e.g., `revalidateTag(CACHE_TAG.GALLERY)`).

---

## 6. Frontend Analysis

- **Framework**: Next.js 15 (React 19).
- **Styling**: TailwindCSS 4 + Framer Motion for micro-animations.
- **State & Data Fetching**: Utilizes Server Components for initial load and SEO, mixed with client components for interactive states (`SWR` dependency found in `package.json` for client-side fetches).
- **Icons**: Lucide React.
- **Layouts**: 
  - `app/(public)/layout.tsx`: Standard wrapper with Canonical URLs.
  - `app/admin/layout.tsx`: Wraps the authenticated state with `AdminShell`, reads sidebar collapse state via cookies.

---

## 7. Backend Analysis

- **Pagination**: The codebase strictly uses **Cursor-based Pagination** (`decodeCursor`, `encodeCursor`) in `imageRepo.ts`. There is no `OFFSET` pagination, optimizing the DB for large datasets.
- **Caching**: Multi-layered caching.
  1. Next.js Data Cache (`revalidateTag`).
  2. Adapter Cache (`lib/cache/memory.ts` or `redis.ts`). Invalidation occurs on content creation (`invalidateGalleryCache`).
- **Error Handling**: `errors.capture(err)` from `lib/observability/errors.ts` is used universally instead of standard `console.error()`. This allows upgrading to Sentry without rewriting catch blocks.

---

## 8. Security Review

- **Authentication**: `middleware.ts` guards the `/admin` routes. It leverages `@supabase/ssr` to check `supabase.auth.getUser()`. Unauthenticated users are redirected to `/admin/login?redirectTo=...`.
- **Database Access**: `lib/repos/` utilizes `createAdminClient()`, meaning all internal server actions bypass RLS using the `SUPABASE_SERVICE_ROLE_KEY`. This implies tight access control is handled purely at the API/Service boundary.
- **Rate Limiting**: Applied to the liking mechanism to prevent abuse.
- **Maintenance Shield**: `middleware.ts` executes a raw fetch to the Supabase REST API (to avoid loading the heavy SDK) to check the `maintenanceMode` flag, shielding the app from public traffic during DB upgrades.

---

## 9. Infrastructure Review

- **Hosting Target**: Vercel (evident by `vercel.json` and standard Next.js constraints).
- **Database Provider**: Supabase (PostgreSQL).
- **Dependencies footprint**: Minimal. `zod`, `clsx`, `lucide-react`, `sharp` for image optimization.
- **Scale Vectors**: The app is designed to scale horizontally by filling environment variables:
  - Cache bottleneck -> Add `UPSTASH_REDIS_REST_URL`
  - Storage bottleneck -> Add `CLOUDINARY_CLOUD_NAME`
  - Search bottleneck -> Add `MEILISEARCH_HOST`
  - Observability -> Add `SENTRY_DSN` and `AXIOM_TOKEN`

---

## 10. Technical Debt Report

Based on the codebase inspection:
- **Low Tech Debt**: The layered architecture is rigorously enforced. The separation of `images` from their high-velocity counters (`like_counts`) is highly optimized.
- **Potential Risk**: `middleware.ts` makes a raw fetch request to the DB to check maintenance mode for every public route request. Although it has a `maintenanceCacheValue` with a TTL (`TIMING.MAINTENANCE_CACHE_MS`), edge cache invalidation across distributed Vercel edge functions might be slightly inconsistent.
- **Missing**: Automated rollback of external storage if a database insert fails (e.g., if Cloudinary succeeds but PG fails, an orphaned image is left in the cloud).

---

## 11. Complete End-to-End User Flows

**Flow: User copies a prompt**
1. User clicks "Copy Prompt" on the UI.
2. Client copies text to clipboard and fires async POST to telemetry API.
3. API routes to `metricService.logCopy(imageId)`.
4. `metricService` pushes the metric. If using Redis, it increments the hash map in Upstash. If using Memory, it executes `metricRepo.increment()` directly against PostgreSQL.
5. In the background, `app/api/cron/flush-counts` is triggered periodically, flushing Upstash hashes to PostgreSQL, resetting the Redis keys.

**Flow: Admin uploads an Image**
1. Admin submits form on `/admin/upload`.
2. Form data parsed/validated via Zod (`CreateImageInputSchema`).
3. Client uploads file bytes directly to Supabase Storage or Cloudinary. Gets `storageKey` and `imageUrl`.
4. Client POSTs metadata to `/api/images`.
5. `imageService.create()` inserts row via `imageRepo.create()`, attaches tags via `tagRepo.attachToImage()`.
6. `searchSync.index()` syncs the new row to Postgres FTS or Meilisearch.
7. Next.js cache is purged via `revalidateTag(CACHE_TAG.GALLERY)`.

---

## 12. Knowledge Transfer Guide

**Core Tenets for new engineers**:
- Never use `process.env` outside of `lib/config.ts`.
- Never query the database directly from a Next.js Page or API route. Always use a Service.
- Services must orchestrate between Repositories and Adapters.
- If you need a new external service, build an adapter interface in `lib/` and implement a free-tier default (e.g., Memory/Console/Supabase).

---

## 13. Reconstructed Product Requirement Document (PRD)

**Objective**: Build a lightning-fast, highly visual gallery of AI prompts that can scale from a free hobby tier to an enterprise tier purely by changing environment variables.

**Target Audience**: AI enthusiasts, prompt engineers, and artists.

**Core Requirements**:
- Must display images in a dynamic masonry layout.
- Must support instant prompt copying.
- Must track analytics (likes, copies, views) to determine "Most Loved" and "Top Copied" content.
- Must provide an admin dashboard that visualizes "Content Gaps" (failed searches).
- Must support AdSense natively.

---

## 14. Reconstructed Technical Design Document (TDD)

**System Architecture**: Serverless Next.js App Router.
**Data Store**: PostgreSQL via Supabase.
**Design Patterns**:
- **Repository Pattern**: Abstracting SQL/PostgREST.
- **Factory/Adapter Pattern**: Abstracting Cache, Storage, and Telemetry to allow tier-based infrastructure upgrades.

**Data Model Highlights**:
- Separation of `Image` metadata from telemetry (`LikeCount`, `CopyCount`).
- `Settings` table used as a singleton configuration anchor.
- Explicit mapping from snake_case database responses to camelCase application entities via strict Zod boundaries.

**Performance Strategies**:
- No offset pagination (Cursor only).
- Next.js fetch caching (`fetch` with `tags`).
- Deferred metric logging to prevent write-blocking the UI.
