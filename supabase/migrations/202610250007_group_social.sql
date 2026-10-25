begin;

create table public.group_availability (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  available_date date not null check(available_date between date '1900-01-01' and date '9999-12-31'),
  period text not null check(period in ('morning','afternoon','evening')),
  unique(group_id,owner_id,available_date,period)
);
create index group_availability_month on public.group_availability(group_id,available_date,id);

create table public.group_posts (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check(kind in ('plan','gift')),
  title text not null check(length(btrim(title)) between 1 and 150),
  description text not null default '' check(length(description)<=2000),
  event_date date check(event_date between date '1900-01-01' and date '9999-12-31'),
  cover_path text not null default '',
  status text not null default 'open' check(status in ('open','delivered')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revision integer not null default 1,
  check(kind='gift' or (cover_path='' and status='open')),
  check(kind='plan' or event_date is null),
  check(cover_path='' or (split_part(cover_path,'/',1)=owner_id::text and split_part(cover_path,'/',2)=group_id::text and split_part(cover_path,'/',3)=id::text and array_length(string_to_array(cover_path,'/'),1)=4))
);
create index group_posts_feed on public.group_posts(group_id,kind,created_at desc,id desc);
create trigger group_posts_revision before update on public.group_posts for each row execute function public.hub_revision();

create table public.group_post_responses (
  post_id uuid not null references public.group_posts(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  primary key(post_id,owner_id)
);

alter table public.group_availability enable row level security;
alter table public.group_posts enable row level security;
alter table public.group_post_responses enable row level security;
revoke all on public.group_availability,public.group_posts,public.group_post_responses from anon,authenticated;
grant select,delete on public.group_availability,public.group_posts,public.group_post_responses to authenticated;
grant insert(group_id,owner_id,available_date,period) on public.group_availability to authenticated;
grant insert(id,group_id,owner_id,kind,title,description,event_date,cover_path) on public.group_posts to authenticated;
grant update(status) on public.group_posts to authenticated;
grant insert(post_id,owner_id) on public.group_post_responses to authenticated;

create policy availability_read on public.group_availability for select to authenticated
using(public.hub_is_member(group_id) and exists(select 1 from public.group_members m where m.group_id=group_availability.group_id and m.user_id=group_availability.owner_id));
create policy availability_insert on public.group_availability for insert to authenticated
with check(owner_id=(select auth.uid()) and public.hub_is_member(group_id));
create policy availability_delete on public.group_availability for delete to authenticated
using(owner_id=(select auth.uid()) and public.hub_is_member(group_id));
create policy group_post_read on public.group_posts for select to authenticated using(public.hub_is_member(group_id));
create policy group_post_insert on public.group_posts for insert to authenticated
with check(owner_id=(select auth.uid()) and public.hub_is_member(group_id) and status='open' and revision=1);
create policy group_post_update on public.group_posts for update to authenticated
using(owner_id=(select auth.uid()) and public.hub_is_member(group_id) and kind='gift')
with check(owner_id=(select auth.uid()) and public.hub_is_member(group_id) and kind='gift');
create policy group_post_delete on public.group_posts for delete to authenticated
using(owner_id=(select auth.uid()) and public.hub_is_member(group_id));
create policy group_response_read on public.group_post_responses for select to authenticated
using(exists(select 1 from public.group_posts p join public.group_members m on m.group_id=p.group_id where p.id=post_id and m.user_id=group_post_responses.owner_id and public.hub_is_member(p.group_id)));
create policy group_response_insert on public.group_post_responses for insert to authenticated
with check(owner_id=(select auth.uid()) and exists(select 1 from public.group_posts p where p.id=post_id and p.status='open' and public.hub_is_member(p.group_id)));
create policy group_response_delete on public.group_post_responses for delete to authenticated
using(owner_id=(select auth.uid()) and exists(select 1 from public.group_posts p where p.id=post_id and public.hub_is_member(p.group_id)));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('group-media','group-media',false,10485760,array['image/jpeg','image/png','image/webp','image/heic','image/avif']);
create function public.hub_can_read_group_media(path text) returns boolean
language sql stable security definer set search_path='' as $$
  select auth.uid() is not null and exists(select 1 from public.group_posts p where p.cover_path=path and public.hub_is_member(p.group_id));
$$;
revoke all on function public.hub_can_read_group_media(text) from public,anon;
grant execute on function public.hub_can_read_group_media(text) to authenticated;
create policy group_media_read on storage.objects for select to authenticated
using(bucket_id='group-media' and public.hub_can_read_group_media(name));
create policy group_media_insert on storage.objects for insert to authenticated
with check(bucket_id='group-media' and split_part(name,'/',1)=(select auth.uid())::text and array_length(string_to_array(name,'/'),1)=4
 and exists(select 1 from public.groups g where g.id::text=split_part(objects.name,'/',2) and public.hub_is_member(g.id)));
commit;
