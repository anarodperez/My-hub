-- Only temporary fixtures. No account or wishlist rows are modified.
begin;
create temporary table collection_preferences_probe
  (like public.user_preferences including defaults including constraints);
do $$
declare
  probe_id uuid := gen_random_uuid();
  organization jsonb := '{"collections":[{"id":"personal","name":"Para mí"}],"assignments":{}}';
  bad jsonb;
begin
  insert into collection_preferences_probe(id) values(probe_id);
  update collection_preferences_probe set wishlist_organization = organization where id = probe_id;
  -- Older clients only update known columns; collection data must survive.
  update collection_preferences_probe set theme = 'dark' where id = probe_id;
  if (select wishlist_organization from collection_preferences_probe where id = probe_id) <> organization then
    raise exception 'Old-client update lost collections';
  end if;
  foreach bad in array array['{}'::jsonb, '[]'::jsonb, '{"collections":[],"assignments":[]}'::jsonb] loop
    begin
      update collection_preferences_probe set wishlist_organization = bad where id = probe_id;
      raise exception 'Invalid organization accepted';
    exception when check_violation then null;
    end;
  end loop;
  if not (select relrowsecurity from pg_class where oid = 'public.user_preferences'::regclass) then
    raise exception 'Private preferences require RLS';
  end if;
  if not exists(select 1 from pg_policies where schemaname = 'public' and tablename = 'user_preferences' and policyname = 'own_all' and qual like '%auth.uid()%') then
    raise exception 'Owner policy missing';
  end if;
end $$;
rollback;
