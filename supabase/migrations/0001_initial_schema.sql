-- ============================================================
-- AI Prompt Gallery — Initial Schema
-- Run: pnpm db:push
-- ============================================================

-- ─── Extensions ────────────────────────────────────────────
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm";   -- needed for fast ILIKE fallback

-- ─── Images ────────────────────────────────────────────────
create table public.images (
  id                   uuid primary key default uuid_generate_v4(),
  slug                 text unique not null,
  storage_key          text not null,
  storage_provider     text not null default 'supabase' check (storage_provider in ('supabase', 'cloudinary')),
  image_url            text not null,
  width                integer not null,
  height               integer not null,
  prompt               text not null,
  description          text,
  model                text check (model in ('sdxl', 'dalle3', 'midjourney', 'flux', 'other')),
  is_published         boolean not null default false,
  is_featured          boolean not null default false,
  display_order        bigint not null default 0,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

-- Full-text search column (generated)
alter table public.images
  add column search_vector tsvector
    generated always as (
      setweight(to_tsvector('english', coalesce(prompt, '')), 'A') ||
      setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
      setweight(to_tsvector('english', coalesce(model, '')), 'C')
    ) stored;

-- Indexes
create index images_fts_idx      on public.images using gin(search_vector);
create index images_created_idx  on public.images (created_at desc, id desc) where is_published;
create index images_order_idx    on public.images (display_order asc) where is_published;
create index images_slug_idx     on public.images (slug);

-- ─── Tags ──────────────────────────────────────────────────
create table public.tags (
  id    serial primary key,
  name  text unique not null,
  slug  text unique not null
);

create table public.image_tags (
  image_id  uuid references public.images(id) on delete cascade,
  tag_id    integer references public.tags(id) on delete cascade,
  primary key (image_id, tag_id)
);
create index image_tags_tag_idx on public.image_tags(tag_id);

-- ─── Like Counts ───────────────────────────────────────────
-- Hot counter lives in cache (Redis on Tier 1+, memory on Tier 0).
-- This table stores the durable flushed total.
create table public.like_counts (
  image_id    uuid primary key references public.images(id) on delete cascade,
  count       bigint not null default 0,
  updated_at  timestamptz not null default now()
);

-- ─── Settings (singleton) ──────────────────────────────────
create table public.settings (
  id                  integer primary key default 1 check (id = 1),
  featured_image_id   uuid references public.images(id) on delete set null,
  maintenance_mode    boolean not null default false,
  updated_at          timestamptz not null default now()
);
insert into public.settings (id) values (1);

-- ─── updated_at trigger ────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger images_updated_at
  before update on public.images
  for each row execute function public.set_updated_at();

create trigger like_counts_updated_at
  before update on public.like_counts
  for each row execute function public.set_updated_at();

create trigger settings_updated_at
  before update on public.settings
  for each row execute function public.set_updated_at();

-- ─── Row Level Security ────────────────────────────────────
alter table public.images     enable row level security;
alter table public.tags       enable row level security;
alter table public.image_tags enable row level security;
alter table public.like_counts enable row level security;
alter table public.settings   enable row level security;

-- Public can read published images
create policy "public_read_published_images"
  on public.images for select
  using (is_published = true);

-- Public can read tags
create policy "public_read_tags"
  on public.tags for select
  using (true);

-- Public can read image_tags
create policy "public_read_image_tags"
  on public.image_tags for select
  using (true);

-- Public can read like_counts
create policy "public_read_like_counts"
  on public.like_counts for select
  using (true);

-- Public can read settings
create policy "public_read_settings"
  on public.settings for select
  using (true);

-- Service role bypasses RLS for admin operations (set in Supabase client)
-- No additional policies needed for mutations — we use service_role key server-side.
