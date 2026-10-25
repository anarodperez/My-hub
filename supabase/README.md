# Conectar cuentas

1. En Supabase, abrir SQL Editor y ejecutar `migrations/202610140001_profiles.sql` una sola vez. Es una transacción: si falla, no queda aplicada parcialmente. No usar la clave pública para intentar administrar el esquema.
2. En Authentication, mantener proveedor Email y confirmación de correo activados. El formulario exige un mínimo de seis caracteres; si se configura una política más estricta, actualizar la validación local para explicar esos requisitos. Supabase siempre aplica su política del servidor.
3. En las plantillas **Confirm signup** y **Reset password**, incluir `<p>Tu código de My Hub: {{ .Token }}</p>`. Guardar ambas plantillas. La app permite introducir el código sin depender de enlaces de Expo Go; no fijar su longitud en el formulario.
4. Comprobar la entrega de correo. El servicio integrado restringe destinatarios y envíos: para amigos externos al equipo puede requerirse SMTP propio. No desactivar confirmación para ocultar un problema de correo ni contratar un servicio sin elegirlo explícitamente.
5. Completar `.env.local` con `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, y reiniciar Metro. Este archivo está excluido de Git. `.env.example` contiene solo los nombres.
6. Abrir **Mi perfil → Mi cuenta**: registrarse, introducir código y guardar un nombre. Cerrar sesión, volver a entrar y probar recuperación. La recuperación usa un cliente temporal que no persiste sesión: al salir o reiniciar hay que solicitar/verificar el código de nuevo; tras cambiar contraseña, entrar normalmente.

## Verificación de permisos

Ejecutar `tests/profiles.sql` como postgres en un proyecto Supabase de pruebas aislado después de aplicar la migración. El script crea fixtures en una transacción, prueba roles y hace rollback; ninguna aserción debe fallar. Con psql usar `-v ON_ERROR_STOP=1 -f supabase/tests/profiles.sql` y la conexión del proyecto configurada localmente. No versionar esa conexión ni su contraseña.

Probar con dos cuentas reales que cada una solo accede a su perfil. El cliente incluye sincronización por entidad, importación local confirmada por el usuario, grupos y comentarios. Su uso requiere aplicar también las migraciones del backend descritas abajo.

## Estado de esta entrega

Al abrir sin sesión se muestra acceso a cuenta. Mientras se recupera la sesión guardada se muestra carga; una sesión existente abre las pestañas. Cerrar sesión retira las rutas privadas del historial. Los enlaces directos a esas rutas tampoco permiten saltar el acceso. Si falta configuración de Supabase se informa en la pantalla de cuenta.

La conexión pública y Auth se pueden verificar sin crear usuarios. SQL y flujos de correo necesitan acceso al panel y cuentas reales: no se consideran verificados por pasar lint o TypeScript.

## Activar el backend completo

Actualización del 25 de octubre de 2026: aplicada `migrations/202610250007_group_social.sql`. Añade disponibilidad por fecha y franja, planes y regalos con respuestas únicas por persona, y el bucket privado `group-media`. Solo miembros actuales pueden acceder; cada persona modifica sus propias marcas y respuestas, y solo la autora puede retirar publicaciones o marcar regalos como entregados. La pestaña Amigas sustituye a Suscripciones. El calendario personal no se comparte.

Retirada definitiva de suscripciones, autorizada por la usuaria y aplicada al remoto el 25 de octubre de 2026: `migrations/202610250008_remove_subscriptions.sql` elimina su tabla y los registros de importación asociados. El cliente elimina el soporte y limpia únicamente el campo obsoleto en las copias locales al abrir con sesión. No restaurar un cliente anterior a esta retirada: seguirá consultando una tabla que ya no existe. Las migraciones antiguas conservan la historia; en una instalación nueva se ejecuta 008 después de 007. La eliminación de datos es definitiva.

Verificación de 007: `tests/group_social.sql` ejecutado en PostgreSQL 17 local aislado con Auth y Storage mínimos; pruebas de permisos con tres usuarios, respuestas duplicadas, entrega, retirada y expulsión. No ejecutar fixtures contra datos personales. Las fotos usan URLs firmadas de una hora: una URL emitida puede funcionar hasta su vencimiento tras revocar acceso. Las subidas abandonadas pueden quedar en el bucket sin publicación; no hay limpieza automática. Actualizar la pantalla o volver a entrar consulta los cambios de otras personas; no hay notificaciones ni actualización en tiempo real.

Para instalaciones nuevas, ejecutar 007 después de 001–006. Para retirar esta función, revertir únicamente sus pantallas y conservar tablas y bucket, sin borrar publicaciones ni archivos.

Estado a 15 de octubre de 2026: migraciones 001–006 aplicadas al proyecto remoto. Verificados mediante HTTP real con dos cuentas temporales: acceso, privacidad, grupos, invitaciones, comentarios, archivos y paginación de 45 publicaciones. Los datos temporales se retiraron al terminar. Esto no verifica todavía la interacción simultánea entre Samsung y web ni los correos de registro y recuperación.

En SQL Editor, con acceso administrativo al proyecto correcto, ejecutar en orden las migraciones que todavía no se hayan aplicado:

1. `migrations/202610140001_profiles.sql`
2. `migrations/202610140002_hub_backend.sql`
3. `migrations/202610140003_hub_storage.sql`
4. `migrations/202610150004_comment_gifs.sql`
5. `migrations/202610150005_recommendation_returning.sql`
6. `migrations/202610150006_group_review_actions.sql`

Cada archivo contiene una transacción. No repetir migraciones ya aplicadas: crean tablas, funciones y políticas con nombres fijos. No ejecutar los archivos de bootstrap de `dist/` en Supabase; son sustitutos mínimos de Auth y Storage para pruebas locales.

La app usa únicamente URL y clave pública. No añadir claves administrativas a `.env.local`, variables `EXPO_PUBLIC_*` ni al código del cliente.

Después de aplicar las migraciones:

1. Entrar con A en Samsung. Si existen datos antiguos, confirmar que pertenecen a A y usar la importación. El respaldo `my-hub:v1` se conserva. Verificar títulos, fotos, fechas, céntimos y guardados; repetir tras un fallo de red sin duplicados.
2. Entrar con A en web y comprobar los mismos datos. Editar entidades distintas desde ambos dispositivos; un conflicto de revisión debe pedir recargar, sin anunciar guardado.
3. Entrar con B: no debe ver calendario, wishlist ni publicaciones privadas de A. Probar también acceso por ID y solicitudes de Storage, no solo lo que oculta la interfaz.
4. Publicar hacia usuarios registrados y hacia un grupo: B solo ve el grupo tras aceptar la invitación. Probar token consumido, caducado y revocado; expulsar a B y comprobar que no puede volver a consultar publicaciones, comentarios ni generar nuevas URLs de fotos.
5. Enviar y borrar comentarios propios; reintentar tras cortar la conexión sin duplicarlos. B no puede borrar comentarios de A. Volver una publicación a privada y verificar la revocación.
6. Cerrar sesión y cambiar de cuenta durante cargas e importaciones: no deben aparecer respuestas ni borradores de la cuenta anterior.

Limitación: una URL de imagen ya firmada puede seguir funcionando hasta su vencimiento (actualmente una hora); revocar acceso en RLS impide nuevas lecturas autorizadas y firmas, pero no invalida inmediatamente enlaces emitidos. Referencia: [descargas privadas de Supabase](https://supabase.com/docs/guides/storage/serving/downloads).

Las pruebas `tests/hub_rls.sql` y `tests/hub_storage.sql` crean fixtures dentro de una transacción y terminan con rollback. Ejecutarlas con `psql -v ON_ERROR_STOP=1 -f <archivo>` en un proyecto de pruebas aislado después de las migraciones. No ejecutarlas contra datos personales.

Si hay que volver al cliente local anterior, conservar tanto el respaldo local como las tablas remotas. Los datos nuevos creados en nube requieren exportación antes de desactivar esa versión; el respaldo antiguo no los contiene.

## GIFs en comentarios

Retirados de la interfaz por petición del usuario: los nuevos comentarios admiten texto y emoticonos del teclado. Se conservan la migración y los archivos existentes en Supabase para evitar pérdida de datos. Los comentarios antiguos con solo GIF muestran «Adjunto antiguo no disponible» y siguen siendo eliminables por su autor. La descripción técnica siguiente documenta el soporte conservado en backend, no una función activa en la app.

La migración 004 fue aplicada al proyecto remoto el 15 de octubre de 2026. Añade `comments.gif_path` y el bucket privado `comment-gifs` (solo `image/gif`, máximo 5 MB). Los comentarios anteriores no cambian. Los nuevos pueden tener texto, GIF o ambos; no pueden estar vacíos.

El cliente valida cabecera GIF, tamaño y dimensiones (máximo 4 megapíxeles), preserva el original al elegirlo y reutiliza el archivo subido al reintentar el mismo borrador. El servidor comprueba propietario, ruta asociada al ID de comentario y existencia de la subida. Los GIFs heredan la audiencia de la publicación; URLs firmadas de cinco minutos. Una URL ya emitida no se revoca antes de caducar.

La reproducción es manual, se detiene a los ocho segundos o al salir de la pantalla y queda desactivada con movimiento reducido. En web no se monta la imagen hasta reproducirla y se desmonta al pausar porque el navegador no permite pausar GIFs. En móvil queda una imagen estática al pausar. Los archivos subidos por un envío fallido que luego se abandona pueden quedar sin referencia; no se borran automáticamente.

Pruebas SQL: `tests/comment_gifs.sql`, junto a las pruebas existentes, en el entorno aislado. Verificar en Samsung y web: elegir GIF real, vista previa, quitar, enviar solo GIF, texto más GIF, reintento tras error, pausa, movimiento reducido y acceso con otra cuenta. La comprobación visual y la subida HTTP con sesión real siguen pendientes.

Para revertir el cliente, retirar el selector y el renderizado de GIFs conservando columna, bucket y archivos. No eliminar el esquema ni archivos con comentarios existentes. El cliente antiguo mantiene los comentarios de texto, pero no muestra adjuntos ni explica comentarios con solo GIF.

## Corrección de creación de descubrimientos (005)

`post_read` evalúa directamente propietario y audiencia de la fila. La versión anterior consultaba la tabla desde una función STABLE; esa consulta no veía la fila recién creada durante INSERT RETURNING y el cliente recibía un error RLS. No cambia las audiencias autorizadas ni los datos existentes. Prueba de regresión: `tests/recommendation_returning.sql` (transacción con rollback).

Reversión técnica de 005: `alter policy post_read on public.recommendations using (public.hub_can_read_post(id));`. Conserva todos los datos, pero restaura el fallo de creación; no debe usarse como solución operativa.

## Renombrar grupos y valorar wishlist (006)

Aplicada al remoto. rename_group solo permite al propietario cambiar el nombre (1–80 caracteres). review_wishlist crea una recomendación privada con opinión propia y marca el deseo como cumplido dentro de la misma transacción. Conserva título, categoría, enlace y metadatos del origen. No modifica la recomendación de otra persona ni reutiliza su archivo privado de portada. El ID de la entrada de wishlist identifica la nueva recomendación para que un reintento no la duplique.

Regresión: tests/group_review_actions.sql, con rollback. Verificados además ambos RPC por HTTP real, con cuentas temporales retiradas al terminar. Reversión: retirar los nuevos controles del cliente y ejecutar DROP FUNCTION public.rename_group(uuid,text); DROP FUNCTION public.review_wishlist(uuid,boolean,text,numeric);. Los grupos, deseos y recomendaciones creadas se conservan.
