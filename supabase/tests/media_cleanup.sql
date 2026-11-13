-- All fixtures are temporary tables. No account data or Storage objects are deleted.
begin;
create temporary table recommendations(cover_path text);
create temporary table wishlist_items(cover_path text);
create temporary table moment_songs(cover_path text);
create temporary table profiles(avatar_path text);
create temporary table user_preferences(current_media jsonb);
do $$
declare definition text; table_name text;
begin
  definition := pg_get_functiondef('public.hub_can_delete_media(text)'::regprocedure);
  definition := replace(definition, 'public.hub_can_delete_media', 'pg_temp.media_cleanup_probe');
  foreach table_name in array array['recommendations','wishlist_items','moment_songs','profiles','user_preferences'] loop
    definition := replace(definition, 'public.' || table_name, 'pg_temp.' || table_name);
  end loop;
  execute definition;
end $$;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
do $$
declare path text := '10000000-0000-4000-8000-000000000001/post/photo.webp'; table_name text; column_name text;
begin
  if not pg_temp.media_cleanup_probe(path) then raise exception 'Unused own photo cannot be cleaned'; end if;
  if pg_temp.media_cleanup_probe('20000000-0000-4000-8000-000000000002/post/photo.webp') then raise exception 'Foreign photo can be deleted'; end if;
  foreach table_name in array array['recommendations','wishlist_items','moment_songs','profiles'] loop
    column_name := case when table_name='profiles' then 'avatar_path' else 'cover_path' end;
    execute format('insert into pg_temp.%I(%I) values($1)',table_name,column_name) using path;
    if pg_temp.media_cleanup_probe(path) then raise exception 'Photo referenced by % can be deleted',table_name; end if;
    execute format('truncate pg_temp.%I',table_name);
  end loop;
  insert into user_preferences values(jsonb_build_array(jsonb_build_object('coverUrl',path)));
  if pg_temp.media_cleanup_probe(path) then raise exception 'Mi momento photo can be deleted'; end if;
  update user_preferences set current_media=jsonb_build_array(jsonb_build_object('coverPath',path));
  if pg_temp.media_cleanup_probe(path) then raise exception 'Mi momento stable path can be deleted'; end if;
  truncate user_preferences;
  if not pg_temp.media_cleanup_probe(path) then raise exception 'Unreferenced photo remains blocked'; end if;
  if not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='hub_media_delete' and qual like '%hub_can_delete_media%') then raise exception 'Storage policy does not enforce references'; end if;
end $$;
rollback;
