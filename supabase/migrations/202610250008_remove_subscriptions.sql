-- User explicitly retired this feature and authorized deleting its data.
begin;
drop table public.subscriptions;
delete from public.migration_runs where entity_kind='subscription';
alter table public.migration_runs drop constraint migration_runs_entity_kind_check;
alter table public.migration_runs add constraint migration_runs_entity_kind_check
  check(entity_kind in ('recommendation','wish','saved','event','song','preferences','run'));
commit;
