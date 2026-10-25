begin;

create function public.rename_group(target uuid, group_name text) returns void
language plpgsql security definer set search_path='' as $$
begin
 if not public.hub_owns_group(target) then raise insufficient_privilege; end if;
 if group_name is null or length(btrim(group_name)) not between 1 and 80 then
   raise check_violation using message='Group name must contain 1 to 80 characters';
 end if;
 update public.groups set name=btrim(group_name) where id=target;
end $$;

create function public.review_wishlist(target uuid, saved_post boolean, review text, score numeric) returns uuid
language plpgsql security definer set search_path='' as $$
declare wish public.wishlist_items; source public.recommendations; existing public.recommendations;
begin
 if auth.uid() is null then raise insufficient_privilege; end if;
 select * into wish from public.wishlist_items w where w.owner_id=auth.uid()
   and ((saved_post and w.recommendation_id=target) or (not saved_post and w.id=target and w.recommendation_id is null)) for update;
 if not found then raise insufficient_privilege using message='Wish is not available'; end if;
 if review is null or length(btrim(review)) not between 1 and 2000 or score is null or score < 0.5 or score > 5 or score*2<>trunc(score*2) then
   raise check_violation using message='Invalid review or rating';
 end if;
 select * into existing from public.recommendations where id=wish.id;
 if found then
   if existing.owner_id<>auth.uid() then raise insufficient_privilege; end if;
   update public.wishlist_items set status='finished' where id=wish.id;
   return existing.id;
 end if;
 if wish.recommendation_id is not null then
   if not public.hub_can_read_post(wish.recommendation_id) then raise insufficient_privilege; end if;
   select * into source from public.recommendations where id=wish.recommendation_id;
 end if;
 insert into public.recommendations(id,owner_id,title,category,opinion,rating,cover_path,link,price_cents,location,visibility)
 values(wish.id,auth.uid(),coalesce(source.title,wish.title),coalesce(source.category,wish.category),btrim(review),score,
   case when source.id is null then wish.cover_path when source.owner_id=auth.uid() then source.cover_path else '' end,
   coalesce(source.link,wish.link),source.price_cents,source.location,'private');
 update public.wishlist_items set status='finished' where id=wish.id;
 return wish.id;
end $$;

revoke all on function public.rename_group(uuid,text), public.review_wishlist(uuid,boolean,text,numeric) from public,anon;
grant execute on function public.rename_group(uuid,text), public.review_wishlist(uuid,boolean,text,numeric) to authenticated;
commit;
