-- ============================================================
-- AI Prompt Gallery — Metrics Schema
-- Adds: copy_counts, view_counts, search_logs
-- Run: pnpm db:push
-- ============================================================

-- ─── Copy Counts ───────────────────────────────────────────
-- Mirrors like_counts exactly. Hot counter lives in memory cache
-- (Tier 0) or Redis (Tier 1+). This table stores the durable total.
create table public.copy_counts (
  image_id    uuid primary key references public.images(id) on delete cascade,
  count       bigint not null default 0,
  updated_at  timestamptz not null default now()
);

-- Admin-only — no public read policy.
alter table public.copy_counts enable row level security;

-- ─── View Counts ───────────────────────────────────────────
-- Tracks unique page views on /p/[slug]. Written directly from
-- the ViewTracker client component via POST /api/metrics/view/[id].
create table public.view_counts (
  image_id    uuid primary key references public.images(id) on delete cascade,
  count       bigint not null default 0,
  updated_at  timestamptz not null default now()
);

-- Admin-only — no public read policy.
alter table public.view_counts enable row level security;

-- ─── Search Logs ───────────────────────────────────────────
-- Append-only log of every search query fired against /api/search.
-- results_count = 0 means a "failed" search — high-value content signal.
-- We do NOT log the user's IP or session for privacy.
create table public.search_logs (
  id            bigserial primary key,
  query         text not null,
  results_count integer not null default 0,
  created_at    timestamptz not null default now()
);

-- Indexes for fast aggregation queries used by the dashboard.
create index search_logs_query_idx   on public.search_logs (query);
create index search_logs_results_idx on public.search_logs (results_count);

-- Admin-only — no public read policy.
alter table public.search_logs enable row level security;

-- ─── Atomic increment RPCs ─────────────────────────────────
-- Mirrors increment_like_count. Prevents read-then-write races
-- when multiple serverless instances flush deltas simultaneously.

create or replace function public.increment_copy_count(
  p_image_id uuid,
  p_delta    bigint
) returns void
language plpgsql security definer as $$
begin
  insert into public.copy_counts (image_id, count)
  values (p_image_id, greatest(p_delta, 0))
  on conflict (image_id)
  do update set count      = public.copy_counts.count + p_delta,
                updated_at = now();
end;
$$;

create or replace function public.increment_view_count(
  p_image_id uuid,
  p_delta    bigint
) returns void
language plpgsql security definer as $$
begin
  insert into public.view_counts (image_id, count)
  values (p_image_id, greatest(p_delta, 0))
  on conflict (image_id)
  do update set count      = public.view_counts.count + p_delta,
                updated_at = now();
end;
$$;

-- ─── updated_at triggers ───────────────────────────────────
create trigger copy_counts_updated_at
  before update on public.copy_counts
  for each row execute function public.set_updated_at();

create trigger view_counts_updated_at
  before update on public.view_counts
  for each row execute function public.set_updated_at();
