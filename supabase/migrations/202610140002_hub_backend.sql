begin;
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 80),
  created_at timestamptz not null default now()
);
create table public.group_members (
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key(group_id,user_id)
);
create index group_members_user on public.group_members(user_id,group_id);
create table public.group_invites (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null default now() + interval '7 days',
  consumed_at timestamptz,
  revoked_at timestamptz
);
create table public.recommendations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null check(length(btrim(title)) between 1 and 150),
  category text not null check(category in ('book','movie','series','product','place')),
  opinion text not null check(length(btrim(opinion)) between 1 and 2000),
  rating numeric not null check(rating between 0.5 and 5 and rating*2=trunc(rating*2)),
  cover_path text not null default '',
  price_cents bigint check(price_cents between 0 and 9007199254740991),
  location text check(length(location)<=250),
  link text check(length(link)<=2000 and link ~ '^https?://'),
  sample boolean not null default false,
  visibility text not null default 'private' check(visibility in ('private','public','group')),
  group_id uuid references public.groups(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revision integer not null default 1,
  check((visibility='group')=(group_id is not null))
);
create index recommendations_owner on public.recommendations(owner_id,created_at desc,id);
create index recommendations_feed on public.recommendations(created_at desc,id);
create index recommendations_group on public.recommendations(group_id) where group_id is not null;
create table public.wishlist_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  recommendation_id uuid references public.recommendations(id) on delete cascade,
  title text not null default '' check(length(title)<=150),
  category text not null default 'book' check(category in ('book','movie','series','product','place')),
  cover_path text not null default '',
  link text check(length(link)<=2000 and link ~ '^https?://'),
  status text not null default 'pending' check(status in ('pending','finished')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revision integer not null default 1,
  check(recommendation_id is not null or length(btrim(title))>0),
  unique(owner_id,recommendation_id)
);
create table public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null check(length(btrim(title)) between 1 and 150),
  category text not null check(category in ('book','movie','series','product','place')),
  event_date date not null check(event_date between date '1900-01-01' and date '9999-12-31'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revision integer not null default 1
);
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check(length(btrim(name)) between 1 and 150),
  amount_cents bigint not null check(amount_cents between 0 and 9007199254740991),
  frequency text not null check(frequency in ('monthly','yearly')),
  next_date date not null check(next_date between date '1900-01-01' and date '9999-12-31'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revision integer not null default 1
);
create table public.user_preferences (
  id uuid primary key references auth.users(id) on delete cascade,
  theme text not null default 'system' check(theme in ('system','light','dark')),
  wishlist_visibility text not null default 'private' check(wishlist_visibility in ('private','public')),
  updated_at timestamptz not null default now(),
  revision integer not null default 1
);
create table public.moment_songs (
  id uuid primary key references auth.users(id) on delete cascade,
  title text not null check(length(btrim(title)) between 1 and 150),
  artist text not null check(length(btrim(artist)) between 1 and 150),
  cover_path text not null default '',
  link text check(length(link)<=2000 and link ~ '^https?://'),
  updated_at timestamptz not null default now(),
  revision integer not null default 1
);
create table public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.recommendations(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null check(length(btrim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index comments_post on public.comments(post_id,created_at,id);
create table public.migration_runs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  device_id uuid not null,
  entity_kind text not null check(entity_kind in ('recommendation','wish','saved','event','subscription','song','preferences','run')),
  legacy_id text not null check(length(legacy_id) between 1 and 200),
  target_id uuid not null,
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  unique(owner_id,device_id,entity_kind,legacy_id)
);

-- SECURITY DEFINER helpers read membership without recursive RLS; identity is always auth.uid().
create function public.hub_is_member(target uuid) returns boolean language sql stable security definer set search_path='' as $$
  select auth.uid() is not null and exists(select 1 from public.group_members where group_id=target and user_id=auth.uid());
$$;
create function public.hub_owns_group(target uuid) returns boolean language sql stable security definer set search_path='' as $$
  select auth.uid() is not null and exists(select 1 from public.groups where id=target and owner_id=auth.uid());
$$;
create function public.hub_can_read_post(target uuid) returns boolean language sql stable security definer set search_path='' as $$
  select auth.uid() is not null and exists(select 1 from public.recommendations r where r.id=target and
    (r.owner_id=auth.uid() or r.visibility='public' or (r.visibility='group' and public.hub_is_member(r.group_id))));
$$;
revoke all on function public.hub_is_member(uuid), public.hub_owns_group(uuid), public.hub_can_read_post(uuid) from public,anon;
grant execute on function public.hub_is_member(uuid), public.hub_owns_group(uuid), public.hub_can_read_post(uuid) to authenticated;

create function public.hub_revision() returns trigger language plpgsql set search_path='' as $$
begin
  if new.id<>old.id then raise exception 'Identity is immutable'; end if;
  new.updated_at=now(); new.revision=old.revision+1; return new;
end $$;
revoke all on function public.hub_revision() from public,anon,authenticated;

do $$ declare t text; begin
  foreach t in array array['groups','group_members','group_invites','recommendations','wishlist_items','calendar_events','subscriptions','user_preferences','moment_songs','comments','migration_runs'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from public,anon,authenticated',t);
  end loop;
  foreach t in array array['recommendations','wishlist_items','calendar_events','subscriptions','user_preferences','moment_songs'] loop
    execute format('create trigger hub_revision before update on public.%I for each row execute function public.hub_revision()',t);
  end loop;
  foreach t in array array['wishlist_items','calendar_events','subscriptions','migration_runs'] loop
    execute format('grant select,insert,update,delete on public.%I to authenticated',t);
    execute format('create policy own_read on public.%I for select to authenticated using(owner_id=(select auth.uid()))',t);
    execute format('create policy own_insert on public.%I for insert to authenticated with check(owner_id=(select auth.uid()))',t);
    execute format('create policy own_update on public.%I for update to authenticated using(owner_id=(select auth.uid())) with check(owner_id=(select auth.uid()))',t);
    execute format('create policy own_delete on public.%I for delete to authenticated using(owner_id=(select auth.uid()))',t);
    execute format('create index on public.%I(owner_id)',t);
  end loop;
  foreach t in array array['user_preferences','moment_songs'] loop
    execute format('grant select,insert,update,delete on public.%I to authenticated',t);
    execute format('create policy own_all on public.%I for all to authenticated using(id=(select auth.uid())) with check(id=(select auth.uid()))',t);
  end loop;
end $$;
grant select,insert,update,delete on public.recommendations to authenticated;
create policy post_read on public.recommendations for select to authenticated using(public.hub_can_read_post(id));
create policy post_insert on public.recommendations for insert to authenticated with check(owner_id=(select auth.uid()) and (group_id is null or public.hub_is_member(group_id)));
create policy post_update on public.recommendations for update to authenticated using(owner_id=(select auth.uid())) with check(owner_id=(select auth.uid()) and (group_id is null or public.hub_is_member(group_id)));
create policy post_delete on public.recommendations for delete to authenticated using(owner_id=(select auth.uid()));
-- Saved foreign posts must be readable; changing/removing a saved entry never changes its source.
create function public.hub_check_saved() returns trigger language plpgsql set search_path='' as $$
begin
  if new.recommendation_id is not null and not public.hub_can_read_post(new.recommendation_id) then raise insufficient_privilege using message='Publication is not accessible'; end if;
  return new;
end $$;
revoke all on function public.hub_check_saved() from public,anon,authenticated;
create trigger check_saved before insert or update on public.wishlist_items for each row execute function public.hub_check_saved();
grant select on public.groups,public.group_members to authenticated;
create policy group_read on public.groups for select to authenticated using(public.hub_is_member(id));
create policy member_read on public.group_members for select to authenticated using(public.hub_is_member(group_id));
grant select,insert,delete on public.comments to authenticated;
create policy comment_read on public.comments for select to authenticated using(public.hub_can_read_post(post_id));
create policy comment_insert on public.comments for insert to authenticated with check(author_id=(select auth.uid()) and public.hub_can_read_post(post_id));
create policy comment_delete on public.comments for delete to authenticated using(author_id=(select auth.uid()));

create function public.create_group(group_name text) returns uuid language plpgsql security definer set search_path='' as $$
declare target uuid; begin
  if auth.uid() is null then raise insufficient_privilege; end if;
  insert into public.groups(owner_id,name) values(auth.uid(),btrim(group_name)) returning id into target;
  insert into public.group_members(group_id,user_id) values(target,auth.uid()); return target;
end $$;
create function public.create_group_invite(target uuid) returns text language plpgsql security definer set search_path='' as $$
declare token text; begin
  if not public.hub_owns_group(target) then raise insufficient_privilege; end if;
  token=encode(extensions.gen_random_bytes(24),'hex');
  insert into public.group_invites(group_id,token_hash) values(target,encode(extensions.digest(token,'sha256'),'hex')); return token;
end $$;
create function public.accept_group_invite(token text) returns uuid language plpgsql security definer set search_path='' as $$
declare invitation public.group_invites; begin
  if auth.uid() is null then raise insufficient_privilege; end if;
  select * into invitation from public.group_invites where token_hash=encode(extensions.digest(token,'sha256'),'hex') for update;
  if not found or invitation.expires_at<=now() or invitation.revoked_at is not null or invitation.consumed_at is not null then raise exception 'Invitation is invalid or expired'; end if;
  insert into public.group_members(group_id,user_id) values(invitation.group_id,auth.uid()) on conflict do nothing;
  update public.group_invites set consumed_at=now() where id=invitation.id; return invitation.group_id;
end $$;
create function public.revoke_group_invites(target uuid) returns void language plpgsql security definer set search_path='' as $$
begin
  if not public.hub_owns_group(target) then raise insufficient_privilege; end if;
  update public.group_invites set revoked_at=now() where group_id=target and consumed_at is null;
end $$;
create function public.leave_group(target uuid) returns void language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null or public.hub_owns_group(target) then raise insufficient_privilege; end if;
  delete from public.group_members where group_id=target and user_id=auth.uid();
end $$;
create function public.remove_group_member(target uuid,member uuid) returns void language plpgsql security definer set search_path='' as $$
begin
  if not public.hub_owns_group(target) or member=auth.uid() then raise insufficient_privilege; end if;
  delete from public.group_members where group_id=target and user_id=member;
end $$;
create function public.delete_group(target uuid) returns void language plpgsql security definer set search_path='' as $$
begin
  if not public.hub_owns_group(target) then raise insufficient_privilege; end if;
  update public.recommendations set visibility='private',group_id=null where group_id=target;
  delete from public.groups where id=target;
end $$;
revoke all on function public.create_group(text),public.create_group_invite(uuid),public.accept_group_invite(text),public.revoke_group_invites(uuid),public.leave_group(uuid),public.remove_group_member(uuid,uuid),public.delete_group(uuid) from public,anon;
grant execute on function public.create_group(text),public.create_group_invite(uuid),public.accept_group_invite(text),public.revoke_group_invites(uuid),public.leave_group(uuid),public.remove_group_member(uuid,uuid),public.delete_group(uuid) to authenticated;

-- Limited identity lookup: profile email and private data never enter the result.
create function public.visible_author(target uuid) returns table(id uuid,name text,avatar_path text) language sql stable security definer set search_path='' as $$
  select p.id,p.name,p.avatar_path from public.profiles p where p.id=target and auth.uid() is not null and
    (p.id=auth.uid() or exists(select 1 from public.recommendations r where r.owner_id=p.id and public.hub_can_read_post(r.id))
     or exists(select 1 from public.group_members m where m.user_id=p.id and public.hub_is_member(m.group_id))
     or exists(select 1 from public.comments c where c.author_id=p.id and public.hub_can_read_post(c.post_id)));
$$;
revoke all on function public.visible_author(uuid) from public,anon;
grant execute on function public.visible_author(uuid) to authenticated;
commit;
