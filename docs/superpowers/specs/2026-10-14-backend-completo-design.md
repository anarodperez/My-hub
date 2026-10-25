# Backend completo de My Hub

## Objetivo
Guardar en Supabase los datos y fotos de cada cuenta, recuperar la misma informacion desde diferentes dispositivos y habilitar descubrimientos compartidos con comentarios. Preservar los datos locales actuales y las vistas de la app.

## Arquitectura propuesta
Usar Supabase Auth existente, PostgreSQL con RLS y Storage. La app accede con la clave publica y la sesion del usuario; nunca incluye claves administrativas. No crear un servidor adicional ni guardar toda la aplicacion en una unica columna JSON: entidades separadas permiten permisos y comentarios por publicacion.

## Datos y permisos
- profiles: mantener el perfil privado existente. Para publicaciones compartidas, exponer solo nombre visible y avatar mediante una consulta limitada a autores visibles; nunca exponer email.
- recommendations: id UUID, owner_id, legacy_id, titulo, categoria, opinion, valoracion, portada, precio opcional, ubicacion, enlace, fechas y visibilidad. Solo el autor modifica o elimina. Publicaciones nuevas e importadas empiezan privadas.
- wishlist_items: propietario, referencia opcional a recomendacion o deseo independiente, titulo, categoria, portada, enlace, estado y fechas. Cada cuenta solo consulta y modifica su lista. Quitar un guardado no elimina la recomendacion original.
- calendar_events: propietario, titulo, categoria y fecha civil sin conversion a UTC. Privados.
- subscriptions: propietario, nombre, importe entero en centimos, frecuencia y proxima fecha. Privadas.
- user_preferences: tema y preferencias personales por cuenta; nombre y avatar usan profiles como unica fuente.
- moment_songs: titulo, artista, portada y enlace por propietario, privado inicialmente.
- comments: publicacion, autor, texto, fecha y estado de eliminacion. Solo accesibles si la publicacion lo es; el autor puede borrar su comentario. Longitud limitada y paginacion. No aceptar comentarios sobre contenido inaccesible.
- migration_runs: propietario, dispositivo de origen, version y progreso para reanudar importaciones sin duplicar datos.

Todas las tablas tienen restricciones de valores y longitud, indices de propietario y fechas, y RLS habilitado desde su creacion. Las pruebas usan dos cuentas y una sesion anonima para verificar aislamiento.

## Audiencia elegida por el usuario
Cada publicacion admite private (Solo yo), public (Usuarios registrados) o group (Un grupo privado). Importar y crear siempre empieza como private. Publicar o cambiar audiencia requiere una accion explicita del autor. Los comentarios heredan el acceso de la publicacion y dejan de ser visibles al revocar ese acceso.
Los grupos tienen propietario y miembros. El propietario crea invitaciones con token aleatorio, caducidad y uso unico; un usuario autenticado acepta para incorporarse. Los miembros pueden salir; el propietario puede expulsar miembros y revocar invitaciones. Solo el propietario gestiona membresias. Un usuario solo publica hacia un grupo al que pertenece. Un miembro expulsado pierde acceso a publicaciones, comentarios y fotos de ese grupo. No mostrar grupos ni identidades a cuentas externas. Bloquear la salida del propietario hasta transferir la propiedad o borrar el grupo; borrar el grupo vuelve privadas sus publicaciones, no las elimina.

## Fotos
Usar buckets privados con rutas por propietario y URLs firmadas. Subir fotos locales antes de guardar su referencia remota. Mantener la copia local si la subida falla; no reemplazarla por una URL que no existe. Permitir leer portadas compartidas solo a quien pueda leer la publicacion. Las fotos externas de ejemplos pueden conservar sus URLs. Validar tipo y tamano de archivo; eliminar archivos antiguos solo despues de confirmar que ninguna entidad los referencia.

## Migracion de datos actuales
Leer y validar my-hub:v1 sin modificarlo. Asociar la importacion a la cuenta confirmada que posee esos datos: el almacenamiento antiguo no distingue cuentas, por lo que no se importa automaticamente al cambiar de usuario. Asignar UUID a IDs locales mediante un mapa persistente de legacy_id y dispositivo. Mantener relaciones entre recomendaciones y guardados y conservar deseos cumplidos, fechas, centimos, preferencias y fotos. Reintentos idempotentes con un registro de progreso. Contenido de ejemplo queda identificado y privado. Comparar recuentos y referencias antes de marcar la importacion como completada. No borrar my-hub:v1.

## Lecturas y escrituras
Reemplazar las escrituras de snapshots completos por operaciones por entidad para evitar que un dispositivo sobrescriba cambios de otro. Actualizar todos los formularios, guardados, deseos cumplidos, borrados y preferencias. El feed distingue propietario y lector; editar solo contenido propio. Cache por account_id y limpiar el estado en memoria al cerrar o cambiar sesion. Cargar listas paginadas; refrescar al entrar y despues de mutaciones. Sin conexion, permitir leer la cache e indicar que no se pudo guardar una mutacion; no prometer guardado remoto ni descartar el formulario. No construir una cola offline en esta primera version.

## Comentarios
Icono con contador en cada descubrimiento compartido; pantalla de detalle con comentarios paginados, autor, fecha y compositor. Evitar duplicados al reenviar por fallo de red mediante ID generado antes del envio. Reintento explicito y borrado propio. Los ejemplos locales no se presentan como publicaciones de personas reales.

## Secuencia de entrega
1. Audiencia resuelta: elegir por publicacion. Escribir y revisar el plan concreto de implementacion.
2. Crear migraciones SQL y reglas de Storage, sin retirar tablas actuales.
3. Implementar servicios por entidad y pruebas de aislamiento y concurrencia.
4. Conectar formularios y vistas, y migracion recuperable por cuenta.
5. Implementar publicaciones compartidas y comentarios segun audiencia elegida.
6. Aplicar SQL al proyecto y probar dos cuentas, archivos y migracion real en Samsung y web.

## Validacion y retorno
Pruebas de importacion repetida, fallo parcial, cambio de cuenta, guardado concurrente, restricciones, borrados y fotos. Lint y TypeScript obligatorios. En Supabase verificar que cuenta B no lee ni modifica datos privados de A, y que publicar no expone wishlist ni suscripciones. Probar recuperar datos en un segundo dispositivo. Antes de activar la nueva persistencia, conservar la version local operativa; si falla el despliegue, volver a esa version sin borrar el respaldo ni las nuevas tablas. Los datos nuevos creados en nube requieren exportacion antes de desactivar esa version; no asumir que volver al cliente antiguo los recupera.

## Acceso al proyecto
Actualmente hay clave publica para la app, pero no se ha verificado una conexion administrativa para aplicar SQL. La clave publica no puede crear tablas ni configurar buckets. Entregar SQL ejecutable y usar conexion administrativa autorizada si existe; de lo contrario, el usuario lo ejecutara en SQL Editor. No solicitar contrasenas ni claves secretas por el chat.
