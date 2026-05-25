-- ============================================================
-- AI Prompt Gallery — Expand Allowed Models check constraint
-- Run: pnpm db:push
-- ============================================================

-- drop the existing constraint
ALTER TABLE public.images DROP CONSTRAINT IF EXISTS images_model_check;

-- add the new constraint
ALTER TABLE public.images ADD CONSTRAINT images_model_check CHECK (model IN (
  'sdxl', 'dalle3', 'midjourney', 'flux', 'imagen3', 'ideogram', 'emu', 'firefly', 'sd3', 'leonardo', 'other'
));
