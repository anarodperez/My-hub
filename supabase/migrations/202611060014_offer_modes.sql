begin;
set local lock_timeout='5s';
alter table public.group_posts add column offer_mode text not null default 'gift' check(offer_mode in ('gift','fixed','auction'));
alter table public.group_posts add column price_cents bigint;
alter table public.group_posts add column winning_bid_cents bigint;
alter table public.group_posts add constraint group_offer_price check(
  (offer_mode='gift' and price_cents is null and winning_bid_cents is null) or
  (kind='gift' and offer_mode in ('fixed','auction') and price_cents is not null and price_cents between 1 and 99999999
    and (winning_bid_cents is null or winning_bid_cents between price_cents and 99999999)));
grant insert(offer_mode,price_cents) on public.group_posts to authenticated;
alter table public.group_posts drop constraint gift_draw_result;
alter table public.group_posts add constraint gift_draw_result check(gift_drawn_at is null or gift_draw_at is not null or offer_mode='fixed');

create table public.group_post_bids (
  post_id uuid not null references public.group_posts(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  amount_cents bigint not null check(amount_cents between 1 and 99999999),
  primary key(post_id,owner_id)
);
alter table public.group_post_bids enable row level security;
revoke all on public.group_post_bids from public,anon,authenticated;
grant select on public.group_post_bids to authenticated;
create policy group_bid_read on public.group_post_bids for select to authenticated
using(exists(select 1 from public.group_posts p where p.id=post_id and public.hub_is_member(p.group_id)));

create function public.place_group_bid(target uuid, amount bigint) returns void
language plpgsql security definer set search_path='' as $$
declare gift public.group_posts; highest bigint; existing bigint;
begin
  select * into gift from public.group_posts where id=target for update;
  if not found or auth.uid() is null or not public.hub_is_member(gift.group_id) or gift.owner_id=auth.uid() then
    raise exception 'No puedes pujar por este artículo.' using errcode='42501';
  end if;
  if gift.offer_mode<>'auction' or gift.status<>'open' or gift.gift_drawn_at is not null or gift.gift_draw_at<=clock_timestamp() then
    raise exception 'Esta subasta ya no admite pujas.' using errcode='23514';
  end if;
  if amount is null or amount<gift.price_cents or amount>99999999 then raise exception 'Importe no válido.' using errcode='23514'; end if;
  select amount_cents into existing from public.group_post_bids where post_id=target and owner_id=auth.uid();
  if existing=amount then return; end if;
  select max(b.amount_cents) into highest from public.group_post_bids b join public.group_members m on m.group_id=gift.group_id and m.user_id=b.owner_id where b.post_id=target;
  if highest is not null and amount<highest+100 then
    raise exception 'Otra puja ha cambiado el precio. Actualiza: debes subir al menos 1 €.' using errcode='23514';
  end if;
  insert into public.group_post_bids(post_id,owner_id,amount_cents) values(target,auth.uid(),amount)
  on conflict(post_id,owner_id) do update set amount_cents=excluded.amount_cents;
end $$;
revoke all on function public.place_group_bid(uuid,bigint) from public,anon;
grant execute on function public.place_group_bid(uuid,bigint) to authenticated;

create function public.reserve_priced_gift(target uuid) returns void
language plpgsql security definer set search_path='' as $$
declare gift public.group_posts;
begin
  select * into gift from public.group_posts where id=target for update;
  if not found or auth.uid() is null or not public.hub_is_member(gift.group_id) or gift.owner_id=auth.uid() then raise exception 'No puedes reservar este artículo.' using errcode='42501'; end if;
  if gift.offer_mode='fixed' and gift.status='reserved' and gift.reserved_for=auth.uid() then return; end if;
  if gift.offer_mode<>'fixed' or gift.status<>'open' then raise exception 'El artículo ya no está disponible.' using errcode='23514'; end if;
  update public.group_posts set status='reserved',reserved_for=auth.uid(),gift_drawn_at=clock_timestamp(),winning_bid_cents=gift.price_cents where id=target;
end $$;
revoke all on function public.reserve_priced_gift(uuid) from public,anon;
grant execute on function public.reserve_priced_gift(uuid) to authenticated;

create or replace function public.hub_gift_deadline() returns trigger
language plpgsql set search_path='' as $$
begin
  if new.offer_mode='fixed' then
    new.gift_draw_at := null;
  elsif new.kind='gift' then
    new.gift_draw_at := coalesce(new.gift_draw_at, statement_timestamp() + interval '3 days');
    if new.gift_draw_at<=statement_timestamp() or new.gift_draw_at>statement_timestamp()+interval '8 days' then
      raise exception 'El plazo del sorteo no es válido.' using errcode='23514';
    end if;
  end if;
  return new;
end $$;

create or replace function public.hub_gift_participation() returns trigger
language plpgsql security definer set search_path='' as $$
declare gift public.group_posts;
begin
  select * into gift from public.group_posts where id=case when tg_op='DELETE' then old.post_id else new.post_id end for update;
  if gift.offer_mode<>'gift' and (tg_op<>'DELETE' or pg_trigger_depth()=1) then
    raise exception 'Usa la reserva o las pujas para este articulo.' using errcode='23514';
  end if;
  if gift.kind='gift' and gift.gift_draw_at is not null and (tg_op<>'DELETE' or pg_trigger_depth()=1) then
    if (tg_op='INSERT' and new.owner_id=gift.owner_id) or gift.status<>'open'
      or (gift.gift_draw_at is not null and gift.gift_draw_at<=clock_timestamp()) then
      raise exception 'Este regalo ya no admite cambios de participación.' using errcode='23514';
    end if;
  end if;
  if tg_op='DELETE' then return old; end if;
  return new;
end $$;

create or replace function public.hub_resolve_gift_draws(target_group uuid default null) returns void
language plpgsql security definer set search_path='' as $$
declare gift public.group_posts; winner uuid; winning bigint;
begin
  for gift in select * from public.group_posts
    where kind='gift' and offer_mode<>'fixed' and status='open' and gift_draw_at<=clock_timestamp() and gift_drawn_at is null
      and (target_group is null or group_id=target_group)
    order by gift_draw_at,id for update skip locked
  loop
    winner := null; winning := null;
    if gift.offer_mode='auction' then
      select b.owner_id,b.amount_cents into winner,winning from public.group_post_bids b
      join public.group_members m on m.group_id=gift.group_id and m.user_id=b.owner_id
      where b.post_id=gift.id and b.owner_id<>gift.owner_id order by b.amount_cents desc,b.owner_id limit 1;
    else
    select r.owner_id into winner from public.group_post_responses r
      join public.group_members m on m.group_id=gift.group_id and m.user_id=r.owner_id
      where r.post_id=gift.id and r.owner_id<>gift.owner_id order by random() limit 1;
    end if;
    update public.group_posts set winning_bid_cents=winning,gift_drawn_at=clock_timestamp(), reserved_for=winner,
      status=case when winner is null then 'open' else 'reserved' end where id=gift.id;
  end loop;
end $$;

create or replace function public.set_group_gift_state(target uuid, next_status text, expected_revision integer, recipient uuid default null)
returns void language plpgsql security definer set search_path='' as $$
declare gift public.group_posts;
begin
  select * into gift from public.group_posts where id=target for update;
  if not found or gift.owner_id<>auth.uid() or auth.uid() is null or gift.kind<>'gift' or not public.hub_is_member(gift.group_id) then
    raise exception 'No puedes modificar este regalo.' using errcode='42501';
  end if;
  if expected_revision is distinct from gift.revision then raise exception 'El regalo ha cambiado. Actualiza y vuelve a intentarlo.' using errcode='40001'; end if;
  if gift.offer_mode<>'gift' and (next_status is distinct from 'delivered' or gift.status<>'reserved' or gift.reserved_for is null) then
    raise exception 'Solo puedes marcar como entregado un articulo ya reservado.' using errcode='23514';
  end if;
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
notify pgrst, 'reload schema';
commit;
