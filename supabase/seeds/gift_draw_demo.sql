-- Run as an administrator with psql variables demo_group_id and viewer_id.
-- Only existing demo members and a named test group or the known presentation group are accepted.
begin;
create temporary table gift_demo_context on commit drop as
select g.id as group_id, :'viewer_id'::uuid as viewer_id,
  (select p.id from public.profiles p join public.group_members m on m.user_id=p.id
   where m.group_id=g.id and p.name in ('Marta · demo','Marta')) as marta,
  (select p.id from public.profiles p join public.group_members m on m.user_id=p.id
   where m.group_id=g.id and p.name in ('Lucía · demo','Lucía')) as lucia,
  (select p.id from public.profiles p join public.group_members m on m.user_id=p.id
   where m.group_id=g.id and p.name in ('Paula · demo','Paula')) as paula
from public.groups g where g.id=:'demo_group_id'::uuid
  and (g.name ~* '(prueba|demo|ejemplo)' or g.id='a830d021-fac9-47ef-93b0-8adcd4b4d001')
  and exists(select 1 from public.group_members m where m.group_id=g.id and m.user_id=:'viewer_id'::uuid);
do $$ begin
  if not exists(select 1 from gift_demo_context where marta is not null and lucia is not null and paula is not null
    and viewer_id not in (marta,lucia,paula)) then
    raise exception 'Elige un grupo de prueba con tu cuenta y Marta, Lucía y Paula de demo.';
  end if;
end $$;

create temporary table created_demo_gifts(id uuid) on commit drop;
with inserted as (
  insert into public.group_posts(id,group_id,owner_id,kind,title,description,gift_draw_at)
  select ('a830d021-fac9-47ef-93b0-8adcd4b4d10'||example.slot)::uuid,c.group_id,
    case when example.slot in (2,4) then c.lucia else c.marta end,'gift',example.title,
    'Datos ficticios para probar el sorteo. '||example.description,
    now()+case when example.slot=2 then interval '10 minutes' else interval '3 days' end
  from gift_demo_context c cross join (values
    (6,'[Prueba] Un libro para otra historia','Pulsa «¡Lo quiero!» para entrar y ver cómo cambia tu participación.'),
    (2,'[Prueba] Chaqueta vaquera','Cierra diez minutos después de crear estos datos. Apúntate para probar el cierre automático.'),
    (3,'[Prueba] Una taza para tus mañanas','Este sorteo ya ha cerrado. Descubre quién se la lleva.'),
    (4,'[Prueba] Un bolso con muchas vidas','Marta y Paula participaron. El servidor ya ha elegido una ganadora.'),
    (5,'[Prueba] Un jarrón buscando casa','Ejemplo de un sorteo que terminó sin participantes.')
  ) as example(slot,title,description)
  on conflict(id) do nothing returning id
) insert into created_demo_gifts select id from inserted;

insert into public.group_post_responses(post_id,owner_id)
select ('a830d021-fac9-47ef-93b0-8adcd4b4d10'||entry.slot)::uuid,entry.participant
from gift_demo_context c cross join lateral (values
  (6,c.paula),(2,c.marta),(2,c.paula),(3,c.viewer_id),(4,c.marta),(4,c.paula)
) as entry(slot,participant)
join created_demo_gifts inserted on inserted.id=('a830d021-fac9-47ef-93b0-8adcd4b4d10'||entry.slot)::uuid;

-- Only newly inserted fixtures are closed; reruns never reset a real participation or result.
update public.group_posts set gift_draw_at=now()-interval '5 minutes'
where id in (select id from created_demo_gifts)
  and id in ('a830d021-fac9-47ef-93b0-8adcd4b4d103','a830d021-fac9-47ef-93b0-8adcd4b4d104','a830d021-fac9-47ef-93b0-8adcd4b4d105');
select public.hub_resolve_gift_draws(group_id) from gift_demo_context;

do $$ begin
  if (select count(*) from public.group_posts p join gift_demo_context c on c.group_id=p.group_id
      where p.kind='gift' and p.id in ('a830d021-fac9-47ef-93b0-8adcd4b4d106','a830d021-fac9-47ef-93b0-8adcd4b4d102',
        'a830d021-fac9-47ef-93b0-8adcd4b4d103','a830d021-fac9-47ef-93b0-8adcd4b4d104','a830d021-fac9-47ef-93b0-8adcd4b4d105'))<>5 then
    raise exception 'No se crearon los cinco regalos en el grupo de prueba.';
  end if;
  if not exists(select 1 from public.group_posts p join gift_demo_context c on c.group_id=p.group_id
    where p.id='a830d021-fac9-47ef-93b0-8adcd4b4d103' and p.reserved_for=c.viewer_id and p.gift_drawn_at is not null) then
    raise exception 'No se preparó el ejemplo de regalo ganado.';
  end if;
end $$;
commit;
\ir gift_demo_presentation.sql
