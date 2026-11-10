begin;
-- One transaction prevents partially saved whole-day answers.
create function public.set_group_availability_day(target_group uuid,target_date date,can_attend boolean)
returns void language plpgsql security invoker set search_path='' as $$
begin
  perform public.set_group_availability(target_group,target_date,'morning',can_attend);
  perform public.set_group_availability(target_group,target_date,'afternoon',can_attend);
  perform public.set_group_availability(target_group,target_date,'evening',can_attend);
end $$;
revoke all on function public.set_group_availability_day(uuid,date,boolean) from public,anon;
grant execute on function public.set_group_availability_day(uuid,date,boolean) to authenticated;
commit;
