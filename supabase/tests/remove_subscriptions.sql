-- Run after migration 008 on an isolated test database.
begin;
do $$
begin
  if to_regclass('public.subscriptions') is not null then raise exception 'Subscriptions table remains'; end if;
  if exists(select 1 from public.migration_runs where entity_kind='subscription') then raise exception 'Retired mappings remain'; end if;
  if to_regclass('public.calendar_events') is null or to_regclass('public.wishlist_items') is null or to_regclass('public.group_posts') is null then raise exception 'Unrelated table removed'; end if;
end $$;
rollback;
