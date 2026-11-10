# Precio fijo y subastas

Modalidades al compartir: regalo (predeterminada), precio fijo y subasta. Euros en céntimos enteros, mínimo 0,01 € y máximo 999.999,99 €. Primera puja desde el precio de salida; siguientes suben al menos 1 €. Reserva y puja requieren confirmación antes de enviar. El pago y la entrega se acuerdan fuera de la app, sin cobros integrados.

Precio fijo sin caducidad: la primera reserva confirmada bloquea el artículo para esa amiga. Subastas con el plazo existente de 1, 3 o 7 días: gana la mayor puja entre miembros actuales, excluida la propietaria. Sin pujas quedan cerradas sin asignación. El importe ganador se guarda en la publicación y se conserva aunque desaparezca la cuenta ganadora. Regalos anteriores y sus resultados no cambian.

Aplicada al Supabase configurado `202611060014_offer_modes.sql`, en transacción con espera máxima de bloqueo de 5 segundos y recarga del esquema de PostgREST. Cron existente sigue activo; el mismo resolutor ahora cierra regalos y subastas, excluyendo precio fijo. Clientes solo pueden leer pujas e invocar RPC autorizados; no pueden escribir pujas directamente. Pujas, reservas y cierre bloquean la misma publicación.

## Validación

- 18 pruebas Node: importes exactos con coma/punto, límites y validación, RPC y errores, modalidades, reintentos de regalos y gestión de ventas.
- Tres suites SQL en Postgres 17 aislado con auth/storage mínimos: `offer_modes.sql`, `gift_draws.sql`, `gift_reservations.sql`. Incluyen permisos, propietaria/extrañas, incremento mínimo, plazo, reserva duplicada, reintentos, ganadora elegible, ausencia de pujas y borrado de cuentas. No se ejecutaron fixtures contra datos personales.
- `node supabase/tests/offer_concurrency.cjs`: dos sesiones concurrentes compiten por la misma reserva y por una primera puja del mismo importe; exactamente una aceptada en cada caso. Datos temporales aleatorios retirados al finalizar. El script solo usa la base aislada de localhost:55439.
- TypeScript y ESLint de los seis archivos TypeScript modificados: correctos.
- Lint global: persisten los 25 errores ajenos a esta modificación.
- Compilación web correcta tras retirar la ruta temporal de previsualización.
- Revisión independiente sin hallazgos importantes.
- Verificación visual a 390 y 1200 px, claro/oscuro y confirmación de reserva. Sin desbordamiento horizontal. Capturas: `docs/screenshots/2026-11-06-offers-{mobile,desktop,dark}.png`.

Pendiente: prueba en teléfono físico y con sesiones reales de varias amigas. No se añadieron pagos, chat, envío ni notificaciones. Para revertir el cliente, conservar columnas, pujas y resultados; no borrar datos de ventas. No restaurar el resolutor antiguo mientras queden subastas abiertas.
