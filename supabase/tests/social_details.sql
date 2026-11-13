-- Shadow tables/functions only: no real recommendations, memberships or reactions are changed.
begin;
create temporary table groups (like public.groups including defaults);
create temporary table recommendation_reactions(post_id uuid,user_id uuid,kind text check(kind in ('need','convinced','you')),constraint recommendation_reactions_pkey primary key(post_id,user_id));
create function pg_temp.hub_is_member(uuid) returns boolean language sql as $$ select true $$;
create function pg_temp.hub_can_read_post(uuid) returns boolean language sql as $$ select $1='20000000-0000-4000-8000-000000000001'::uuid $$;
do $$
declare definition text; signature text;
begin
  foreach signature in array array['set_group_cover(uuid,text)','recommendation_reaction_summary(uuid[])','set_recommendation_reaction(uuid,text)'] loop
    definition:=pg_get_functiondef(('public.'||signature)::regprocedure);
    definition:=replace(definition,'public.','pg_temp.');
    execute definition;
  end loop;
end $$;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
insert into groups(id,name,owner_id) values('30000000-0000-4000-8000-000000000001','Test','10000000-0000-4000-8000-000000000001');
do $$
declare target uuid:='20000000-0000-4000-8000-000000000001'; result record;
begin
  perform pg_temp.set_group_cover('30000000-0000-4000-8000-000000000001','flowers');
  if (select cover_key from groups limit 1)<>'flowers' then raise exception 'Cover not persisted'; end if;
  perform set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',true);
  begin
    perform pg_temp.set_group_cover('30000000-0000-4000-8000-000000000001','coffee');
    raise exception 'Foreign cover write allowed';
  exception when insufficient_privilege then null; end;
  perform set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
  select * into result from pg_temp.set_recommendation_reaction(target,'need');
  if result.need_count<>1 or result.mine<>'need' then raise exception 'Reaction missing'; end if;
  perform pg_temp.set_recommendation_reaction(target,'need');
  if (select count(*) from recommendation_reactions)<>1 then raise exception 'Retry duplicated reaction'; end if;
  select * into result from pg_temp.set_recommendation_reaction(target,'you');
  if result.need_count<>0 or result.you_count<>1 then raise exception 'Switch failed'; end if;
  perform set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',true);
  select * into result from pg_temp.set_recommendation_reaction(target,'need');
  if result.need_count<>1 or result.you_count<>1 or result.mine<>'need' then raise exception 'Counts mix accounts'; end if;
  select * into result from pg_temp.set_recommendation_reaction(target,null);
  if result.need_count<>0 or result.you_count<>1 or result.mine is not null then raise exception 'Removal failed'; end if;
  begin
    perform pg_temp.set_recommendation_reaction('20000000-0000-4000-8000-000000000099','need');
    raise exception 'Hidden post allowed';
  exception when insufficient_privilege then null; end;
  if exists(select * from pg_temp.recommendation_reaction_summary(array['20000000-0000-4000-8000-000000000099'::uuid])) then raise exception 'Hidden counts exposed'; end if;
  if not (select relrowsecurity from pg_class where oid='public.recommendation_reactions'::regclass) then raise exception 'RLS disabled'; end if;
  if (select count(*) from pg_policies where schemaname='public' and tablename='recommendation_reactions')<>4 then raise exception 'Missing policies'; end if;
end $$;
rollback;
