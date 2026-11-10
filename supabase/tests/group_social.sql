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
do $$
declare gid uuid := '7b1e09f3-5af1-4b2f-991c-94de71ab7110'; pid uuid := '7b1e09f3-5af1-4b2f-991c-94de71ab7120'; photo text;
begin
 photo=auth.uid()::text||'/'||gid::text||'/'||pid::text||'/photo.jpeg';
 insert into storage.objects(bucket_id,name) values('group-media',photo);
 insert into public.group_posts(id,group_id,owner_id,kind,title,cover_path) values(pid,gid,auth.uid(),'gift','Book',photo);
 if not exists(select 1 from public.group_posts where id=pid) then raise exception 'Insert returning/read denied'; end if;
 insert into public.group_availability(group_id,owner_id,available_date,period) values(gid,auth.uid(),'2026-10-25','morning');
 insert into public.group_availability(group_id,owner_id,available_date,period) values(gid,auth.uid(),'2026-10-25','morning') on conflict do nothing;
 if (select count(*) from public.group_availability where group_id=gid)<>1 then raise exception 'Duplicate availability'; end if;
 begin
   insert into public.group_availability(group_id,owner_id,available_date,period) values(gid,auth.uid(),'2026-10-25','bad');
   raise exception 'Invalid period permitted';
 exception when check_violation then null; end;
 begin update public.group_posts set group_id=gen_random_uuid() where id=pid; raise exception 'Group mutable'; exception when insufficient_privilege then null; end;
 begin update public.group_posts set owner_id='7b1e09f3-5af1-4b2f-991c-94de71ab7101' where id=pid; raise exception 'Owner mutable'; exception when insufficient_privilege then null; end;
 perform set_config('request.jwt.claim.sub','7b1e09f3-5af1-4b2f-991c-94de71ab7101',true);
 if not public.hub_can_read_group_media(photo) then raise exception 'Member cannot read photo'; end if;
 if not exists(select 1 from storage.objects where bucket_id='group-media' and name=photo) then raise exception 'Storage denied member'; end if;
 if not exists(select 1 from public.group_availability where group_id=gid) then raise exception 'Member cannot read availability'; end if;
 insert into public.group_post_responses(post_id,owner_id) values(pid,auth.uid());
 insert into public.group_post_responses(post_id,owner_id) values(pid,auth.uid()) on conflict do nothing;
 if (select count(*) from public.group_post_responses where post_id=pid)<>1 then raise exception 'Duplicate interest'; end if;
 begin perform public.set_group_gift_state(pid,'delivered',1); raise exception 'Non-owner changed gift'; exception when insufficient_privilege then null; end;
 if exists(select 1 from public.group_posts where id=pid and status='delivered') then raise exception 'Non-owner delivered gift'; end if;
 delete from public.group_posts where id=pid;
 if not exists(select 1 from public.group_posts where id=pid) then raise exception 'Non-owner deleted post'; end if;
 delete from public.group_availability where group_id=gid;
 if not exists(select 1 from public.group_availability where group_id=gid) then raise exception 'Non-owner deleted availability'; end if;
 begin insert into public.group_post_responses(post_id,owner_id) values(pid,'7b1e09f3-5af1-4b2f-991c-94de71ab7100'); raise exception 'Spoofed response'; exception when insufficient_privilege then null; end;
 perform set_config('request.jwt.claim.sub','7b1e09f3-5af1-4b2f-991c-94de71ab7102',true);
 if exists(select 1 from public.group_posts where id=pid) or exists(select 1 from public.group_post_responses where post_id=pid) or exists(select 1 from public.group_availability where group_id=gid) then raise exception 'Outsider read group'; end if;
 if public.hub_can_read_group_media(photo) then raise exception 'Outsider read photo'; end if;
 if exists(select 1 from storage.objects where bucket_id='group-media' and name=photo) then raise exception 'Storage leaked photo'; end if;
 begin insert into storage.objects(bucket_id,name) values('group-media',auth.uid()::text||'/'||gid::text||'/'||pid::text||'/intrusion.jpeg'); raise exception 'Outsider uploaded photo'; exception when insufficient_privilege then null; end;
 begin insert into public.group_posts(group_id,owner_id,kind,title) values(gid,auth.uid(),'plan','Intrusion'); raise exception 'Outsider published'; exception when insufficient_privilege then null; end;
 begin insert into public.group_post_responses(post_id,owner_id) values(pid,auth.uid()); raise exception 'Outsider responded'; exception when insufficient_privilege then null; end;
 perform set_config('request.jwt.claim.sub','7b1e09f3-5af1-4b2f-991c-94de71ab7100',true);
 perform public.set_group_gift_state(pid,'delivered',1);
 if not exists(select 1 from public.group_posts where id=pid and status='delivered' and revision=2) then raise exception 'Owner could not deliver'; end if;
 perform set_config('request.jwt.claim.sub','7b1e09f3-5af1-4b2f-991c-94de71ab7101',true);
 delete from public.group_post_responses where post_id=pid and owner_id=auth.uid();
 begin insert into public.group_post_responses(post_id,owner_id) values(pid,auth.uid()); raise exception 'Delivered gift accepted interest'; exception when insufficient_privilege then null; end;
 perform set_config('request.jwt.claim.sub','7b1e09f3-5af1-4b2f-991c-94de71ab7100',true);
 perform public.set_group_gift_state(pid,'open',2);
 perform public.remove_group_member(gid,'7b1e09f3-5af1-4b2f-991c-94de71ab7101');
 perform set_config('request.jwt.claim.sub','7b1e09f3-5af1-4b2f-991c-94de71ab7101',true);
 if exists(select 1 from public.group_posts where id=pid) or public.hub_can_read_group_media(photo) then raise exception 'Removed member still reads'; end if;
 perform set_config('request.jwt.claim.sub','7b1e09f3-5af1-4b2f-991c-94de71ab7100',true);
 insert into public.group_post_responses(post_id,owner_id) values(pid,auth.uid());
 if not exists(select 1 from public.group_post_responses where post_id=pid) then raise exception 'Response fixture missing'; end if;
 delete from public.group_availability where group_id=gid and owner_id=auth.uid();
 if exists(select 1 from public.group_availability where group_id=gid) then raise exception 'Availability withdrawal failed'; end if;
 delete from public.group_posts where id=pid;
 if exists(select 1 from public.group_post_responses where post_id=pid) then raise exception 'Responses not cascaded'; end if;
end $$;
reset role;
rollback;
