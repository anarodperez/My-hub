begin;
insert into auth.users(id) select ('bc000000-0000-4000-8000-00000000000'||n)::uuid from generate_series(1,4) n;
insert into public.groups(id,owner_id,name) values('bc000000-0000-4000-8000-000000000010','bc000000-0000-4000-8000-000000000001','Offer tests');
insert into public.group_members(group_id,user_id) select 'bc000000-0000-4000-8000-000000000010',('bc000000-0000-4000-8000-00000000000'||n)::uuid from generate_series(1,3) n;
insert into public.group_posts(id,group_id,owner_id,kind,title,offer_mode,price_cents)
select ('bc000000-0000-4000-8000-00000000002'||n)::uuid,'bc000000-0000-4000-8000-000000000010','bc000000-0000-4000-8000-000000000001','gift','Offer',case when n=1 then 'fixed' else 'auction' end,1000 from generate_series(1,4)n;
do $$ begin
 if exists(select 1 from public.group_posts where id='bc000000-0000-4000-8000-000000000021' and gift_draw_at is not null) then raise exception 'Fixed price has deadline'; end if;
 begin insert into public.group_posts(group_id,owner_id,kind,title,offer_mode) values('bc000000-0000-4000-8000-000000000010','bc000000-0000-4000-8000-000000000001','gift','Invalid','fixed'); raise exception 'Null price accepted'; exception when check_violation then null; end;
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub','bc000000-0000-4000-8000-000000000001',true);
do $$ begin
 begin perform public.place_group_bid('bc000000-0000-4000-8000-000000000022',1000);raise exception 'Owner bid';exception when insufficient_privilege then null;end;
 begin perform public.set_group_gift_state('bc000000-0000-4000-8000-000000000021','delivered',1);raise exception 'Unreserved delivery';exception when check_violation then null;end;
end $$;
select set_config('request.jwt.claim.sub','bc000000-0000-4000-8000-000000000004',true);
do $$ begin
 begin perform public.place_group_bid('bc000000-0000-4000-8000-000000000022',1000);raise exception 'Outsider bid';exception when insufficient_privilege then null;end;
 begin perform public.reserve_priced_gift('bc000000-0000-4000-8000-000000000021');raise exception 'Outsider reserved';exception when insufficient_privilege then null;end;
 if exists(select 1 from public.group_post_bids) then raise exception 'Outsider read bids';end if;
end $$;
select set_config('request.jwt.claim.sub','bc000000-0000-4000-8000-000000000002',true);
select public.place_group_bid('bc000000-0000-4000-8000-000000000022',1000);
select public.place_group_bid('bc000000-0000-4000-8000-000000000022',1000);
select public.place_group_bid('bc000000-0000-4000-8000-000000000023',1000);
select public.reserve_priced_gift('bc000000-0000-4000-8000-000000000021');
select public.reserve_priced_gift('bc000000-0000-4000-8000-000000000021');
do $$ begin
 begin insert into public.group_post_bids values('bc000000-0000-4000-8000-000000000022',auth.uid(),9000);raise exception 'Direct bid allowed';exception when insufficient_privilege then null;end;
 begin insert into public.group_post_responses values('bc000000-0000-4000-8000-000000000022',auth.uid());raise exception 'Auction entered as raffle';exception when check_violation then null;end;
end $$;
select set_config('request.jwt.claim.sub','bc000000-0000-4000-8000-000000000003',true);
do $$ begin
 begin perform public.place_group_bid('bc000000-0000-4000-8000-000000000022',1050);raise exception 'Small increment accepted';exception when check_violation then null;end;
 begin perform public.reserve_priced_gift('bc000000-0000-4000-8000-000000000021');raise exception 'Double reservation';exception when check_violation then null;end;
end $$;
select public.place_group_bid('bc000000-0000-4000-8000-000000000022',1100);
select public.place_group_bid('bc000000-0000-4000-8000-000000000023',2000);
reset role;
update public.group_posts set gift_draw_at=now()-interval '1 second' where id='bc000000-0000-4000-8000-000000000022';
set local role authenticated;
do $$ begin
 begin perform public.place_group_bid('bc000000-0000-4000-8000-000000000022',3000);raise exception 'Late bid accepted';exception when check_violation then null;end;
 perform public.resolve_group_gift_draws('bc000000-0000-4000-8000-000000000010');
 if not exists(select 1 from public.group_posts where id='bc000000-0000-4000-8000-000000000022' and reserved_for=auth.uid() and winning_bid_cents=1100 and status='reserved') then raise exception 'Wrong winning bid';end if;
 perform public.resolve_group_gift_draws('bc000000-0000-4000-8000-000000000010');
end $$;
reset role;
delete from public.group_members where user_id='bc000000-0000-4000-8000-000000000003';
update public.group_posts set gift_draw_at=now()-interval '1 second' where id in ('bc000000-0000-4000-8000-000000000023','bc000000-0000-4000-8000-000000000024');
set local role authenticated;
select set_config('request.jwt.claim.sub','bc000000-0000-4000-8000-000000000002',true);
select public.resolve_group_gift_draws('bc000000-0000-4000-8000-000000000010');
do $$ begin
 if not exists(select 1 from public.group_posts where id='bc000000-0000-4000-8000-000000000023' and reserved_for=auth.uid() and winning_bid_cents=1000) then raise exception 'Former member won';end if;
 if not exists(select 1 from public.group_posts where id='bc000000-0000-4000-8000-000000000024' and reserved_for is null and gift_drawn_at is not null) then raise exception 'Empty auction assigned';end if;
end $$;
reset role;
delete from auth.users where id='bc000000-0000-4000-8000-000000000003';
do $$ begin
 if not exists(select 1 from public.group_posts where id='bc000000-0000-4000-8000-000000000022' and reserved_for is null and winning_bid_cents=1100) then raise exception 'Deleted winner lost final price';end if;
end $$;
rollback;
