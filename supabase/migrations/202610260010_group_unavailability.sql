begin;
-- Separate rows keep older clients from treating "No puedo" as availability.
create table public.group_unavailability (like public.group_availability including defaults including constraints including indexes);
alter table public.group_unavailability add foreign key(group_id) references public.groups(id) on delete cascade;
alter table public.group_unavailability add foreign key(owner_id) references auth.users(id) on delete cascade;
alter table public.group_unavailability enable row level security;
revoke all on public.group_unavailability from public,anon,authenticated;
grant select,delete on public.group_unavailability to authenticated;
create policy unavailability_read on public.group_unavailability for select to authenticated
using(public.hub_is_member(group_id) and exists(select 1 from public.group_members m where m.group_id=group_unavailability.group_id and m.user_id=group_unavailability.owner_id));
create policy unavailability_delete on public.group_unavailability for delete to authenticated
using(owner_id=(select auth.uid()) and public.hub_is_member(group_id));

create function public.hub_exclusive_availability() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null or new.owner_id<>auth.uid() or not public.hub_is_member(new.group_id) then
    raise exception 'No puedes modificar esta disponibilidad.' using errcode='42501';
  end if;
  perform 1 from public.groups where id=new.group_id for update;
  if tg_table_name='group_availability' then
    delete from public.group_unavailability where group_id=new.group_id and owner_id=new.owner_id and available_date=new.available_date and period=new.period;
  else
    delete from public.group_availability where group_id=new.group_id and owner_id=new.owner_id and available_date=new.available_date and period=new.period;
  end if;
  return new;
end $$;
revoke all on function public.hub_exclusive_availability() from public,anon,authenticated;
create trigger availability_exclusive before insert on public.group_availability for each row execute function public.hub_exclusive_availability();
create trigger unavailability_exclusive before insert on public.group_unavailability for each row execute function public.hub_exclusive_availability();

create function public.set_group_availability(target_group uuid,target_date date,target_period text,can_attend boolean)
returns void language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null or not public.hub_is_member(target_group) then
    raise exception 'No perteneces a este grupo.' using errcode='42501';
  end if;
  if target_date is null or target_date not between date '1900-01-01' and date '9999-12-31' or target_period is null or target_period not in ('morning','afternoon','evening') then
    raise exception 'Fecha o franja no válida.' using errcode='23514';
  end if;
  perform 1 from public.groups where id=target_group for update;
  delete from public.group_availability where group_id=target_group and owner_id=auth.uid() and available_date=target_date and period=target_period;
  delete from public.group_unavailability where group_id=target_group and owner_id=auth.uid() and available_date=target_date and period=target_period;
  if can_attend then
    insert into public.group_availability(group_id,owner_id,available_date,period) values(target_group,auth.uid(),target_date,target_period);
  elsif can_attend=false then
    insert into public.group_unavailability(group_id,owner_id,available_date,period) values(target_group,auth.uid(),target_date,target_period);
  end if;
end $$;
revoke all on function public.set_group_availability(uuid,date,text,boolean) from public,anon;
grant execute on function public.set_group_availability(uuid,date,text,boolean) to authenticated;
commit;
