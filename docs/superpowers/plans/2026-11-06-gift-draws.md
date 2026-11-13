# Regalos con sorteo

Autorizado por «adelante»: publicaciones independientes dentro del grupo, inscripción hasta un plazo de 1, 3 o 7 días (3 por defecto), asignación automática entre participantes y revelación animada del resultado persistido. Una participante gana directamente; sin participantes el regalo queda cerrado sin asignar. Los regalos anteriores conservan la gestión manual.

Se mantiene Expo SDK 58, Supabase y el diseño existente, sin dependencias nuevas. El servidor controla el plazo, la participación y el resultado; la animación nunca elige ganadora. Cron resuelve incluso sin clientes conectados, y la lectura resuelve sorteos vencidos como recuperación.

- [x] Probar validación del plazo, reintentos, cuenta atrás y RPC; añadir pruebas SQL de permisos, cierre y resultado inmutable.
- [x] Añadir columnas, bloqueo de participación al vencer, resolución transaccional y programación Cron.
- [x] Integrar plazo en publicación y tarjetas de regalo con participantes, cuenta atrás y revelación accesible.
- [x] Ejecutar pruebas, lint y TypeScript; documentar activación y límites de verificación.

Riesgos a verificar: concurrencia al cerrar, dueña o extrañas participando, regalos sin candidatas, repetición del sorteo y clientes anteriores. Conservar cambios locales existentes. No desplegar cambios de esquema a un proyecto remoto sin un canal administrativo autorizado.
