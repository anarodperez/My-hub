begin;
insert into auth.users(id) values ('1b1e09f3-5af1-4b2f-991c-94de71ab7100'),('1b1e09f3-5af1-4b2f-991c-94de71ab7101');
set local role authenticated;
select set_config('request.jwt.claim.sub','1b1e09f3-5af1-4b2f-991c-94de71ab7100',true);
do $$
declare gid uuid; wid uuid; pid uuid; retry uuid; foreign_post uuid; saved_wish uuid;
begin
 gid=public.create_group('Original');
 perform public.rename_group(gid,'  Renamed  ');
 if not exists(select 1 from public.groups where id=gid and name='Renamed') then raise exception 'Rename failed'; end if;
 begin perform public.rename_group(gid,' '); raise exception 'Blank name permitted'; exception when check_violation then null; end;
 insert into public.wishlist_items(owner_id,title,category,link) values(auth.uid(),'My wish','book','https://example.com') returning id into wid;
 begin perform public.review_wishlist(wid,false,'',4); raise exception 'Empty review permitted'; exception when check_violation then null; end;
 if exists(select 1 from public.wishlist_items where id=wid and status='finished') then raise exception 'Failed review completed wish'; end if;
 pid=public.review_wishlist(wid,false,'My opinion',4.5);
 retry=public.review_wishlist(wid,false,'My opinion',4.5);
 if pid<>retry or pid<>wid then raise exception 'Retry duplicated'; end if;
 if not exists(select 1 from public.recommendations where id=pid and title='My wish' and rating=4.5 and visibility='private' and link='https://example.com') then raise exception 'Review lost data'; end if;
 if not exists(select 1 from public.wishlist_items where id=wid and status='finished') then raise exception 'Wish not completed'; end if;
 perform set_config('request.jwt.claim.sub','1b1e09f3-5af1-4b2f-991c-94de71ab7101',true);
 begin perform public.rename_group(gid,'Hacked'); raise exception 'Foreign rename permitted'; exception when insufficient_privilege then null; end;
 begin perform public.review_wishlist(wid,false,'Hacked',5); raise exception 'Foreign review permitted'; exception when insufficient_privilege then null; end;
 insert into public.recommendations(owner_id,title,category,opinion,rating,visibility,cover_path)
 values(auth.uid(),'Public source','movie','Source opinion',3,'public',auth.uid()::text||'/test.png') returning id into foreign_post;
 perform set_config('request.jwt.claim.sub','1b1e09f3-5af1-4b2f-991c-94de71ab7100',true);
 insert into public.wishlist_items(owner_id,recommendation_id) values(auth.uid(),foreign_post) returning id into saved_wish;
 pid=public.review_wishlist(foreign_post,true,'My own opinion',5);
 if pid<>saved_wish then raise exception 'Saved review wrong ID'; end if;
 if not exists(select 1 from public.recommendations where id=pid and owner_id=auth.uid() and opinion='My own opinion' and cover_path='' and title='Public source') then raise exception 'Saved review wrong owner/data'; end if;
 if not exists(select 1 from public.recommendations where id=foreign_post and opinion='Source opinion' and rating=3) then raise exception 'Source modified'; end if;
end $$;
reset role;
rollback;
