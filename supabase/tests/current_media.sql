-- Temporary rows only; no account data is changed.
begin;
create temporary table current_media_probe (like public.user_preferences including defaults including constraints);
do $$
declare probe_id uuid := gen_random_uuid(); item jsonb := '{"category":"series","title":"Una serie","status":"current","coverUrl":""}'; bad jsonb;
begin
  insert into current_media_probe(id, current_media) values(probe_id, jsonb_build_array(item));
  update current_media_probe set theme = 'dark' where id = probe_id;
  if (select current_media from current_media_probe where id = probe_id) <> jsonb_build_array(item) then raise exception 'Older client lost current media'; end if;
  foreach bad in array array['{}'::jsonb, '[{}]'::jsonb, jsonb_build_array(item,item), jsonb_build_array(item || '{"status":"invalid"}'), jsonb_build_array(item || '{"title":" "}')] loop
    begin
      update current_media_probe set current_media = bad where id = probe_id;
      raise exception 'Invalid current media accepted';
    exception when check_violation then null;
    end;
  end loop;
  update current_media_probe set current_media = '[]'::jsonb where id = probe_id;
  if not (select relrowsecurity from pg_class where oid = 'public.user_preferences'::regclass) then raise exception 'RLS missing'; end if;
  if not exists(select 1 from pg_policies where schemaname = 'public' and tablename = 'user_preferences' and policyname = 'own_all' and qual like '%auth.uid()%') then raise exception 'Owner policy missing'; end if;
end $$;
rollback;
