begin;
-- Additive: older clients leave this private preference untouched.
create or replace function public.valid_current_media(value jsonb)
returns boolean language plpgsql immutable set search_path = '' as $$
declare item jsonb; categories text[] := '{}'; category text;
begin
  if jsonb_typeof(value) is distinct from 'array' then return false; end if;
  if jsonb_array_length(value) > 3 then return false; end if;
  for item in select * from jsonb_array_elements(value) loop
    if jsonb_typeof(item) is distinct from 'object' then return false; end if;
    category := item->>'category';
    if category is null or category not in ('series', 'movie', 'book') or category = any(categories) then return false; end if;
    categories := array_append(categories, category);
    if jsonb_typeof(item->'title') is distinct from 'string' or length(btrim(item->>'title')) = 0 or length(item->>'title') > 150 then return false; end if;
    if item->>'status' is null or item->>'status' not in ('current', 'finished') then return false; end if;
    if jsonb_typeof(item->'coverUrl') is distinct from 'string' or length(item->>'coverUrl') > 4000 then return false; end if;
    if item ? 'coverPath' and (jsonb_typeof(item->'coverPath') is distinct from 'string' or length(item->>'coverPath') > 4000) then return false; end if;
  end loop;
  return true;
end;
$$;
alter table public.user_preferences add column if not exists current_media jsonb;
do $$ begin
  if not exists(select 1 from pg_constraint where conrelid = 'public.user_preferences'::regclass and conname = 'current_media_shape') then
    alter table public.user_preferences add constraint current_media_shape check (current_media is null or public.valid_current_media(current_media));
  end if;
end $$;
notify pgrst, 'reload schema';
commit;
