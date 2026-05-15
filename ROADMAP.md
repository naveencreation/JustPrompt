# ROADMAP — AI Prompt Gallery

> Build sequence from empty repo → live Tier 0 launch → ready-to-grow.
> The **what** lives in [`ProjectSpec.md`](./ProjectSpec.md). The **how** (conventions) lives in [`.cursor/rules/`](./.cursor/rules). This file is the **order**.

Each phase has:
- **Deliverables:** concrete artifacts produced
- **Definition of Done (DoD):** how you know the phase is complete
- **Blocked by:** phases that must finish first

Estimated solo effort assumes ~4 focused hours/day. Adjust to taste.

---

## Phase 0 — Repo Initialization

**Goal:** A blank Next.js project that boots locally with the conventions baked in. No features yet.

**Estimated time:** 2–3 hours.

**Blocked by:** none.

### Steps

1. **Scaffold Next.js into the current folder** (your spec, rules, AGENTS.md must survive).
   ```bash
   npx create-next-app@latest . --typescript --app --tailwind --eslint --src-dir=false --import-alias "@/*" --no-turbopack
   ```
   When prompted about overwriting `README.md` or existing files, say no. Move generated `README.md` content into the existing one if needed.

2. **Pin Node version.** Create `.nvmrc`:
   ```
   20
   ```

3. **Switch to pnpm** (faster, aligns with most Next.js tutorials):
   ```bash
   corepack enable
   corepack prepare pnpm@latest --activate
   rm -rf node_modules package-lock.json
   pnpm install
   ```

4. **Install runtime dependencies:**
   ```bash
   pnpm add @supabase/supabase-js @supabase/ssr zod
   ```

5. **Install dev dependencies:**
   ```bash
   pnpm add -D vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom \
     @types/node prettier prettier-plugin-tailwindcss \
     supabase
   ```

6. **Configure `tsconfig.json`** for strict mode (the `typescript.mdc` rule expects it):
   ```jsonc
   {
     "compilerOptions": {
       "strict": true,
       "noUncheckedIndexedAccess": true,
       "noImplicitOverride": true,
       "noFallthroughCasesInSwitch": true,
       "verbatimModuleSyntax": true
     }
   }
   ```

7. **Create `.prettierrc`** + `.prettierignore`. Singleton config — no nested overrides.

8. **Update `.gitignore`:** add `.env.local`, `.env*.local`, `coverage/`, `.vercel/`, `*.log`.

9. **Create `.env.example`** with **only** the four required Tier 0 variables:
   ```
   NEXT_PUBLIC_SUPABASE_URL=
   NEXT_PUBLIC_SUPABASE_ANON_KEY=
   SUPABASE_SERVICE_ROLE_KEY=
   REVALIDATE_SECRET=
   ```

10. **Create the empty folder skeleton** matching `ProjectSpec.md` § "Project Folder Structure":
    ```
    app/(public)/  app/admin/  app/api/
    components/{gallery,admin,shared}/
    lib/{config.ts,db,repos,services,storage,cache,ratelimit,observability,search,utils,constants}/
    supabase/migrations/
    ```
    Add a `.gitkeep` in each empty folder so they survive git.

### DoD
- `pnpm dev` boots and shows the Next.js default page on `localhost:3000`.
- `pnpm build` succeeds with zero TS errors.
- `git log` has a clean initial commit.

---

## Phase 1 — Supabase + Database Schema

**Goal:** A live Supabase project with the full schema, RLS, indexes, and FTS column. Production DB is reachable from local dev.

**Estimated time:** 3–4 hours.

**Blocked by:** Phase 0.

### Steps

1. **Create a Supabase project** at supabase.com (free tier, region close to your users).

2. **Copy the three credentials** into `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL` (project URL)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (anon public key)
   - `SUPABASE_SERVICE_ROLE_KEY` (service role — server only)
   - Generate a random `REVALIDATE_SECRET` (any 32+ char string).

3. **Initialize the Supabase CLI** in the repo:
   ```bash
   pnpm supabase init
   pnpm supabase link --project-ref <your-project-ref>
   ```

4. **Write the initial migration.** Create `supabase/migrations/0001_initial_schema.sql` containing **everything** from `ProjectSpec.md` § Database Schema:
   - `images` table + generated `search_vector` column + 3 indexes
   - `tags` + `image_tags` join table
   - `like_counts` table
   - `settings` singleton table
   - Triggers for `updated_at`
   - **RLS enabled on every table** (the `database.mdc` rule requires this)
   - RLS policies: anon can `select` from `images` where `is_published=true`; service_role bypasses; authenticated admin can do anything.

5. **Apply the migration:**
   ```bash
   pnpm supabase db push
   ```

6. **Generate TypeScript types** from the live schema:
   ```bash
   pnpm supabase gen types typescript --linked > lib/db/database.types.ts
   ```
   Add this command to a `package.json` script: `"db:types": "supabase gen types typescript --linked > lib/db/database.types.ts"`.

7. **Create the Supabase clients** at `lib/db/client.ts`:
   - `createServerClient()` — service-role on the server.
   - `createBrowserClient()` — anon key, browser only.
   - `createRouteClient()` — for Server Actions / Route Handlers, uses cookies.

8. **Seed one test row** via the Supabase SQL editor so future code has data to query.

### DoD
- Migration applied; running it twice is idempotent (or properly versioned).
- `lib/db/database.types.ts` exists and matches the schema.
- A trivial test query from the Next.js app returns the seed row.
- RLS verified: anon key cannot read unpublished rows.

---

## Phase 2 — Config + Adapter Skeletons (Tier 0 only)

**Goal:** Every external capability has an interface and a working **default** implementation. No paid services touched.

**Estimated time:** 4–6 hours.

**Blocked by:** Phase 1.

### Steps

1. **Create `lib/config.ts`** exactly as in `ProjectSpec.md` § "lib/config.ts". This is the **single source of truth** for env vars (the `architecture.mdc` rule). Validate with zod, throw on boot if required vars are missing.

2. **Cache adapter** (`lib/cache/`):
   - `index.ts` — `Cache` interface (`get`, `set`, `incr`, `del`).
   - `memory.ts` — in-process LRU + TTL via a `Map` with eviction.
   - `factory.ts` — exports `cache` (Tier 0 returns `MemoryCache`).

3. **Storage adapter** (`lib/storage/`):
   - `index.ts` — `Storage` interface (`signedUploadUrl`, `delete`, `publicUrl`).
   - `supabase.ts` — uses Supabase Storage bucket `images`.
   - `factory.ts` — exports `storage` (Tier 0 returns `SupabaseStorage`).
   - Create the `images` bucket in Supabase dashboard, public read, signed write.

4. **Rate limit adapter** (`lib/ratelimit/`):
   - `index.ts` — `RateLimit` interface (`check(key, limit, windowSec)` → boolean).
   - `memory.ts` — token bucket per instance (sufficient for Tier 0).
   - `factory.ts` — exports `rateLimit`.

5. **Observability adapters** (`lib/observability/`):
   - `logger.ts` — `Logger` interface; `ConsoleLogger` writes structured JSON (event name + meta) per the `logging.mdc` rule.
   - `errors.ts` — `ErrorReporter` interface; `ConsoleErrorReporter` calls `console.error` with stack.
   - Both factories export singletons `logger` and `errors`.

6. **Search adapter** (`lib/search/`):
   - `index.ts` — `Search` interface (`query(q, opts)` → cursor-paginated results).
   - `postgres.ts` — uses `search_vector` + `websearch_to_tsquery`.
   - `factory.ts` — exports `search`.

7. **Constants** (`lib/constants/`):
   - `http.ts` — `HTTP.OK`, `HTTP.BAD_REQUEST`, etc. (the `typescript.mdc` magic-numbers rule).
   - `limits.ts` — `PAGE_SIZE`, `LIKE_RATE_LIMIT`, `MAX_TAGS_PER_IMAGE`, etc.
   - `cache.ts` — `CACHE_TTL_GALLERY`, `CACHE_TTL_LIKE`, etc.

8. **Utilities** (`lib/utils/`):
   - `cursor.ts` — `encodeCursor` / `decodeCursor` (base64url of `{createdAt, id}`).
   - `slug.ts` — `generateSlug(prompt)` with collision handling.

9. **Write contract tests** for every adapter under `lib/<capability>/__tests__/`. The same test suite must pass against future Tier 1 implementations (per `testing.mdc`).

### DoD
- `pnpm test` passes against all default adapters.
- `lib/config.ts` is the only file in the repo that reads `process.env` (verify with `grep -r "process.env" --exclude-dir=node_modules --exclude=lib/config.ts`).
- A scratch script can call each adapter and round-trip data.

---

## Phase 3 — Repos + Services

**Goal:** Business logic isolated from HTTP. Repos return plain typed objects; services orchestrate.

**Estimated time:** 6–8 hours.

**Blocked by:** Phase 2.

### Steps

1. **Zod schemas** (`lib/db/schema.ts`) — one per table, mirroring `database.types.ts` but with branded IDs (`ImageId = z.string().uuid().brand<"ImageId">()`).

2. **Repos** (`lib/repos/`) — pure DB access, no business logic:
   - `imageRepo.ts` — `findById`, `findBySlug`, `listPublished({before, limit})`, `create`, `update`, `delete`.
   - `tagRepo.ts` — `findOrCreate`, `attachToImage`, `listByImage`, `popular`.
   - `likeRepo.ts` — `getCount`, `incrementBy(imageId, delta)`.
   - All list functions use **cursor pagination** (`database.mdc` rule).

3. **Services** (`lib/services/`) — accept dependencies via factory:
   - `imageService.ts` — `listGallery({cursor, sort, tag})`, `getBySlug`, `create`, `update`, `delete`. Calls `cache` for hot reads. Calls `storage.delete` on remove.
   - `likeService.ts` — `like(imageId, ip)` → rateLimit + cache.incr + dirty flag. `getCount(imageId)` merges persisted + delta. Tier 0 just writes through to Postgres.
   - `searchService.ts` — `query(q, cursor)` delegates to the `search` adapter.
   - `adminService.ts` — `getDashboardStats`, `setFeaturedImage`, `toggleMaintenanceMode`.

4. **Service factories** — `createImageService({imageRepo, cache, storage, logger})` style. Production code wires real instances; tests inject in-memory fakes (`testing.mdc`).

5. **Tests** — every service method has at least one happy-path and one error-path test using in-memory deps.

### DoD
- `pnpm test` passes with full coverage on services.
- No service file imports from `lib/db/client.ts` directly — only via repos.
- No repo file imports from a service.

---

## Phase 4 — API Routes + Auth Middleware

**Goal:** HTTP surface for everything the UI will need. Public reads cached, mutations rate-limited and authenticated.

**Estimated time:** 5–7 hours.

**Blocked by:** Phase 3.

### Steps

1. **Auth helpers** (`lib/auth/`):
   - `requireAdminSession(req)` — throws `401` if no valid Supabase session.
   - `getOptionalSession(req)`.

2. **Middleware** (`middleware.ts`):
   - `/admin/*` → redirect to `/admin/login` if no session.
   - Maintenance mode check (reads `settings.maintenance_mode`, cached for 60s) — public routes show a banner page; admin routes still work.

3. **Public API routes:**
   - `app/api/images/route.ts` — `GET` (cursor paginated, optional `tag`, `sort`).
   - `app/api/images/[id]/route.ts` — `GET` single image.
   - `app/api/search/route.ts` — `GET` FTS query.
   - `app/api/like/[id]/route.ts` — `POST`, rate-limited.
   - All public reads return `Cache-Control: public, s-maxage=60, stale-while-revalidate=300` (`api-routes.mdc`).

4. **Admin API routes:**
   - `app/api/images/route.ts` — `POST` (create).
   - `app/api/images/[id]/route.ts` — `PUT`, `DELETE`.
   - `app/api/admin/auth/route.ts` — `POST` (login), `DELETE` (logout).
   - `app/api/admin/upload-signature/route.ts` — `POST` returns signed Supabase Storage upload URL.
   - `app/api/revalidate/route.ts` — `POST`, secured by `REVALIDATE_SECRET`, calls `revalidateTag`.

5. **Health check:** `app/api/health/route.ts` — pings DB + adapter health, returns JSON. No auth.

6. **Validation everywhere** — every route parses the request with a zod schema before calling a service (`api-routes.mdc`).

### DoD
- All routes return correct status codes (no `200` for errors).
- `curl` smoke tests for the happy path of each route documented in `docs/api-smoke.md`.
- Rate limiting verified by hammering `/api/like/<id>` from a script.

---

## Phase 5 — Public UI (Gallery + Per-Image Pages)

**Goal:** Beautiful, accessible, mobile-friendly public site that works without admin features.

**Estimated time:** 8–12 hours. Use the **Impeccable** and **minimalist-ui** skills here (`/impeccable shape`, then `/impeccable craft`).

**Blocked by:** Phase 4.

### Steps

1. **Root layout** (`app/layout.tsx`):
   - Font setup (avoid Inter — `impeccable` flags it as a tell).
   - Theme provider, toast container.
   - Conditional AdSense script (`<Script>` with `strategy="afterInteractive"`, only when `NEXT_PUBLIC_ADSENSE_CLIENT` is set — keep it Tier 0 friendly).

2. **Gallery page** (`app/(public)/page.tsx`):
   - RSC, ISR `revalidate = 60`.
   - First page rendered server-side; subsequent pages via client-side fetch to `/api/images`.
   - `<GalleryGrid>` (masonry) + `<SearchBar>` + `<TagFilter>` + Prompt of the Day pinned at top.

3. **Components** (`components/gallery/`):
   - `ImageCard.tsx` — mobile tap-to-flip + desktop hover (`components.mdc`); explicit width/height for zero CLS.
   - `Lightbox.tsx` — focus trap, escape closes, prev/next.
   - `SearchBar.tsx` — debounced, hits `/api/search`.
   - `TagFilter.tsx` — chip buttons.
   - `SkeletonCard.tsx` — loading state.

4. **Per-image page** (`app/(public)/p/[slug]/page.tsx`):
   - `generateStaticParams` for top N images, ISR for the rest.
   - `<h1>` is the prompt.
   - OpenGraph + Twitter Card meta.
   - JSON-LD `ImageObject` + `CreativeWork`.
   - Related images (shared tags).

5. **Tag page** (`app/(public)/t/[slug]/page.tsx`) — same shape as gallery, filtered.

6. **Sitemap** (`app/sitemap.ts`) — paginated index when >5,000 URLs.

7. **`robots.txt`** — generated via `app/robots.ts`.

8. **Run `/impeccable polish gallery`** — final design pass before moving on.

### DoD
- Lighthouse mobile score ≥ 90 on Performance, Accessibility, Best Practices, SEO.
- CLS = 0 on the gallery and per-image pages.
- Tap-to-flip works on a real phone (test, don't trust the emulator).
- `<TestSEO>` checks: title, description, OG image, JSON-LD all present and unique per image.

---

## Phase 6 — Admin Panel

**Goal:** A single admin can upload, manage, and feature content.

**Estimated time:** 8–10 hours.

**Blocked by:** Phase 5 (or parallel — they share components).

### Steps

1. **Admin layout** (`app/admin/layout.tsx`) — checks session, shows admin nav.

2. **Login page** (`app/admin/login/page.tsx`) — Supabase Auth UI or custom form, exponential backoff after 5 failures.

3. **Dashboard** (`app/admin/dashboard/page.tsx`) — totals, most-liked, recent 5, quick actions.

4. **Upload page** (`app/admin/upload/page.tsx`):
   - Drag & drop or click.
   - Calls `/api/admin/upload-signature` for direct-to-storage upload (bypasses Vercel function limits).
   - Form: prompt, description, tags chips, model dropdown.
   - Live `<CardPreview>` matching public render.
   - Publish / Save Draft buttons.

5. **Manage page** (`app/admin/manage/page.tsx`) — table view, server-side filters, inline edit, delete with confirm, bulk select, drag to reorder (`react-dnd` or HTML5 native).

6. **Settings page** (`app/admin/settings/page.tsx`) — featured image picker, maintenance toggle, manual sitemap regen, manual likes flush, adapter status panel.

7. **Run `/impeccable polish admin/manage`** etc. for each admin screen.

### DoD
- An admin can upload an image, fill metadata, publish, and see it appear on the public gallery within 30 seconds (after revalidation).
- Editing prompt/tags propagates to the public page on next request.
- Delete removes the image from both the DB and Supabase Storage.

---

## Phase 7 — Polish, Quality, Pre-Launch

**Goal:** Anything you'd wish you'd done if launch were tomorrow.

**Estimated time:** 4–6 hours.

**Blocked by:** Phases 5 + 6.

### Steps

1. **Error boundaries** at app/page level + per-route `error.tsx` files.

2. **Loading UI** (`loading.tsx`) for slow segments.

3. **404 + 500 pages** — branded, with link back home.

4. **Accessibility audit:**
   - Keyboard navigation works end-to-end (Tab through gallery, Enter opens lightbox, Esc closes).
   - All images have meaningful `alt`.
   - Color contrast AA minimum (use Impeccable's audit).

5. **SEO checklist:**
   - Unique title + meta description per page.
   - Canonical URLs.
   - Sitemap submitted to Google Search Console.
   - Open Graph image dimensions correct.

6. **Run `/impeccable audit`** across the whole site.

7. **Seed content** — at least 50 entries with descriptions (the AdSense floor mentioned in `ProjectSpec.md`).

8. **Backup migration** — verify a fresh Supabase project can be set up from `supabase/migrations/` alone.

9. **Documentation:**
   - `README.md` — setup, run, deploy.
   - `docs/api-smoke.md` — curl recipes.
   - `docs/runbook.md` — common ops tasks (manual flush, regenerate sitemap, restore from backup).

### DoD
- Lighthouse ≥ 90 on all four categories.
- All TypeScript errors resolved (`pnpm tsc --noEmit` clean).
- All tests passing (`pnpm test`).
- ESLint clean.
- A teammate could clone the repo, follow `README.md`, and have it running in <15 minutes.

---

## Phase 8 — Deploy to Vercel

**Goal:** Live URL, working in production, monetization-ready.

**Estimated time:** 2–3 hours.

**Blocked by:** Phase 7.

### Steps

1. **Push to GitHub** (private repo while pre-launch, public optional).

2. **Connect to Vercel** — choose **Pro plan** ($20/mo) since AdSense is the goal (Hobby ToS forbids monetized sites — see `ProjectSpec.md`).

3. **Set environment variables** in Vercel project settings — only the four required ones for Tier 0.

4. **Deploy.** Verify the URL works, gallery loads, admin login works.

5. **Custom domain** — add it in Vercel, configure DNS, wait for cert.

6. **Vercel Cron Jobs** in `vercel.json`:
   ```json
   {
     "crons": [
       { "path": "/api/cron/flush-likes", "schedule": "*/1 * * * *" },
       { "path": "/api/cron/refresh-trending", "schedule": "0 */6 * * *" }
     ]
   }
   ```
   These are **no-ops at Tier 0** (cache is in-memory, no flush needed) but safe to enable.

7. **Robots + sitemap** verified on production URL.

8. **Apply for AdSense** — only after ~50 entries are live with descriptions and the site has a few days of organic traffic.

### DoD
- Production URL serves the gallery.
- Admin login from production works.
- Sentry/Plausible/etc. **explicitly not yet enabled** — confirms the Tier 0 path runs cleanly.

---

## Phase 9 — Tier 1 Upgrades (when metrics demand)

> **Don't do these preemptively.** Each is triggered by a real signal.

| Trigger                                     | Add                              | Code change |
|---------------------------------------------|----------------------------------|-------------|
| Supabase DB CPU > 30% sustained             | `UPSTASH_REDIS_REST_URL` + token | None — cache and rate-limit factories pick it up |
| First production bug you can't reproduce   | `SENTRY_DSN`                     | None — error reporter picks it up |
| Logs hard to grep in Vercel dashboard      | `AXIOM_TOKEN` + dataset          | None — logger picks it up |
| Want analytics                              | `NEXT_PUBLIC_PLAUSIBLE_DOMAIN`   | Add `<PlausibleScript>` to root layout (one line) |
| Cloudinary credits exhausted                | `CLOUDINARY_*`                   | None at runtime; new uploads write `storage_provider='cloudinary'` |
| Postgres FTS slow past 500k rows           | `MEILISEARCH_HOST` + key         | None — search factory picks it up |

After each addition, run the existing test suite. Adapter contract tests should still pass.

---

## Phase 10 — Tier 2 Upgrades (scale)

These are full architectural shifts. Defer until Phase 9 isn't enough.

- **Storage migration:** background job re-uploads existing Supabase-hosted images to Cloudflare R2, updates `storage_provider` per row.
- **Read replica:** Supabase Pro, route admin reads to primary, public reads to replica via separate client.
- **Background queue:** Inngest or QStash for async work (image processing, sitemap regen, embedding generation).
- **pgvector embeddings** of prompts → "similar prompts" feature.

---

## Working with the AI through this plan

For each phase:

1. Open the relevant section here.
2. Reference `ProjectSpec.md` for design details.
3. The rules in `.cursor/rules/` will auto-apply based on what files you're editing.
4. For UI phases (5, 6, 7), invoke design skills explicitly:
   - `/impeccable shape` before building a screen
   - `/impeccable craft` to build it
   - `/impeccable critique` for review
   - `/impeccable polish` before moving on
   - Apply `minimalist-ui` skill for the public gallery aesthetic
   - Apply `high-end-visual-design` for premium feel on the per-image page
   - Apply `full-output-enforcement` if the AI starts truncating long files

5. Always commit after each phase's DoD is met. Small, frequent commits.

---

## Daily routine while building

1. Pull latest, `pnpm install` if `package.json` changed.
2. `pnpm dev` in one terminal, `pnpm test --watch` in another.
3. Pick the next unchecked DoD bullet from the current phase.
4. Implement → tests pass → commit → push.
5. End of day: write a one-line note about what's next so tomorrow has zero startup cost.

---

## Stretch milestones (post-launch)

Once you have organic traffic and AdSense approval:

- **User accounts:** Supabase Auth for end-users → saved collections.
- **Comments per image** with moderation queue.
- **AI prompt generator** using a cheap LLM (Groq, Together) — suggest prompts from tags.
- **Embedding-based "similar images"** via pgvector.
- **Public API + API keys** so others can build on top.
- **Multi-language SEO** — `i18n` middleware, locale-prefixed URLs.

These are explicitly **not** in v1. Don't let them creep in early.

---

## When stuck

| Symptom | First thing to check |
|---|---|
| AI generates code that bypasses the service layer | Rules not loading — verify Cursor → Settings → Rules → Project Rules shows all 9 |
| `process.env.X` appearing somewhere outside `lib/config.ts` | The `architecture.mdc` rule is being ignored — re-emphasize in your prompt |
| Pagination feels slow | `OFFSET` snuck in somewhere — search the codebase |
| Tests pass locally, fail on Vercel | Time/env-dependent test (`testing.mdc` violation) |
| Can't decide between two approaches | Open `/impeccable critique` or ask the AI to argue both sides |

---

## Definition of project done

- Live at a custom domain.
- AdSense approved and earning.
- Every phase's DoD checked off.
- Repository has a contributor guide (anyone can clone and run).
- Post-launch monitoring shows error rate < 0.5% and p95 TTFB < 500ms on the gallery.
- You haven't enabled any Tier 1 service preemptively — only when metrics demanded it.

That's it. Ship.
