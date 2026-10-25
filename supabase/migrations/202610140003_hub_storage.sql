begin;
alter table public.recommendations add constraint recommendation_cover_owner check(cover_path='' or cover_path ~ '^https?://' or split_part(cover_path,'/',1)=owner_id::text);
alter table public.wishlist_items add constraint wishlist_cover_owner check(cover_path='' or cover_path ~ '^https?://' or split_part(cover_path,'/',1)=owner_id::text);
alter table public.moment_songs add constraint song_cover_owner check(cover_path='' or cover_path ~ '^https?://' or split_part(cover_path,'/',1)=id::text);
alter table public.profiles add constraint avatar_owner check(avatar_path is null or avatar_path='' or split_part(avatar_path,'/',1)=id::text);
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('hub-media','hub-media',false,10485760,array['image/jpeg','image/png','image/webp','image/heic','image/avif'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

create function public.hub_can_read_media(path text) returns boolean
language sql stable security definer set search_path='' as $$
  select auth.uid() is not null and (
    split_part(path,'/',1)=auth.uid()::text
    or exists(select 1 from public.recommendations r where r.cover_path=path and public.hub_can_read_post(r.id))
    or exists(select 1 from public.profiles p where p.avatar_path=path and exists(select 1 from public.visible_author(p.id)))
  );
$$;
revoke all on function public.hub_can_read_media(text) from public,anon;
grant execute on function public.hub_can_read_media(text) to authenticated;

create policy hub_media_read on storage.objects for select to authenticated
using(bucket_id='hub-media' and public.hub_can_read_media(name));
create policy hub_media_insert on storage.objects for insert to authenticated
with check(bucket_id='hub-media' and split_part(name,'/',1)=(select auth.uid())::text and array_length(string_to_array(name,'/'),1)=3);
-- Immutable uploads: new versions get new paths, preventing overwriting a previously shared photo.
create policy hub_media_delete on storage.objects for delete to authenticated
using(bucket_id='hub-media' and split_part(name,'/',1)=(select auth.uid())::text
  and not exists(select 1 from public.recommendations r where r.cover_path=name)
  and not exists(select 1 from public.wishlist_items w where w.cover_path=name)
  and not exists(select 1 from public.moment_songs s where s.cover_path=name)
  and not exists(select 1 from public.profiles p where p.avatar_path=name));
grant update(avatar_path) on public.profiles to authenticated;
commit;
