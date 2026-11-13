-- Presentation copy for the existing synthetic group and fixtures only.
-- Existing participants, deadlines and persisted draw results are preserved.
begin;
update public.groups set name='Las de siempre'
where id='a830d021-fac9-47ef-93b0-8adcd4b4d001' and name='Calendario de prueba';
update public.profiles set name=case id
  when 'a830d021-fac9-47ef-93b0-8adcd4b4d011' then 'Marta'
  when 'a830d021-fac9-47ef-93b0-8adcd4b4d012' then 'Lucía'
  when 'a830d021-fac9-47ef-93b0-8adcd4b4d013' then 'Paula' end
where id in ('a830d021-fac9-47ef-93b0-8adcd4b4d011','a830d021-fac9-47ef-93b0-8adcd4b4d012','a830d021-fac9-47ef-93b0-8adcd4b4d013')
  and name in ('Marta · demo','Lucía · demo','Paula · demo');

update public.group_posts p set title=content.title,description=content.description
from (values
  ('a830d021-fac9-47ef-93b0-8adcd4b4d102'::uuid,'Mi vaquera favorita busca nueva dueña','Estoy haciendo hueco en el armario y esta chaqueta merece salir más. Es una M, queda un poquito oversize y tiene el cuello de borreguito. Perfecta para estos días fresquitos. La llevo cuando nos venga bien.'),
  ('a830d021-fac9-47ef-93b0-8adcd4b4d103'::uuid,'Una taza para los cafés sin prisa','Blanca, sencilla y de las que apetece abrazar con las dos manos. Me han regalado un juego nuevo y prefiero que esta siga acompañando desayunos. Está impecable y cabe un café bien grande.'),
  ('a830d021-fac9-47ef-93b0-8adcd4b4d104'::uuid,'Mochila para pequeñas escapadas','Me ha acompañado en unas cuantas excursiones y todavía le quedan muchas. Es azul oscuro, ligera y tiene espacio para el portátil y una botella de agua. Ahora uso otra y me hace ilusión que se la quede alguna de vosotras.'),
  ('a830d021-fac9-47ef-93b0-8adcd4b4d105'::uuid,'Un rincón bonito para tus flores','Jarrón de cristal en tono miel con unas espigas secas que le quedan preciosas. He cambiado un poco el salón y ya no encuentro dónde ponerlo. Queda genial junto a una ventana o sobre una cómoda.'),
  ('a830d021-fac9-47ef-93b0-8adcd4b4d106'::uuid,'Historias que merecen otra lectora','Estoy ordenando la estantería y he separado unos libros que ya he disfrutado. Hay novelas para engancharse una tarde y lecturas para ir despacito. Están muy cuidados; me encantaría que siguieran rodando entre nosotras.')
) as content(id,title,description)
where p.id=content.id and p.group_id='a830d021-fac9-47ef-93b0-8adcd4b4d001' and p.kind='gift';

do $$ begin
  if (select count(*) from public.group_posts where group_id='a830d021-fac9-47ef-93b0-8adcd4b4d001'
    and id in ('a830d021-fac9-47ef-93b0-8adcd4b4d102','a830d021-fac9-47ef-93b0-8adcd4b4d103','a830d021-fac9-47ef-93b0-8adcd4b4d104','a830d021-fac9-47ef-93b0-8adcd4b4d105','a830d021-fac9-47ef-93b0-8adcd4b4d106')
    and title not like '[Prueba]%' and description not ilike '%fictici%')<>5 then
    raise exception 'No se actualizaron los cinco regalos de presentación.';
  end if;
end $$;
commit;
