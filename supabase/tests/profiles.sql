-- Run after the migration in an isolated Supabase test project as postgres.
-- Every assertion raises on failure; all fixtures are rolled back.
begin;
insert into auth.users (id, aud, role, email) values
 ('11111111-1111-4111-8111-111111111111', 'authenticated', 'authenticated', 'test-a@example.invalid'),
 ('22222222-2222-4222-8222-222222222222', 'authenticated', 'authenticated', 'test-b@example.invalid');
insert into public.profiles (id, name) values
 ('11111111-1111-4111-8111-111111111111', 'A');
set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
do $$
declare affected integer;
begin
  if (select count(*) from public.profiles) <> 1 then raise exception 'profile leak'; end if;
  update public.profiles set name = 'A edited' where id = auth.uid();
  get diagnostics affected = row_count;
  if affected <> 1 then raise exception 'own update denied'; end if;
  update public.profiles set name = 'stolen' where id = '22222222-2222-4222-8222-222222222222';
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'foreign update allowed'; end if;
  begin
    insert into public.profiles (id, name) values ('22222222-2222-4222-8222-222222222222', 'stolen');
    raise exception 'foreign insert allowed';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.profiles set id = '22222222-2222-4222-8222-222222222222';
    raise exception 'owner mutation allowed';
  exception when insufficient_privilege then null;
  end;
end $$;
select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', true);
do $$ begin
  insert into public.profiles (id, name) values (auth.uid(), 'B') on conflict (id) do nothing;
  insert into public.profiles (id, name) values (auth.uid(), 'ignored') on conflict (id) do nothing;
  update public.profiles set name = 'B' where id = auth.uid();
  if (select count(*) from public.profiles) <> 1 or (select name from public.profiles) <> 'B' then
    raise exception 'second account leak';
  end if;
end $$;
set local role anon;
do $$ begin
  begin
    perform * from public.profiles;
    raise exception 'anonymous access allowed';
  exception when insufficient_privilege then null;
  end;
end $$;
rollback;
