begin;
alter table public.group_posts drop constraint group_posts_status_check;
alter table public.group_posts add constraint group_posts_status_check check(status in ('open','reserved','delivered'));
alter table public.group_posts add column reserved_for uuid references auth.users(id) on delete set null;
alter table public.group_posts add constraint group_gift_recipient check((kind='gift' or reserved_for is null) and (status<>'open' or reserved_for is null));
revoke update(status) on public.group_posts from authenticated;

create function public.set_group_gift_state(target uuid, next_status text, expected_revision integer, recipient uuid default null)
returns void language plpgsql security definer set search_path='' as $$
declare gift public.group_posts;
begin
  select * into gift from public.group_posts where id=target for update;
  if not found or gift.owner_id<>auth.uid() or auth.uid() is null or gift.kind<>'gift' or not public.hub_is_member(gift.group_id) then
    raise exception 'No puedes modificar este regalo.' using errcode='42501';
  end if;
  if expected_revision is distinct from gift.revision then raise exception 'El regalo ha cambiado. Actualiza y vuelve a intentarlo.' using errcode='40001'; end if;
  if next_status is null or next_status not in ('open','reserved','delivered') then raise exception 'Estado no válido.' using errcode='23514'; end if;
  if next_status='reserved' and (recipient is null or recipient=auth.uid()
    or not exists(select 1 from public.group_members m where m.group_id=gift.group_id and m.user_id=recipient)
    or not exists(select 1 from public.group_post_responses r where r.post_id=target and r.owner_id=recipient)) then
    raise exception 'Elige una persona del grupo que haya indicado interés.' using errcode='23514';
  end if;
  if next_status<>'reserved' and recipient is not null then raise exception 'Destinataria no válida para este estado.' using errcode='23514'; end if;
  update public.group_posts set status=next_status,
    reserved_for=case when next_status='open' then null when next_status='reserved' then recipient else gift.reserved_for end
    where id=target;
end $$;
revoke all on function public.set_group_gift_state(uuid,text,integer,uuid) from public,anon;
grant execute on function public.set_group_gift_state(uuid,text,integer,uuid) to authenticated;
commit;
