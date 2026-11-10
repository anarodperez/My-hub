begin;
alter table public.group_posts add column gift_draw_at timestamptz;
alter table public.group_posts add column gift_drawn_at timestamptz;
alter table public.group_posts add constraint gift_draw_kind check(kind='gift' or (gift_draw_at is null and gift_drawn_at is null));
alter table public.group_posts add constraint gift_draw_result check(gift_drawn_at is null or gift_draw_at is not null);
grant insert(gift_draw_at) on public.group_posts to authenticated;
create index group_gifts_due on public.group_posts(gift_draw_at) where gift_draw_at is not null and gift_drawn_at is null;

create function public.hub_gift_deadline() returns trigger
language plpgsql set search_path='' as $$
begin
  if new.kind='gift' then
    new.gift_draw_at := coalesce(new.gift_draw_at, statement_timestamp() + interval '3 days');
    if new.gift_draw_at<=statement_timestamp() or new.gift_draw_at>statement_timestamp()+interval '8 days' then
      raise exception 'El plazo del sorteo no es válido.' using errcode='23514';
    end if;
  end if;
  return new;
end $$;
create trigger gift_deadline before insert on public.group_posts for each row execute function public.hub_gift_deadline();
revoke all on function public.hub_gift_deadline() from public,anon,authenticated;

-- Lock the same parent row as the draw, including withdrawals, to serialize the closing boundary.
create function public.hub_gift_participation() returns trigger
language plpgsql security definer set search_path='' as $$
declare gift public.group_posts;
begin
  select * into gift from public.group_posts where id=case when tg_op='DELETE' then old.post_id else new.post_id end for update;
  if gift.kind='gift' and gift.gift_draw_at is not null and (tg_op<>'DELETE' or pg_trigger_depth()=1) then
    if (tg_op='INSERT' and new.owner_id=gift.owner_id) or gift.status<>'open'
      or (gift.gift_draw_at is not null and gift.gift_draw_at<=clock_timestamp()) then
      raise exception 'Este regalo ya no admite cambios de participación.' using errcode='23514';
    end if;
  end if;
  if tg_op='DELETE' then return old; end if;
  return new;
end $$;
create trigger gift_participation before insert or delete on public.group_post_responses for each row execute function public.hub_gift_participation();
revoke all on function public.hub_gift_participation() from public,anon,authenticated;

create function public.hub_resolve_gift_draws(target_group uuid default null) returns void
language plpgsql security definer set search_path='' as $$
declare gift public.group_posts; winner uuid;
begin
  for gift in select * from public.group_posts
    where kind='gift' and status='open' and gift_draw_at<=clock_timestamp() and gift_drawn_at is null
      and (target_group is null or group_id=target_group)
    order by gift_draw_at,id for update skip locked
  loop
    winner := null;
    select r.owner_id into winner from public.group_post_responses r
      join public.group_members m on m.group_id=gift.group_id and m.user_id=r.owner_id
      where r.post_id=gift.id and r.owner_id<>gift.owner_id order by random() limit 1;
    update public.group_posts set gift_drawn_at=clock_timestamp(), reserved_for=winner,
      status=case when winner is null then 'open' else 'reserved' end where id=gift.id;
  end loop;
end $$;
revoke all on function public.hub_resolve_gift_draws(uuid) from public,anon,authenticated;

create function public.resolve_group_gift_draws(target_group uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null or not public.hub_is_member(target_group) then
    raise exception 'No puedes acceder a este grupo.' using errcode='42501';
  end if;
  perform public.hub_resolve_gift_draws(target_group);
end $$;
revoke all on function public.resolve_group_gift_draws(uuid) from public,anon;
grant execute on function public.resolve_group_gift_draws(uuid) to authenticated;

create or replace function public.set_group_gift_state(target uuid, next_status text, expected_revision integer, recipient uuid default null)
returns void language plpgsql security definer set search_path='' as $$
declare gift public.group_posts;
begin
  select * into gift from public.group_posts where id=target for update;
  if not found or gift.owner_id<>auth.uid() or auth.uid() is null or gift.kind<>'gift' or not public.hub_is_member(gift.group_id) then
    raise exception 'No puedes modificar este regalo.' using errcode='42501';
  end if;
  if expected_revision is distinct from gift.revision then raise exception 'El regalo ha cambiado. Actualiza y vuelve a intentarlo.' using errcode='40001'; end if;
  if next_status is null or next_status not in ('open','reserved','delivered') then raise exception 'Estado no válido.' using errcode='23514'; end if;
  if gift.gift_draw_at is not null and (next_status<>'delivered' or gift.gift_drawn_at is null or gift.reserved_for is null) then
    raise exception 'La destinataria se decide al cerrar el sorteo.' using errcode='23514';
  end if;
  if next_status='reserved' and (recipient is null or recipient=auth.uid()
    or not exists(select 1 from public.group_members m where m.group_id=gift.group_id and m.user_id=recipient)
    or not exists(select 1 from public.group_post_responses r where r.post_id=target and r.owner_id=recipient)) then
    raise exception 'Elige una persona del grupo que haya indicado interés.' using errcode='23514';
  end if;
  if next_status<>'reserved' and recipient is not null then raise exception 'Destinataria no válida para este estado.' using errcode='23514'; end if;
  update public.group_posts set status=next_status,
    reserved_for=case when next_status='open' then null when next_status='reserved' then recipient else gift.reserved_for end where id=target;
end $$;
commit;
