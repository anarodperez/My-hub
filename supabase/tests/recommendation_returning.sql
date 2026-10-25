begin;
insert into auth.users(id) values
 ('b9f8c779-c839-4e78-a1ab-5b90a20fe650'),
 ('b9f8c779-c839-4e78-a1ab-5b90a20fe651');
set local role authenticated;
select set_config('request.jwt.claim.sub','b9f8c779-c839-4e78-a1ab-5b90a20fe650',true);
do $$
declare post uuid;
begin
 insert into public.recommendations(owner_id,title,category,opinion,rating,visibility)
 values(auth.uid(),'Returning test','book','Test',4,'private') returning id into post;
 if post is null then raise exception 'INSERT RETURNING failed'; end if;
 update public.recommendations set title='Updated' where id=post returning id into post;
 if post is null then raise exception 'UPDATE RETURNING failed'; end if;
 perform set_config('request.jwt.claim.sub','b9f8c779-c839-4e78-a1ab-5b90a20fe651',true);
 if exists(select 1 from public.recommendations where id=post) then
   raise exception 'Private post leaked';
 end if;
end $$;
reset role;
rollback;
