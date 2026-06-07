-- ============================================================
-- AI Prompt Gallery — Search Refinement Migration
-- Refines search to look based on tags and model, ignoring the prompt.
-- Uses triggers instead of generated columns to bypass Postgres immutability constraints.
-- ============================================================

-- 1. Add search_tags text array column to images table
alter table public.images add column if not exists search_tags text[] default '{}';

-- 2. Drop the existing generated search_vector column if it exists
alter table public.images drop column if exists search_vector;

-- 3. Add search_vector as a regular tsvector column
alter table public.images add column search_vector tsvector;

-- 4. Create trigger function to automatically update search_vector on images table update
create or replace function public.on_image_update()
returns trigger as $$
begin
  new.search_vector := 
    setweight(to_tsvector('english', coalesce(array_to_string(new.search_tags, ' '), '')), 'A') ||
    setweight(to_tsvector('english', coalesce(new.model, '')), 'B');
  return new;
end;
$$ language plpgsql;

-- Create trigger on images for update (to sync search_vector)
drop trigger if exists trigger_on_image_update on public.images;
create trigger trigger_on_image_update
  before insert or update on public.images
  for each row execute function public.on_image_update();

-- 5. Create helper function to update search_tags for a specific image
create or replace function public.update_image_search_tags(p_image_id uuid)
returns void as $$
begin
  update public.images
  set search_tags = coalesce(
    (
      select array_agg(t.name)
      from public.image_tags it
      join public.tags t on it.tag_id = t.id
      where it.image_id = p_image_id
    ),
    '{}'::text[]
  )
  where id = p_image_id;
end;
$$ language plpgsql;

-- 6. Populate existing search_tags for all images (which will trigger search_vector updates)
do $$
declare
  r record;
begin
  for r in select id from public.images loop
    perform public.update_image_search_tags(r.id);
  end loop;
end;
$$;

-- 7. Recreate GIN index on search_vector
create index if not exists images_fts_idx on public.images using gin(search_vector);

-- 8. Create trigger function for image_tags change
create or replace function public.on_image_tag_change()
returns trigger as $$
begin
  if tg_op = 'INSERT' or tg_op = 'UPDATE' then
    perform public.update_image_search_tags(new.image_id);
    return new;
  elsif tg_op = 'DELETE' then
    perform public.update_image_search_tags(old.image_id);
    return old;
  end if;
  return null;
end;
$$ language plpgsql;

-- Create trigger on image_tags
drop trigger if exists trigger_update_image_search_tags on public.image_tags;
create trigger trigger_update_image_search_tags
  after insert or update or delete on public.image_tags
  for each row execute function public.on_image_tag_change();

-- 9. Create trigger function for tags table updates
create or replace function public.on_tag_change()
returns trigger as $$
begin
  if tg_op = 'UPDATE' and old.name <> new.name then
    update public.images i
    set search_tags = coalesce(
      (
        select array_agg(t.name)
        from public.image_tags it
        join public.tags t on it.tag_id = t.id
        where it.image_id = i.id
      ),
      '{}'::text[]
    )
    where i.id in (
      select image_id from public.image_tags where tag_id = new.id
    );
  end if;
  return new;
end;
$$ language plpgsql;

-- Create trigger on tags
drop trigger if exists trigger_on_tag_change on public.tags;
create trigger trigger_on_tag_change
  after update on public.tags
  for each row execute function public.on_tag_change();
