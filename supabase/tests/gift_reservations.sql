begin;
insert into auth.users(id) values('9b1e09f3-5af1-4b2f-991c-94de71ab7100'),('9b1e09f3-5af1-4b2f-991c-94de71ab7101'),('9b1e09f3-5af1-4b2f-991c-94de71ab7102');
insert into public.groups(id,owner_id,name) values('9b1e09f3-5af1-4b2f-991c-94de71ab7110','9b1e09f3-5af1-4b2f-991c-94de71ab7100','Reservation test');
insert into public.group_members(group_id,user_id) values
('9b1e09f3-5af1-4b2f-991c-94de71ab7110','9b1e09f3-5af1-4b2f-991c-94de71ab7100'),
('9b1e09f3-5af1-4b2f-991c-94de71ab7110','9b1e09f3-5af1-4b2f-991c-94de71ab7101');
insert into public.group_posts(id,owner_id,group_id,kind,title) values('9b1e09f3-5af1-4b2f-991c-94de71ab7120','9b1e09f3-5af1-4b2f-991c-94de71ab7100','9b1e09f3-5af1-4b2f-991c-94de71ab7110','gift','Test gift');
set local role authenticated;
select set_config('request.jwt.claim.sub','9b1e09f3-5af1-4b2f-991c-94de71ab7100',true);
do $$
declare pid uuid := '9b1e09f3-5af1-4b2f-991c-94de71ab7120'; recipient uuid := '9b1e09f3-5af1-4b2f-991c-94de71ab7101';
begin
 begin perform public.set_group_gift_state(pid,'reserved',1,recipient); raise exception 'Reserved without interest'; exception when check_violation then null; end;
 perform set_config('request.jwt.claim.sub',recipient::text,true);
 insert into public.group_post_responses(post_id,owner_id) values(pid,auth.uid());
 begin perform public.set_group_gift_state(pid,'reserved',1,recipient); raise exception 'Recipient reserved own gift'; exception when insufficient_privilege then null; end;
 perform set_config('request.jwt.claim.sub','9b1e09f3-5af1-4b2f-991c-94de71ab7102',true);
 begin perform public.set_group_gift_state(pid,'open',1); raise exception 'Outsider changed state'; exception when insufficient_privilege then null; end;
 perform set_config('request.jwt.claim.sub','9b1e09f3-5af1-4b2f-991c-94de71ab7100',true);
 begin update public.group_posts set status='reserved',reserved_for=recipient where id=pid; raise exception 'Direct reservation bypass permitted'; exception when insufficient_privilege then null; end;
 perform public.set_group_gift_state(pid,'reserved',1,recipient);
 if not exists(select 1 from public.group_posts where id=pid and status='reserved' and reserved_for=recipient and revision=2) then raise exception 'Reservation not persisted'; end if;
 begin perform public.set_group_gift_state(pid,'open',1); raise exception 'Stale revision accepted'; exception when serialization_failure then null; end;
 perform set_config('request.jwt.claim.sub',recipient::text,true);
 delete from public.group_post_responses where post_id=pid and owner_id=auth.uid();
 begin insert into public.group_post_responses(post_id,owner_id) values(pid,auth.uid()); raise exception 'Reserved gift accepted new interest'; exception when insufficient_privilege then null; end;
 perform set_config('request.jwt.claim.sub','9b1e09f3-5af1-4b2f-991c-94de71ab7100',true);
 perform public.set_group_gift_state(pid,'delivered',2);
 if not exists(select 1 from public.group_posts where id=pid and status='delivered' and reserved_for=recipient) then raise exception 'Delivery lost recipient'; end if;
 perform public.set_group_gift_state(pid,'open',3);
 if not exists(select 1 from public.group_posts where id=pid and status='open' and reserved_for is null and revision=4) then raise exception 'Release failed'; end if;
end $$;
reset role;
rollback;
