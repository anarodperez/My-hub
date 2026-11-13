-- Run only against an isolated database after migrations 001–007.
begin;
insert into auth.users(id) values
 ('7b1e09f3-5af1-4b2f-991c-94de71ab7100'),
 ('7b1e09f3-5af1-4b2f-991c-94de71ab7101'),
 ('7b1e09f3-5af1-4b2f-991c-94de71ab7102');
insert into public.groups(id,owner_id,name) values('7b1e09f3-5af1-4b2f-991c-94de71ab7110','7b1e09f3-5af1-4b2f-991c-94de71ab7100','Friends');
insert into public.group_members(group_id,user_id) values
 ('7b1e09f3-5af1-4b2f-991c-94de71ab7110','7b1e09f3-5af1-4b2f-991c-94de71ab7100'),
 ('7b1e09f3-5af1-4b2f-991c-94de71ab7110','7b1e09f3-5af1-4b2f-991c-94de71ab7101');
set local role authenticated;
select set_config('request.jwt.claim.sub','7b1e09f3-5af1-4b2f-991c-94de71ab7100',true);
do $$ declare gid uuid := '7b1e09f3-5af1-4b2f-991c-94de71ab7110'; begin
perform public.set_group_availability(gid,'2026-10-26','morning',true);
perform public.set_group_availability(gid,'2026-10-26','morning',false);
if exists(select 1 from public.group_availability where group_id=gid) or (select count(*) from public.group_unavailability where group_id=gid)<>1 then raise exception 'Busy state incorrect'; end if;
perform public.set_group_availability(gid,'2026-10-26','morning',false);
insert into public.group_availability(group_id,owner_id,available_date,period) values(gid,auth.uid(),'2026-10-26','morning');
if exists(select 1 from public.group_unavailability where group_id=gid) then raise exception 'Old client conflict'; end if;
perform public.set_group_availability(gid,'2026-10-26','morning',false);
end $$;
select set_config('request.jwt.claim.sub','7b1e09f3-5af1-4b2f-991c-94de71ab7101',true);
do $$ begin
if (select count(*) from public.group_unavailability)<>1 then raise exception 'Member cannot read'; end if;
delete from public.group_unavailability;
if (select count(*) from public.group_unavailability)<>1 then raise exception 'Member deleted another owner'; end if;
end $$;
select set_config('request.jwt.claim.sub','7b1e09f3-5af1-4b2f-991c-94de71ab7102',true);
do $$ begin
if exists(select 1 from public.group_unavailability) then raise exception 'Outsider read'; end if;
begin perform public.set_group_availability('7b1e09f3-5af1-4b2f-991c-94de71ab7110','2026-10-26','morning',false); raise exception 'Outsider wrote'; exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub','7b1e09f3-5af1-4b2f-991c-94de71ab7100',true);
select public.set_group_availability_day('7b1e09f3-5af1-4b2f-991c-94de71ab7110','2026-10-26',true);
do $$ begin if (select count(*) from public.group_availability)<>3 or exists(select 1 from public.group_unavailability) then raise exception 'Whole day free failed'; end if; end $$;
select public.set_group_availability_day('7b1e09f3-5af1-4b2f-991c-94de71ab7110','2026-10-26',false);
do $$ begin if (select count(*) from public.group_unavailability)<>3 or exists(select 1 from public.group_availability) then raise exception 'Whole day busy failed'; end if; end $$;
select public.set_group_availability_day('7b1e09f3-5af1-4b2f-991c-94de71ab7110','2026-10-26',null);
do $$ begin if exists(select 1 from public.group_unavailability) or exists(select 1 from public.group_availability) then raise exception 'Clear failed'; end if; end $$;
rollback;
