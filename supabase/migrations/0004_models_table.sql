-- ============================================================
-- AI Prompt Gallery — Models Table Migration
-- Run: pnpm db:push
-- ============================================================

-- 1. Create the new models table
create table public.models (
  slug          text primary key,
  name          text not null,
  short_name    text not null,
  created_at    timestamptz not null default now()
);

-- 2. Insert initial models
insert into public.models (slug, name, short_name) values
  ('dalle3', 'DALL-E 3 (ChatGPT / Copilot)', 'DALL-E 3'),
  ('imagen3', 'Imagen 3 (Gemini)', 'Imagen 3'),
  ('midjourney', 'Midjourney', 'Midjourney'),
  ('flux', 'Flux (Grok)', 'Flux'),
  ('ideogram', 'Ideogram', 'Ideogram'),
  ('emu', 'Emu (Meta AI / Instagram)', 'Emu'),
  ('firefly', 'Firefly (Adobe)', 'Firefly'),
  ('sd3', 'Stable Diffusion 3', 'SD 3'),
  ('sdxl', 'SDXL', 'SDXL'),
  ('leonardo', 'Leonardo AI', 'Leonardo AI'),
  ('other', 'Other', 'Other')
on conflict (slug) do nothing;

-- 3. Drop the old check constraint on public.images
alter table public.images drop constraint if exists images_model_check;

-- 4. Add the foreign key constraint
alter table public.images add constraint images_model_fkey foreign key (model) references public.models(slug);

-- 5. Enable RLS
alter table public.models enable row level security;

-- Public can read models
create policy "public_read_models"
  on public.models for select
  using (true);

-- Admin can mutate (via service role bypass)
