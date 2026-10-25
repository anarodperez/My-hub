begin;
insert into auth.users(id) values('10000000-0000-4000-8000-000000000001'),('10000000-0000-4000-8000-000000000002');
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
insert into public.recommendations(id,owner_id,title,category,opinion,rating,visibility) values('20000000-0000-4000-8000-000000000001',auth.uid(),'GIF test','book','Test',5,'public');
insert into storage.objects(bucket_id,name) values('comment-gifs','10000000-0000-4000-8000-000000000001/30000000-0000-4000-8000-000000000001/image.gif');
insert into public.comments(id,post_id,author_id,body,gif_path) values('30000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001',auth.uid(),'','10000000-0000-4000-8000-000000000001/30000000-0000-4000-8000-000000000001/image.gif');
do $$ begin
 begin
  insert into public.comments(post_id,author_id,body) values('20000000-0000-4000-8000-000000000001',auth.uid(),'');
  raise exception 'Empty comment accepted';
 exception when check_violation then null; end;
 delete from storage.objects where bucket_id='comment-gifs';
 if found then raise exception 'Referenced GIF deleted'; end if;
end $$;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',true);
do $$ begin
 if (select count(*) from storage.objects where bucket_id='comment-gifs')<>1 then raise exception 'Readable comment GIF missing'; end if;
 begin
  insert into public.comments(id,post_id,author_id,body,gif_path) values('30000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000001',auth.uid(),'','10000000-0000-4000-8000-000000000001/30000000-0000-4000-8000-000000000001/image.gif');
  raise exception 'Foreign GIF accepted';
 exception when check_violation then null; end;
 delete from public.comments where id='30000000-0000-4000-8000-000000000001';
 if found then raise exception 'Foreign comment deleted'; end if;
end $$;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
update public.recommendations set visibility='private' where id='20000000-0000-4000-8000-000000000001';
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',true);
do $$ begin
 if exists(select 1 from storage.objects where bucket_id='comment-gifs') then raise exception 'Private GIF leaked'; end if;
end $$;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
delete from public.comments where id='30000000-0000-4000-8000-000000000001';
delete from storage.objects where bucket_id='comment-gifs';
do $$ begin
 if exists(select 1 from storage.objects where bucket_id='comment-gifs') then raise exception 'Unreferenced GIF not deletable'; end if;
end $$;
rollback;
