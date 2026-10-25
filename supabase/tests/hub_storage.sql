begin;
insert into auth.users(id) values
('10000000-0000-4000-8000-000000000001'),
('10000000-0000-4000-8000-000000000002');
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
insert into storage.objects(bucket_id,name) values
('hub-media','10000000-0000-4000-8000-000000000001/post/private.jpg'),
('hub-media','10000000-0000-4000-8000-000000000001/post/public.jpg'),
('hub-media','10000000-0000-4000-8000-000000000001/post/group.jpg');
select public.create_group('Storage test') as gid \gset
select public.create_group_invite(:'gid') as token \gset
insert into public.recommendations(id,owner_id,title,category,opinion,rating,visibility,cover_path,group_id) values
('30000000-0000-4000-8000-000000000001',auth.uid(),'Private','book','Test',5,'private','10000000-0000-4000-8000-000000000001/post/private.jpg',null),
('30000000-0000-4000-8000-000000000002',auth.uid(),'Public','book','Test',5,'public','10000000-0000-4000-8000-000000000001/post/public.jpg',null),
('30000000-0000-4000-8000-000000000003',auth.uid(),'Group','book','Test',5,'group','10000000-0000-4000-8000-000000000001/post/group.jpg',:'gid');
do $$ begin
 delete from storage.objects where name='10000000-0000-4000-8000-000000000001/post/private.jpg';
 if found then raise exception 'Referenced image deleted'; end if;
end $$;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',true);
do $$ begin
 if (select count(*) from storage.objects where bucket_id='hub-media') <> 1 then raise exception 'Private media leaked'; end if;
 begin
  insert into storage.objects(bucket_id,name) values('hub-media','10000000-0000-4000-8000-000000000001/post/foreign.jpg');
  raise exception 'Foreign upload allowed';
 exception when insufficient_privilege then null; end;
end $$;
select public.accept_group_invite(:'token');
do $$ begin
 if (select count(*) from storage.objects where bucket_id='hub-media') <> 2 then raise exception 'Group image inaccessible'; end if;
end $$;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
select public.remove_group_member(:'gid','10000000-0000-4000-8000-000000000002');
update public.recommendations set visibility='private' where id='30000000-0000-4000-8000-000000000002';
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',true);
do $$ begin
 if exists(select 1 from storage.objects where bucket_id='hub-media') then raise exception 'Revoked media still accessible'; end if;
end $$;
rollback;
