begin;
alter table public.groups add column if not exists cover_key text check(cover_key in ('coffee','reading','flowers'));

create or replace function public.set_group_cover(target uuid, choice text) returns public.groups
language plpgsql security definer set search_path='' as $$
declare result public.groups;
begin
  if choice is not null and choice not in ('coffee','reading','flowers') then raise exception 'Invalid cover'; end if;
  update public.groups set cover_key=choice where id=target and owner_id=auth.uid() and public.hub_is_member(target) returning * into result;
  if not found then raise insufficient_privilege using message='Only the group owner can choose its cover'; end if;
  return result;
end $$;
revoke all on function public.set_group_cover(uuid,text) from public,anon;
grant execute on function public.set_group_cover(uuid,text) to authenticated;

create table if not exists public.recommendation_reactions (
  post_id uuid not null references public.recommendations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check(kind in ('need','convinced','you')),
  primary key(post_id,user_id)
);
alter table public.recommendation_reactions enable row level security;
revoke all on public.recommendation_reactions from anon;
grant select,insert,update,delete on public.recommendation_reactions to authenticated;
drop policy if exists reactions_read on public.recommendation_reactions;
create policy reactions_read on public.recommendation_reactions for select to authenticated using(public.hub_can_read_post(post_id));
drop policy if exists reactions_insert on public.recommendation_reactions;
create policy reactions_insert on public.recommendation_reactions for insert to authenticated with check(user_id=auth.uid() and public.hub_can_read_post(post_id));
drop policy if exists reactions_update on public.recommendation_reactions;
create policy reactions_update on public.recommendation_reactions for update to authenticated using(user_id=auth.uid() and public.hub_can_read_post(post_id)) with check(user_id=auth.uid() and public.hub_can_read_post(post_id));
drop policy if exists reactions_delete on public.recommendation_reactions;
create policy reactions_delete on public.recommendation_reactions for delete to authenticated using(user_id=auth.uid());

create or replace function public.recommendation_reaction_summary(targets uuid[])
returns table(post_id uuid, need_count bigint, convinced_count bigint, you_count bigint, mine text)
language plpgsql stable security invoker set search_path='' as $$
begin
  if coalesce(cardinality(targets),0)>100 then raise exception 'Too many posts'; end if;
  return query
    select requested.id, count(r.kind) filter(where r.kind='need'), count(r.kind) filter(where r.kind='convinced'), count(r.kind) filter(where r.kind='you'), max(r.kind) filter(where r.user_id=auth.uid())
    from (select distinct unnest(targets) as id) requested
    left join public.recommendation_reactions r on r.post_id=requested.id
    where auth.uid() is not null and public.hub_can_read_post(requested.id)
    group by requested.id;
end $$;

create or replace function public.set_recommendation_reaction(target uuid, next_kind text)
returns table(post_id uuid, need_count bigint, convinced_count bigint, you_count bigint, mine text)
language plpgsql security invoker set search_path='' as $$
begin
  if auth.uid() is null or not public.hub_can_read_post(target) then raise insufficient_privilege using message='Post is not accessible'; end if;
  if next_kind is not null and next_kind not in ('need','convinced','you') then raise exception 'Invalid reaction'; end if;
  if next_kind is null then
    delete from public.recommendation_reactions r where r.post_id=target and r.user_id=auth.uid();
  else
    insert into public.recommendation_reactions as r(post_id,user_id,kind) values(target,auth.uid(),next_kind)
      on conflict on constraint recommendation_reactions_pkey do update set kind=excluded.kind;
  end if;
  return query select * from public.recommendation_reaction_summary(array[target]);
end $$;
revoke all on function public.recommendation_reaction_summary(uuid[]), public.set_recommendation_reaction(uuid,text) from public,anon;
grant execute on function public.recommendation_reaction_summary(uuid[]), public.set_recommendation_reaction(uuid,text) to authenticated;
notify pgrst, 'reload schema';
commit;
