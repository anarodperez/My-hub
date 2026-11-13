begin;
-- Check global references as the table owner, not just rows visible through RLS.
create or replace function public.hub_can_delete_media(path text) returns boolean
language sql stable security definer set search_path='' as $$
  select auth.uid() is not null and split_part(path,'/',1)=auth.uid()::text
    and not exists(select 1 from public.recommendations r where r.cover_path=path)
    and not exists(select 1 from public.wishlist_items w where w.cover_path=path)
    and not exists(select 1 from public.moment_songs s where s.cover_path=path)
    and not exists(select 1 from public.profiles p where p.avatar_path=path)
    and not exists(select 1 from public.user_preferences p cross join lateral jsonb_array_elements(coalesce(p.current_media,'[]'::jsonb)) m where m->>'coverUrl'=path or m->>'coverPath'=path);
$$;
revoke all on function public.hub_can_delete_media(text) from public,anon;
grant execute on function public.hub_can_delete_media(text) to authenticated;
drop policy if exists hub_media_delete on storage.objects;
create policy hub_media_delete on storage.objects for delete to authenticated
using(bucket_id='hub-media' and public.hub_can_delete_media(name));
commit;
