begin;

-- INSERT RETURNING must evaluate the new row directly: a STABLE helper that
-- queries recommendations cannot see that row in the statement's snapshot.
alter policy post_read on public.recommendations using (
  (select auth.uid()) is not null and (
    owner_id = (select auth.uid())
    or visibility = 'public'
    or (visibility = 'group' and public.hub_is_member(group_id))
  )
);

commit;
