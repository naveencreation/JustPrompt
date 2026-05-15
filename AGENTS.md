# AGENTS.md

> Read this first. This file is the canonical onboarding document for any AI agent (Cursor, Claude Code, Codex, etc.) working on this repo.

## Project

**AI Prompt Gallery** — a Next.js + Supabase web app that displays AI-generated images alongside their prompts. Public masonry gallery, admin upload/management panel, monetized via Google AdSense.

The full design specification lives in [`ProjectSpec.md`](./ProjectSpec.md). When a question isn't answered here, check there.

## Architecture in one paragraph

Every external service is **pluggable behind an interface** with a free in-process default. The app boots on just Supabase + Vercel. Adding Upstash, Sentry, Cloudinary, Axiom, or Meilisearch is purely an environment-variable change — no code edits. A single `lib/config.ts` module reads env vars at boot and picks each implementation. Pages and API routes never touch the database directly; they go through services in `lib/services/*`, which go through repos in `lib/repos/*`.

## Tech stack (required)

- Next.js 15 (App Router) + TypeScript strict
- Supabase (Postgres + Auth + Storage)
- zod for boundary validation
- Vercel hosting (Pro plan once AdSense is live)

Optional services (enabled by env): Upstash Redis, Sentry, Cloudinary, Axiom, Meilisearch.

## Folder map

```
app/                Next.js routes — pages + API
  (public)/         Public gallery, /p/[slug], /t/[slug], sitemap
  admin/            Admin panel
  api/              API routes
components/         React components (gallery/, admin/, shared/)
lib/
  config.ts         ONLY file that reads process.env
  db/               Supabase client + zod schemas
  repos/            Raw DB queries (no business logic)
  services/         Business logic (used by pages + API)
  cache/            Adapter: memory (default) / redis (upgrade)
  storage/          Adapter: supabase (default) / cloudinary (upgrade)
  ratelimit/        Adapter: memory / redis
  observability/    Adapter: console / sentry / axiom
  search/           Adapter: postgres FTS / meilisearch
  utils/            cursor.ts, slug.ts, etc.
middleware.ts       Protects /admin, enforces maintenance mode
```

## How to run locally

```bash
pnpm install
cp .env.example .env.local
# Fill in NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
# SUPABASE_SERVICE_ROLE_KEY, REVALIDATE_SECRET — that's all you need.
pnpm db:migrate
pnpm dev
```

The app runs end-to-end on the four required env vars. All other env vars are opt-in upgrades.

## Conventions you MUST follow

These are also enforced by `.cursor/rules/`. The short version:

1. **`process.env` lives only in `lib/config.ts`.** Anywhere else is a bug.
2. **No `OFFSET` pagination, ever.** Cursor pagination via `lib/utils/cursor.ts`.
3. **No direct Supabase calls from pages or API routes.** Go through services → repos.
4. **No new external service** without an adapter (interface + default + upgrade + factory) and a free fallback.
5. **Validate every external input with zod** at the boundary.
6. **All errors via `errors.capture()`**, never raw `console.error` or direct Sentry.
7. **Likes are not stored on `images`.** They live in `like_counts` + cache.
8. **Tags are normalized.** `tags` + `image_tags` join, not `text[]`.
9. **Every image has explicit `width`/`height`** from the DB and renders via Next.js `<Image>`.
10. **Hover UX must have a tap equivalent.** Touch devices have no hover.

## Tier model

| Tier | What's enabled | Cost |
|------|---------------|------|
| 0 — Launch  | Supabase + Vercel only. Memory cache, console errors, Postgres FTS, Supabase Storage. | $0–20/mo |
| 1 — Grow    | + Upstash Redis, Sentry, Plausible. Likes upgrade to cross-instance. | $30–60/mo |
| 2 — Scale   | + Cloudinary, Meilisearch, Supabase Pro, background queue. | $100–200/mo |

Each upgrade is a Vercel env-var change, not a code change.

## Project philosophy

Principles, not rules. The rules live in `.cursor/rules/`; these are the *spirit* behind them.

- **Readability beats cleverness.** If a teammate (or future you) needs three minutes to parse a line, rewrite it.
- **Boring, explicit code wins.** Hidden behavior, magic, and excessive abstraction are bugs in waiting.
- **Each block has one responsibility.** When a function is doing two things, it's two functions.
- **Long-term maintainability over short-term speed.** Copy-paste is a debt, not a shortcut.
- **Fail loudly during dev, fail gracefully in production.** Silent catches are forbidden — log, capture, and either recover or rethrow.
- **Add complexity only when measurements demand it.** Caching, indexes, microservices, queues — all earned, never preemptive.
- **Naming is a feature.** A well-named function makes its docstring redundant.
- **Tests are documentation that doesn't lie.** If the behavior matters, there's a test for it.

## When in doubt

1. Check `.cursor/rules/` for the relevant `.mdc` file.
2. Check `ProjectSpec.md` for the design rationale.
3. Check `lib/config.ts` to see how a capability is wired today.
4. If you'd be adding a `process.env.*` check outside `lib/config.ts`, stop and use the adapter factory pattern instead.
