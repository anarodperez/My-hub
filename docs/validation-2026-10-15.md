# Validación de My Hub — 15 de octubre de 2026

## Correcto

- `node --test tests/*.test.cjs`: 58 pruebas, 0 fallos.
- `npx expo lint`: sin errores ni advertencias.
- `npx tsc --noEmit`: sin errores.
- `npx expo install --check`: versiones compatibles según Expo.
- `npx expo export --platform all --output-dir dist/validation-export`: bundles Android, iOS y web generados y exportación estática completada. Esto no equivale a compilar ni instalar binarios nativos.
- PostgreSQL aislado, localhost:55432, rol `hub_test`: `hub_rls.sql`, `hub_storage.sql`, `comment_gifs.sql` y `profiles.sql` pasan. Todas las pruebas terminan en rollback. Para perfiles se añadieron temporalmente `aud`, `role` y `email` al sustituto local de `auth.users` dentro de la misma transacción; también quedaron revertidas.
- Integración simulada de feed (`dist/validation-feed.cjs`): cliente supabase-js real con transporte HTTP simulado, repositorio, hidratación de comentarios y controlador de paginación reales. 64 publicaciones en 4 páginas; filtro de libros: 32 en 2 páginas; sin duplicados y con recuentos/vistas previas correctos. No se insertaron publicaciones de prueba en Supabase remoto.
- Samsung conectado: apertura de formularios y perfil; controles accesibles de edición y navegación presentes. No se guardaron cambios desde los formularios.

## Fallo confirmado

El teclado sigue tapando parcialmente el campo inferior «Enlace» de Añadir a wishlist al enfocarlo. En la captura `dist/validation-keyboard.png` se ve la parte inferior del campo detrás de la franja superior del teclado. El ajuste anterior de `KeyboardAvoidingView` no resuelve por completo este caso. Requiere corregir el desplazamiento al campo enfocado y volver a comprobarlo en el Samsung.

Esta sesión era de validación: no se modificó código de producto para corregirlo.

## Sin completar

- Registro, acceso y recuperación por correo con dos cuentas reales; invitaciones, comentarios y archivos entre dos sesiones/dispositivos reales. Las pruebas de roles PostgreSQL no sustituyen esas pruebas de Auth/HTTP.
- Scroll de varias páginas con más de 20 publicaciones reales en el móvil. La paginación está probada con datos simulados y el cliente real, no con un feed remoto grande.
- Vista oscura, texto ampliado, web interactiva y ejecución real en iOS.
- Edición del perfil con teclado: se abrió el formulario, pero no se completó la prueba de enfoque; no se considera verificada.

Artefactos completos de pruebas y exportación en `dist/validation-*.log` y `dist/validation-export/` (ignorados por Git).

## Corrección posterior del teclado

Corregido en `Screen`, compartido por los formularios: se vuelve a medir el campo enfocado al abrir el teclado, cambiar de foco o ajustarse el área de scroll, y se desplaza lo necesario para mostrarlo completo con 16 puntos de margen.

Samsung comprobado sin escribir ni guardar datos: Enlace pasa de 81 píxeles visibles a sus 169 píxeles completos, límites [72,1034][1008,1203]. También comprobado el cambio de foco con el teclado abierto. Evidencia: `dist/keyboard-result.xml` y `dist/keyboard-refocus.xml`.

Verificación posterior: lint y TypeScript correctos; 61 pruebas pasan, incluidas tres de regresión del desplazamiento. No se ha verificado este cambio en iOS ni cada formulario individualmente.
## Prueba posterior con dos cuentas temporales en Supabase remoto

Se crearon dos usuarios exclusivos de prueba mediante SQL administrativo, con contraseñas aleatorias en memoria y correo example.com confirmado en el fixture. Se usaron sesiones Auth HTTP reales y el repositorio de la app con la clave pública; no se enviaron correos. No se cambió la sesión del Samsung.

- Inicio de sesión y cierre de ambas cuentas: correcto.
- Creación y aislamiento de publicaciones privadas, wishlist, calendario y suscripciones: correcto.
- Grupo, aceptación de invitación, acceso antes/después de aceptar, token consumido, revocado y caducado: correcto.
- Comentario con emoticono, reintento con el mismo ID sin duplicar, rechazo de borrado ajeno y borrado propio: correcto.
- Imagen PNG subida por HTTP, URL firmada obtenida por miembro y descarga con bytes idénticos: correcto. Tras expulsión, se rechazan nueva firma, lectura de publicación y envío de comentario.
- Edición ajena no modifica la publicación; revisión obsoleta genera conflicto: correcto.
- 45 publicaciones públicas temporales insertadas: el controlador real pagina por HTTP y recupera todas sin duplicados. No equivale a probar gestos y renderizado en móvil con ese volumen.
- Eliminación de entidades propias, cierre de sesiones y limpieza final de cuentas y archivos generados: correcto, salida CLEANUP PASS.

Se detectó y corrigió un fallo real de INSERT RETURNING: la política post_read delegaba en una consulta STABLE que no veía la fila nueva. Reproducción inicial falla; corrección transaccional pasa con rollback; migración 005 aplicada y recorrido completo pasa después. Regresión SQL versionada en `supabase/tests/recommendation_returning.sql`.

Lint, TypeScript y 61 pruebas JavaScript pasan tras la corrección. Script de esta ejecución: `dist/validation-remote.cjs` (ignorado por Git, sin credenciales incrustadas). Siguen pendientes entrega de correos/registro/recuperación, interacción simultánea móvil-web, iOS y accesibilidad visual completa. Las cuentas estaban preconfirmadas para estas pruebas: no se afirma que el registro por correo esté verificado.

## Funciones de colección y grupos

- Biblioteca/wishlist: búsqueda por título sin distinguir acentos, categoría y nota mínima (todas, 4+, 5), y colección de descubrimientos propios. Limpiar filtros restaura todos los criterios. Prueba de selector y consulta Tarde en Samsung correctas.
- Terminar y valorar: nuevo formulario protegido por sesión; RPC atómico crea opinión privada propia y completa el deseo. Reintento sin duplicados. Los guardados ajenos conservan autor y opinión originales; su portada privada no se copia. Formulario comprobado en Samsung sin enviar opiniones personales.
- Compartir desde ficha: selección de grupo y cambio de audiencia con revisión de concurrencia. Prueba HTTP: un miembro gana acceso al descubrimiento privado y el contenido permanece igual; expulsarlo revoca acceso. Selector con los grupos de Anarp comprobado en Samsung sin cambiar audiencias personales.
- Renombrar grupo: lápiz visible solo al propietario, guardar/cancelar, nombre no vacío de hasta 80 caracteres. SQL y HTTP rechazan cambios de un miembro u otra cuenta. Editor visible en Samsung sin guardar cambios personales.
- Migración 006 aplicada; group_review_actions.sql pasa con rollback. Pruebas HTTP reales pasan y limpieza final confirmada.
- 64 pruebas JavaScript, lint y TypeScript correctos. Exportación all genera bundles Android/iOS/web (dist/features-export). No equivale a ejecución nativa en iOS.

Artefactos: dist/features-library.png, features-search.xml, features-group-edit.xml, features-review.xml, features-share.png, features-tests.log y features-export.log. No se realizaron guardados personales desde el móvil; los guardados se comprobaron por HTTP con fixtures temporales.
