begin;
insert into auth.users(id) values ('10000000-0000-4000-8000-000000000001'), ('10000000-0000-4000-8000-000000000002'), ('10000000-0000-4000-8000-000000000003');
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
insert into public.calendar_events(id,owner_id,title,category,event_date) values ('20000000-0000-4000-8000-000000000001',auth.uid(),'Privado','book','2026-10-20');
insert into public.recommendations(id,owner_id,title,category,opinion,rating,visibility) values
('30000000-0000-4000-8000-000000000001',auth.uid(),'Privada','book','Opinion',5,'private'),
('30000000-0000-4000-8000-000000000002',auth.uid(),'Publica','book','Opinion',5,'public');
select public.create_group('Amigos') as gid \gset
select public.create_group_invite(:'gid') as token \gset
insert into public.recommendations(id,owner_id,title,category,opinion,rating,visibility,group_id) values ('30000000-0000-4000-8000-000000000003',auth.uid(),'Grupo','book','Opinion',4,'group',:'gid');
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',true);
do $$ begin
 if (select count(*) from public.calendar_events) <> 0 then raise exception 'Private event leaked'; end if;
 if (select count(*) from public.recommendations) <> 1 then raise exception 'Private/group post leaked'; end if;
 update public.recommendations set title='Hacked' where id='30000000-0000-4000-8000-000000000002';
 if found then raise exception 'Foreign edit permitted'; end if;
 begin
  insert into public.comments(post_id,author_id,body) values ('30000000-0000-4000-8000-000000000001',auth.uid(),'Forbidden');
  raise exception 'Private comment allowed';
 exception when insufficient_privilege then null; end;
end $$;
select public.accept_group_invite(:'token');
do $$ begin if (select count(*) from public.recommendations) <> 2 then raise exception 'Group missing'; end if; end $$;
insert into public.comments(id,post_id,author_id,body) values ('40000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000003',auth.uid(),'Hola');
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000003',true);
do $$ begin if (select count(*) from public.comments) <> 0 then raise exception 'Group comment leaked'; end if; end $$;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
select public.remove_group_member(:'gid','10000000-0000-4000-8000-000000000002');
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',true);
do $$ begin
 if (select count(*) from public.comments) <> 0 then raise exception 'Expelled reader sees comments'; end if;
 if (select count(*) from public.recommendations) <> 1 then raise exception 'Expelled reader sees group post'; end if;
end $$;
reset role;
set local role anon;
do $$ begin
 begin perform * from public.recommendations; raise exception 'Anon permitted'; exception when insufficient_privilege then null; end;
end $$;
rollback;
