begin;
-- Additive: existing clients omit this column and keep the organization intact.
alter table public.user_preferences
  add column if not exists wishlist_organization jsonb;
do $$ begin
if not exists (select 1 from pg_constraint where conrelid = 'public.user_preferences'::regclass and conname = 'wishlist_organization_shape') then
alter table public.user_preferences
  add constraint wishlist_organization_shape check (
    wishlist_organization is null or coalesce((
      jsonb_typeof(wishlist_organization) = 'object'
      and jsonb_typeof(wishlist_organization->'collections') = 'array'
      and jsonb_typeof(wishlist_organization->'assignments') = 'object'
      and jsonb_array_length(wishlist_organization->'collections') <= 100
    ), false)
  );
end if;
end $$;
notify pgrst, 'reload schema';
commit;
