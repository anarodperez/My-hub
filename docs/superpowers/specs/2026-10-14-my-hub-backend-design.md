# My Hub: backend en Supabase

## Objetivo

Conectar la app Expo SDK 54 a un proyecto Supabase alojado en su plan gratuito. Incorporar cuentas, grupos privados, recomendaciones con fotos, wishlist compartible, calendario y suscripciones personales. Conservar los datos locales actuales. Este documento concreta el diseño para revisión; todavía no representa una implementación ni un despliegue.

## Arquitectura

Usar Supabase Auth, PostgreSQL y Storage. La app consulta mediante el cliente oficial, con permisos RLS obligatorios en todas las tablas expuestas. Las operaciones que afectan varias tablas (crear grupo, aceptar invitación e importar datos) se ejecutan como transacciones en funciones PostgreSQL. No crear un servidor Node adicional.

El móvil recibe únicamente la URL del proyecto y su clave pública. Las claves administrativas nunca se incluyen en la app ni se solicitan por chat. Guardar configuración local en `.env.local` y publicar solo una plantilla sin valores. Mantener Expo Router y los componentes existentes.

## Cuentas

Correo y contraseña, verificación de correo, inicio y cierre de sesión y recuperación de contraseña. Sesión persistente y separación de cachés por usuario. Al cerrar sesión, retirar de pantalla y memoria los datos de la cuenta anterior. Mantener el modo local existente mientras no haya una cuenta conectada.

Verificar los enlaces de recuperación en Android e iOS; usar códigos introducidos en la app cuando permitan completar el flujo en Expo Go. Configurar entrega de correo y límites antes de abrir registros a más usuarios; no prometer correo gratuito ilimitado.

## Datos y permisos

- `profiles`: nombre y avatar. Cada usuario modifica el suyo; solo compañeros de grupo consultan los campos públicos del perfil. Correo gestionado por Auth.
- `groups`, `group_members`: propietario y miembros. Un usuario puede pertenecer a varios grupos y selecciona uno para publicar. Crear grupo crea su membresía en la misma transacción. El propietario administra invitaciones y expulsa miembros; cualquier miembro puede salir. El propietario debe transferir la propiedad antes de salir.
- `group_invites`: códigos aleatorios de un solo uso, almacenados como hash, con caducidad de siete días y revocación. Aceptación autenticada y atómica. El código permite solicitar ingreso, pero no consultar datos del grupo sin membresía. No permitir enumerar invitaciones.
- `recommendations`: autor, grupo opcional y campos actuales. Una recomendación sin grupo es privada. Solo su autor la modifica o elimina; los miembros del grupo pueden leer las compartidas. Guardar una recomendación ajena no otorga acceso permanente después de abandonar el grupo.
- `saved_recommendations`: referencias privadas del usuario y estado pendiente/terminado. Validar acceso a la recomendación al guardar y al leer.
- `wishes`: deseos propios, fotos y estado cumplido. Privados por defecto; compartir la lista con un grupo elegido requiere una acción expresa. Solo el dueño modifica su contenido.
- `events`, `event_shares`: eventos privados y relaciones para compartir eventos concretos con grupos. Solo el dueño modifica; retirar el vínculo revoca el acceso compartido.
- `subscriptions`: solo su propietario puede leer o escribir, sin opción de publicación.
- `preferences`: tema y canción personal del modelo actual, sincronizados por usuario; selección de grupo en el dispositivo.

Usar identificadores UUID para datos nuevos, fechas de calendario como `date`, instantes como `timestamptz` e importes enteros en céntimos. Aplicar también en PostgreSQL las categorías, valores de estrellas, frecuencias, importes no negativos y restricciones de pertenencia que valida el modelo actual. No confiar en IDs de propietario enviados por el cliente.

## Fotos

Buckets privados con políticas alineadas con la visibilidad del contenido y URLs firmadas de corta duración. Aceptar JPEG, PNG y WebP hasta 5 MB, validar límites en Storage y adaptar imágenes grandes antes de subirlas. Un fallo de carga no publica una referencia rota. Al reemplazar o eliminar contenido, limpiar archivos que ya no se usan. La revocación de una URL ya firmada puede tardar hasta su caducidad.

## Migración local

No modificar ni borrar la clave actual `my-hub:v1`. Al conectar una cuenta, ofrecer importar los datos locales con confirmación de la cuenta destino. Las recomendaciones importadas permanecen privadas hasta compartirlas expresamente. No convertir automáticamente `wishlistVisibility: public` en publicación.

Excluir recomendaciones marcadas `sample`; conservar los eventos existentes, incluidos los estrenos añadidos, porque el modelo actual no distingue su procedencia. Explicar esta diferencia en la importación. Conservar deseos, suscripciones, referencias guardadas válidas, perfil, canción y preferencias. Para IDs locales, registrar un mapeo por cuenta y origen para que reintentar no duplique registros. Las fotos locales deben subirse antes de confirmar su importación. No marcar éxito mientras falten datos o archivos; permitir reintento. Conservar una copia local recuperable incluso tras completar el proceso.

## Sincronización y errores

Primera versión: recuperar al iniciar sesión, volver a primer plano, cambiar de grupo y actualizar manualmente. Confirmar cambios solo cuando el servidor los acepte; las operaciones repetidas tras un fallo deben ser idempotentes. Mostrar caché del usuario como tal cuando no haya red, sin sobrescribirla con una respuesta fallida. Sin cola de escritura offline en esta fase: explicar que hace falta conexión para guardar en la cuenta. El modo local mantiene su funcionamiento actual.

Para ediciones concurrentes, comparar la versión leída con la versión actual y pedir recargar si ha cambiado; no sobrescribir silenciosamente. La caché no constituye una autorización: al actualizar desde servidor, retirar contenido cuyo acceso se haya revocado.

## Entregas

1. Migraciones SQL, permisos verificables y cuentas conectadas en la app.
2. Grupos, invitaciones y recomendaciones compartidas con fotos.
3. Wishlist, calendario y suscripciones con sus permisos respectivos.
4. Importación de datos locales y verificación completa en Samsung.

Cada entrega mantiene ejecutable la app. El alcance completo incluye las cuatro, aunque se implementen y comprueben por separado.

## Verificación

Pruebas con dos cuentas del mismo grupo y una tercera ajena: aislamiento de tablas y archivos; autoría de cambios; salida y expulsión; invitación caducada, revocada y consumida simultáneamente. Verificar registro, recuperación, cambio de sesión sin filtraciones, persistencia entre dispositivos y fallos de red.

Probar migración repetida y fallida, archivos ausentes, conservación de la copia local y ausencia de publicaciones implícitas. Ejecutar pruebas relevantes existentes, lint y TypeScript antes de completar cada entrega. Verificar los flujos reales en Samsung; registrar como pendiente la prueba en iOS si no hay dispositivo.

## Límites y configuración externa

Sin notificaciones push, chat, cobros ni servidor propio: no forman parte del backend acordado. No añadir sincronización en tiempo real ni escritura offline hasta necesitarla. El alojamiento gratuito está sujeto a cuotas y condiciones del proveedor; no contratar servicios de pago automáticamente.

Hace falta acceso del usuario al panel de Supabase para crear el proyecto, elegir región europea, configurar Auth y aplicar migraciones. Se puede preparar código y SQL sin acceso; no declarar el backend desplegado hasta verificarlo contra el proyecto real.
