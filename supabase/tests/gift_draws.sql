begin;
insert into auth.users(id) values
('ab000000-0000-4000-8000-000000000001'),('ab000000-0000-4000-8000-000000000002'),
('ab000000-0000-4000-8000-000000000003'),('ab000000-0000-4000-8000-000000000004');
insert into public.groups(id,owner_id,name) values('ab000000-0000-4000-8000-000000000010','ab000000-0000-4000-8000-000000000001','Draw tests');
insert into public.group_members(group_id,user_id) select 'ab000000-0000-4000-8000-000000000010',id from auth.users where id in
('ab000000-0000-4000-8000-000000000001','ab000000-0000-4000-8000-000000000002','ab000000-0000-4000-8000-000000000003');
insert into public.group_posts(id,owner_id,group_id,kind,title) select
('ab000000-0000-4000-8000-00000000002'||n)::uuid,'ab000000-0000-4000-8000-000000000001','ab000000-0000-4000-8000-000000000010','gift','Gift '||n from generate_series(1,4) n;
set local role authenticated;
select set_config('request.jwt.claim.sub','ab000000-0000-4000-8000-000000000001',true);
do $$ begin
  begin insert into public.group_post_responses values('ab000000-0000-4000-8000-000000000021',auth.uid()); raise exception 'Owner entered own draw'; exception when check_violation then null; end;
  begin perform public.hub_resolve_gift_draws(); raise exception 'Called internal resolver'; exception when insufficient_privilege then null; end;
  begin perform public.set_group_gift_state('ab000000-0000-4000-8000-000000000021','delivered',1); raise exception 'Delivered before draw'; exception when check_violation then null; end;
end $$;
select set_config('request.jwt.claim.sub','ab000000-0000-4000-8000-000000000004',true);
do $$ begin
  begin perform public.resolve_group_gift_draws('ab000000-0000-4000-8000-000000000010'); raise exception 'Outsider resolved'; exception when insufficient_privilege then null; end;
  begin insert into public.group_post_responses values('ab000000-0000-4000-8000-000000000021',auth.uid()); raise exception 'Outsider participated'; exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub','ab000000-0000-4000-8000-000000000002',true);
insert into public.group_post_responses values
('ab000000-0000-4000-8000-000000000021',auth.uid()),('ab000000-0000-4000-8000-000000000022',auth.uid()),('ab000000-0000-4000-8000-000000000024',auth.uid());
delete from public.group_post_responses where post_id='ab000000-0000-4000-8000-000000000024';
select set_config('request.jwt.claim.sub','ab000000-0000-4000-8000-000000000003',true);
insert into public.group_post_responses values('ab000000-0000-4000-8000-000000000022',auth.uid()),('ab000000-0000-4000-8000-000000000024',auth.uid());
reset role;
delete from public.group_members where user_id='ab000000-0000-4000-8000-000000000003';
update public.group_posts set gift_draw_at=now()-interval '1 second' where group_id='ab000000-0000-4000-8000-000000000010';
set local role authenticated;
select set_config('request.jwt.claim.sub','ab000000-0000-4000-8000-000000000002',true);
do $$ begin
  begin delete from public.group_post_responses where post_id='ab000000-0000-4000-8000-000000000021'; raise exception 'Withdrew after close'; exception when check_violation then null; end;
  begin insert into public.group_post_responses values('ab000000-0000-4000-8000-000000000023',auth.uid()); raise exception 'Joined after close'; exception when check_violation then null; end;
end $$;
select public.resolve_group_gift_draws('ab000000-0000-4000-8000-000000000010');
do $$ declare rev integer; begin
  if (select count(*) from public.group_posts where group_id='ab000000-0000-4000-8000-000000000010' and gift_drawn_at is not null)<>4 then raise exception 'Not all draws resolved'; end if;
  if (select count(*) from public.group_posts where group_id='ab000000-0000-4000-8000-000000000010' and status='reserved' and reserved_for=auth.uid())<>2 then raise exception 'Wrong recipients / former member won'; end if;
  if (select count(*) from public.group_posts where group_id='ab000000-0000-4000-8000-000000000010' and status='open' and reserved_for is null)<>2 then raise exception 'Empty draws were assigned'; end if;
  select revision into rev from public.group_posts where id='ab000000-0000-4000-8000-000000000021';
  perform public.resolve_group_gift_draws('ab000000-0000-4000-8000-000000000010');
  if (select revision from public.group_posts where id='ab000000-0000-4000-8000-000000000021')<>rev then raise exception 'Draw repeated'; end if;
  begin update public.group_posts set reserved_for=auth.uid() where id='ab000000-0000-4000-8000-000000000023'; raise exception 'Direct assignment allowed'; exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub','ab000000-0000-4000-8000-000000000001',true);
do $$ declare rev integer; begin
  select revision into rev from public.group_posts where id='ab000000-0000-4000-8000-000000000021';
  begin perform public.set_group_gift_state('ab000000-0000-4000-8000-000000000021','open',rev); raise exception 'Draw reopened'; exception when check_violation then null; end;
  perform public.set_group_gift_state('ab000000-0000-4000-8000-000000000021','delivered',rev);
  if not exists(select 1 from public.group_posts where id='ab000000-0000-4000-8000-000000000021' and status='delivered' and reserved_for='ab000000-0000-4000-8000-000000000002') then raise exception 'Delivery lost winner'; end if;
end $$;
-- Account deletion and removal of a post still cascade after the draw.
reset role;
-- Two eligible participants: select exactly one, then preserve that same result on retry.
insert into public.group_members(group_id,user_id) values('ab000000-0000-4000-8000-000000000010','ab000000-0000-4000-8000-000000000004');
insert into public.group_posts(id,owner_id,group_id,kind,title) values('ab000000-0000-4000-8000-000000000025','ab000000-0000-4000-8000-000000000001','ab000000-0000-4000-8000-000000000010','gift','Two participants');
set local role authenticated;
select set_config('request.jwt.claim.sub','ab000000-0000-4000-8000-000000000002',true);
insert into public.group_post_responses values('ab000000-0000-4000-8000-000000000025',auth.uid());
select set_config('request.jwt.claim.sub','ab000000-0000-4000-8000-000000000004',true);
insert into public.group_post_responses values('ab000000-0000-4000-8000-000000000025',auth.uid());
reset role;
update public.group_posts set gift_draw_at=now()-interval '1 second' where id='ab000000-0000-4000-8000-000000000025';
set local role authenticated;
do $$ declare winner uuid; begin
  perform public.resolve_group_gift_draws('ab000000-0000-4000-8000-000000000010');
  select reserved_for into winner from public.group_posts where id='ab000000-0000-4000-8000-000000000025';
  if winner is null or winner not in ('ab000000-0000-4000-8000-000000000002','ab000000-0000-4000-8000-000000000004') then raise exception 'Invalid winner'; end if;
  perform public.resolve_group_gift_draws('ab000000-0000-4000-8000-000000000010');
  if (select reserved_for from public.group_posts where id='ab000000-0000-4000-8000-000000000025') is distinct from winner then raise exception 'Winner changed'; end if;
end $$;
reset role;
delete from auth.users where id='ab000000-0000-4000-8000-000000000002';
do $$ begin
  if not exists(select 1 from public.group_posts where id='ab000000-0000-4000-8000-000000000021' and status='delivered' and reserved_for is null and gift_drawn_at is not null) then raise exception 'Deleted winner lost delivery state'; end if;
end $$;
delete from public.group_posts where group_id='ab000000-0000-4000-8000-000000000010';
rollback;
