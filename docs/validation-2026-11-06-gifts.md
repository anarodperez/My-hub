# Regalos con sorteo — 6 de noviembre de 2026

Cada regalo nuevo tiene un plazo de 1, 3 o 7 días (3 por defecto). Las amigas se apuntan con «¡Lo quiero!» y pueden retirarse hasta el cierre. Una participante recibe el regalo directamente; varias entran en un sorteo con una única ganadora; sin participantes queda cerrado sin asignación. La dueña no participa. La entrega se acuerda después entre las amigas.

El resultado se elige y guarda en Postgres. La revelación con regalo animado y confeti muestra ese resultado; no vuelve a sortear. Se respetan movimiento reducido, temas claro/oscuro y controles accesibles. La cuenta atrás se actualiza cada 15 segundos y el contenido cada 20 segundos mientras la pantalla está activa. Los cambios de participación no desmontan las tarjetas, para conservar el feedback y la revelación.

## Servidor

Aplicadas al Supabase configurado las migraciones `202611060012_gift_draws.sql` y `202611060013_gift_draw_schedule.sql`, juntas en una transacción con tiempo máximo de espera de bloqueo de 5 segundos. Se recargó el esquema de PostgREST. No se modificaron regalos existentes: conservan el flujo manual al no tener plazo.

Cron `hub-gift-draws` está activo cada minuto y su primera ejecución remota figura como `succeeded`. Resuelve aunque nadie tenga la app abierta; leer la sección también resuelve vencidos como recuperación. Participación y resolución bloquean la misma fila. El resultado es inmutable y se excluyen participantes que ya no pertenecen al grupo. Solo miembros pueden invocar la recuperación; el resolutor interno no tiene permisos de ejecución para clientes. Si desaparece la cuenta ganadora se conserva el estado reservado o entregado.

Para detener la programación: `select cron.unschedule('hub-gift-draws');`. Conservar columnas y resultados; no borrar datos para revertir la interfaz. La recuperación al leer seguirá activa mientras se mantenga el cliente nuevo.

## Validación

- 16 pruebas Node: cuenta atrás, plazos inválidos, reintentos con timestamps normalizados, recuperación por grupo, errores y regresiones de publicaciones/grupos.
- Dos suites SQL en Postgres 17 aislado, con esquemas mínimos de auth/storage: permisos, dueña/extrañas, retirada antes/después del cierre, candidatas que abandonan, cero/una/varias candidatas, resultado estable, entrega y borrado de cuentas en cascada. No se ejecutaron fixtures contra datos personales.
- `npx tsc --noEmit`: correcto.
- ESLint de los seis archivos TypeScript modificados: correcto.
- `npx expo lint`: 25 errores en otros archivos, principalmente reglas React de referencias durante render y setState dentro de efectos. No se ampliaron cambios a esos archivos.
- `npx expo export --platform web`: correcto, sin la ruta temporal de previsualización.
- Detector Impeccable: sin hallazgos.
- Revisión independiente: corregido el caso de cuenta ganadora eliminada.
- Capturas de componentes reales con datos ficticios: viewport móvil de 390 px y escritorio de 1200 px, temas claro y oscuro. Sin desbordamiento horizontal; revelación visible. La ruta de prueba se eliminó después.

Pendiente: probar gestos y fluidez en un teléfono físico, y una sesión real con varias amigas. No se añadieron notificaciones push ni mensajería.

Capturas: [móvil](screenshots/2026-11-06-gifts-mobile.png), [escritorio](screenshots/2026-11-06-gifts-desktop.png), [oscuro](screenshots/2026-11-06-gifts-dark.png). La ruta de prueba, servidor HTTP y base aislada se retiraron o detuvieron. Windows no permitió borrar por completo el perfil temporal `tmp/gift-chrome-cdp`; no contiene sesiones de usuario.

Referencias consultadas: [Expo SDK 58](https://docs.expo.dev/versions/v58.0.0/), [Animated](https://reactnative.dev/docs/animated), [Supabase Cron](https://supabase.com/docs/guides/cron).
