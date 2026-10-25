# Backend completo de My Hub Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking. Ejecucion propuesta en esta misma sesion; no delegar sin autorizacion.

**Goal:** Persistir todos los datos de My Hub por cuenta en Supabase y habilitar publicaciones con audiencia elegible y comentarios.

**Architecture:** PostgreSQL y Storage con RLS, servicios por entidad y cache aislada por cuenta. Importacion recuperable del almacenamiento local actual. No sobrescribir snapshots completos entre dispositivos.

**Tech Stack:** Expo 54, React Native 0.81, Expo Router 6, TypeScript, supabase-js 2, AsyncStorage existente, Node test.

**Spec:** docs/superpowers/specs/2026-10-14-backend-completo-design.md

## Global Constraints
- No borrar my-hub:v1 ni sobrescribir datos personales con ejemplos.
- Private/public/group por publicacion; nuevas e importadas privadas.
- Wishlist, calendario, suscripciones, preferencias y cancion privados.
- No claves administrativas dentro de la app, ni emails en perfiles compartidos.
- Fecha civil AAAA-MM-DD e importes enteros en centimos.
- Leer documentacion Expo 54 antes de tocar APIs nativas; sin nuevas dependencias salvo necesidad demostrada.
- Lint y TypeScript antes de declarar cada entrega terminada.

## Review Focus
- Una respuesta pendiente de la cuenta A nunca se muestra ni guarda bajo B.
- Cambiar de grupo/publico a privado revoca comentarios, autores visibles y acceso a imagenes.
- Un fallo entre subida de foto y escritura no pierde la foto local ni crea referencia invalida.
- Dos dispositivos editando entidades distintas no sobrescriben cambios ajenos.
- Importaciones repetidas o interrumpidas no duplican deseos, guardados ni relaciones.

## Mapa de archivos
- supabase/migrations/202610140002_hub_backend.sql: entidades privadas, grupos, publicaciones y comentarios.
- supabase/migrations/202610140003_hub_storage.sql: buckets y reglas por entidad accesible.
- supabase/tests/hub_rls.sql: pruebas transaccionales de permisos con identidades aisladas.
- src/features/hub/backend-types.ts: tipos de filas, audiencia y errores de servicio.
- src/features/hub/repository.ts: lecturas y mutaciones por entidad con cliente Supabase inyectable.
- src/features/hub/cloud-covers.ts: subir fotos y resolver URLs firmadas.
- src/features/hub/import-local.ts: importacion idempotente y comprobacion de recuentos.
- src/features/hub/provider.tsx: ciclo de cuenta, cache, carga y operaciones remotas.
- src/features/hub/model.ts: ampliar tipos con propietario y audiencia sin perder validacion local.
- src/app/compose.tsx, wish.tsx, song.tsx, settings.tsx: operaciones remotas por entidad.
- src/components/save-recommendation.tsx, wishlist-tile.tsx, recommendation-card.tsx: guardados y permisos propios.
- src/app/(tabs)/index.tsx, library.tsx, calendar.tsx, subs.tsx: lecturas remotas y estados de carga/error.
- src/app/discovery/[id].tsx: detalle y comentarios.
- src/app/groups.tsx, src/app/group/[id].tsx: grupos, invitaciones y miembros.
- src/app/_layout.tsx: proteger nuevas rutas con sesion.

## Task 1: Esquema y politicas verificables
- [ ] Escribir supabase/tests/hub_rls.sql con usuarios A/B/C y anon: B no lee datos privados de A; public es legible por autenticados; group solo por miembros; nadie cambia owner_id; expulsar revoca acceso; comentario propio borrable, ajeno no.
- [ ] Ejecutar prueba contra entorno local o proyecto de pruebas disponible; confirmar fallo por tablas ausentes.
- [ ] Crear migracion 002: recommendations, wishlist_items, calendar_events, subscriptions, user_preferences, moment_songs, groups, group_members, group_invites, comments y migration_runs. UUID, owner_id obligatorio, checks de longitud/valores, fechas, unicidad y RLS desde creacion. Unicidad de wishlist(owner_id,recommendation_id) cuando referencia no nula; wishes independientes tienen su propio UUID.
- [ ] Implementar funciones SQL create_group(name), create_group_invite(group_id), accept_group_invite(token), leave_group(group_id), remove_group_member(group_id,user_id), delete_group(group_id). Verificar permisos dentro de transacciones y fijar search_path en funciones privilegiadas. Guardar hash del token, expiracion y consumo unico; respuestas sin enumeracion de usuarios.
- [ ] Eliminar grupo convierte sus publicaciones en privadas. Evitar recursion RLS en membresias con helpers limitados y auditados. Politicas de lectura de comentarios y Storage consultan la misma regla de acceso a publicacion.
- [ ] Ejecutar pruebas RLS y constraints. No modificar policies existentes de profiles para hacerlos globalmente legibles; agregar consulta de perfil visible limitada a publicaciones/grupos accesibles.
- [ ] Commit explicito de SQL y pruebas, sin mezclar cambios de UI pendientes.

## Task 2: Fotos remotas
- [ ] Crear tests/hub-cloud-covers.test.cjs: fallo de upload conserva URI local; URLs firmadas no persisten como identificador; foto privada inaccesible a B; foto de grupo pierde acceso al expulsar B.
- [ ] Crear cloud-covers.ts con uploadCover(client, ownerId, entityId, uri): Promise<string> y resolveCover(client, path): Promise<string>. Reutilizar persistencia actual para respaldo; almacenar path estable, no URL firmada. No subir URLs externas de ejemplos como fotos personales.
- [ ] Crear migracion 003 para bucket privado hub-media: maximo 10 MB, JPEG/PNG/WebP/HEIC/AVIF segun soporte comprobado. Rutas owner/entity/archivo; escritura propia, lectura por permisos de entidad referenciada. No considerar todos los archivos del propietario publicos porque tenga una publicacion publica.
- [ ] Verificar MIME real y tamano en cliente y configuracion Storage; probar upload y lectura firmada autorizada, error y cambio de audiencia.
- [ ] Commit de almacenamiento y pruebas.

## Task 3: Repositorio por entidad
- [ ] Crear tests/hub-repository.test.cjs con cliente simulado: CRUD de cada entidad, error de red, borrado de guardado conserva recomendacion, updates limitados a campos cambiados y propietario inmutable.
- [ ] Crear backend-types.ts con Visibility = 'private' | 'public' | 'group', RecommendationRow, WishlistRow y filas de cada tabla. Repositorio createHubRepository(client) devuelve loadPrivate(), listDiscoveries(cursor,limit), saveRecommendation(input), saveWish(input), setSaved(id,status), removeSaved(id), saveEvent(input), saveSubscription(input), saveSong(input), savePreferences(input) y deleteEntity(kind,id). Mutaciones retornan fila confirmada; errores no se silencian.
- [ ] Paginacion keyset created_at/id para feed y comentarios, limite 30. Reconocer referencias ya inaccesibles sin filtrar contenido privado a clientes no autorizados.
- [ ] Pruebas simultaneas de dos instancias modificando entidades distintas y la misma entidad. Conflicto de revision devuelve error recuperable, no sobrescritura silenciosa.
- [ ] Commit del repositorio.

## Task 4: Importacion local recuperable
- [ ] Crear tests/hub-import.test.cjs: dos ejecuciones conservan mismos IDs, corte tras fotos reanuda, guardados conservan referencias, importacion no publica, datos personales y ejemplos conservan marca, un cambio de cuenta cancela la ejecucion.
- [ ] Crear importLocalHub(client, accountId, deviceId, snapshot): Promise<ImportReport>. Validar decodeState antes de operar. migration_runs y claves unicas (owner_id,device_id,legacy_id,entity_kind) asignan UUID una sola vez y registran progreso. Orden: perfiles/preferencias, fotos, recomendaciones, deseos/guardados, eventos, suscripciones y cancion.
- [ ] Pantalla de importacion ofrece un resumen y confirma a que cuenta pertenecen los datos antiguos, porque my-hub:v1 no tiene propietario. No importarlos automaticamente en cada login. Copia intacta hasta verificacion por recuentos, checksums de campos y referencias. Fallo recuperable y boton reintentar.
- [ ] Verificar resultados y marcar completada solo al comprobar todas las entidades. No borrar el snapshot tras completar.
- [ ] Commit del importador.

## Task 5: Conectar app y separar cuentas
- [ ] Crear tests/hub-account-state.test.cjs: respuesta tardia A tras login B descartada; logout vacia memoria; cache usa my-hub:account:<uuid>; fallo de escritura mantiene formulario y no anuncia exito.
- [ ] Cambiar HubProvider para consumir AccountProvider y repository, con generacion por cuenta, refresh y mutaciones especificas. Mantener createLocalStore para lectura del respaldo/importacion; eliminar update(snapshot) de todos los escritores activos, no traducirlo a reemplazo remoto completo.
- [ ] Conectar compose/wish/song/settings, guardados, completar deseos y las cuatro pesta?as. Nombre y avatar se guardan solo en profiles; cache refleja cambios. Fotos se confirman antes de referenciar. Edicion ajena no aparece ni se acepta.
- [ ] Ofrecer estado de cache sin conexion y errores de guardado. Sin cola offline automatica. No cargar ejemplos de nuevo por cambiar cuenta.
- [ ] Probar importacion en Samsung y recuperar mismos datos en web con la misma cuenta. Cambiar a B no muestra los datos de A.
- [ ] Commit de integracion.

## Task 6: Publicar y grupos
- [ ] Pruebas de cambio private/public/group, grupo no autorizado, invitacion caducada/consumida/revocada y usuario expulsado.
- [ ] En compose agregar selector Solo yo / Usuarios registrados / Grupo privado. Selector de grupo solo muestra membresias activas; guardado valida tambien en SQL. No cambiar audiencia al editar otros campos.
- [ ] Crear pantallas groups y group/[id] para crear grupo, generar/aceptar invitacion, salir y gestionar miembros con permisos del propietario. Expo Router para navegacion; rutas protegidas.
- [ ] Feed muestra publicaciones accesibles de otras cuentas con autor visible y separa contenido propio. Autor de ejemplo no se presenta como persona real. Probar A publica, B ve, C ajeno al grupo no ve.
- [ ] Commit de publicacion y grupos.

## Task 7: Comentarios
- [ ] Crear tests/hub-comments.test.cjs: vacio/solo espacios rechazado, maximo 2000 caracteres, acceso heredado, reintento mismo UUID no duplica, borrado ajeno rechazado y cambio de cuenta descarta respuesta pendiente.
- [ ] Agregar listComments(postId,cursor,limit), addComment(postId,id,text), deleteComment(id) al repositorio. Validacion cliente y SQL. Consultar contador con agregacion autorizada sin N solicitudes por tarjeta.
- [ ] Crear discovery/[id].tsx con detalle, autor, comentarios y campo multilinea. UI de error/reintento y boton de envio bloqueado durante escritura; mantener borrador si falla. No afirmar enviado hasta confirmacion remota. Borrar propio con confirmacion.
- [ ] RecommendationCard abre detalle y muestra icono/comentarios; edicion solo del autor. Cambiar audiencia invalida consultas visibles.
- [ ] Commit de comentarios.

## Task 8: Aplicacion remota y cierre
- [ ] Verificar si existe acceso administrativo autorizado al proyecto; la clave publica de .env.local no sirve para ejecutar migraciones. Si no existe, entregar migraciones listas y pedir ejecucion por SQL Editor. No solicitar claves secretas por chat.
- [ ] Aplicar migraciones aditivas, configurar Storage y ejecutar pruebas reales A/B/anon. No declarar backend listo por pasar solo mocks.
- [ ] Ejecutar node --test tests/*.test.cjs, npm run lint y npx tsc --noEmit. Exportar Android y web si cambiaron dependencias/configuracion. Verificar errores de red, importar dos veces, fotos, grupos y comentarios en Samsung/web.
- [ ] Documentar resultado y limitaciones reales en docs/backend.md. Describir recuperacion sin borrar datos ni hacer publico contenido importado.
- [ ] No retirar respaldo local ni publicar/pushear sin autorizacion vigente.
