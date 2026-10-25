begin;
alter table public.comments add column gif_path text;
alter table public.comments drop constraint comments_body_check;
alter table public.comments add constraint comments_body_check check(length(btrim(body)) <= 2000 and (length(btrim(body)) > 0 or gif_path is not null));
alter table public.comments add constraint comments_gif_path_check check(gif_path is null or (split_part(gif_path,'/',1)=author_id::text and split_part(gif_path,'/',2)=id::text and array_length(string_to_array(gif_path,'/'),1)=3 and split_part(gif_path,'/',3) ~ '^[a-zA-Z0-9-]+\.gif$'));
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('comment-gifs','comment-gifs',false,5242880,array['image/gif']);
create function public.hub_can_read_comment_gif(path text) returns boolean
language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and (split_part(path,'/',1)=auth.uid()::text
 or exists(select 1 from public.comments c where c.gif_path=path and public.hub_can_read_post(c.post_id)));
$$;
revoke all on function public.hub_can_read_comment_gif(text) from public,anon;
grant execute on function public.hub_can_read_comment_gif(text) to authenticated;
create policy comment_gifs_read on storage.objects for select to authenticated
using(bucket_id='comment-gifs' and public.hub_can_read_comment_gif(name));
create policy comment_gifs_insert on storage.objects for insert to authenticated
with check(bucket_id='comment-gifs' and split_part(name,'/',1)=(select auth.uid())::text
 and array_length(string_to_array(name,'/'),1)=3 and split_part(name,'/',3) ~ '^[a-zA-Z0-9-]+\.gif$');
create policy comment_gifs_delete on storage.objects for delete to authenticated
using(bucket_id='comment-gifs' and split_part(name,'/',1)=(select auth.uid())::text
 and not exists(select 1 from public.comments c where c.gif_path=name));
create function public.hub_check_comment_gif() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if new.gif_path is not null and not exists(select 1 from storage.objects o where o.bucket_id='comment-gifs' and o.name=new.gif_path) then
  raise check_violation using message='GIF upload not found';
 end if;
 return new;
end $$;
revoke all on function public.hub_check_comment_gif() from public,anon,authenticated;
create trigger check_comment_gif before insert on public.comments for each row execute function public.hub_check_comment_gif();
commit;
