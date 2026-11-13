-- Supabase Cron resolves gifts even when nobody has the app open.
begin;
create extension if not exists pg_cron;
select cron.schedule('hub-gift-draws', '* * * * *', 'select public.hub_resolve_gift_draws();');
commit;
