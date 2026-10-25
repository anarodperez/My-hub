# Verificación de Amigas — 25 de octubre de 2026

- `node --test tests/*.test.cjs`: 87 pruebas, 87 pasan.
- `npx expo lint`: sin errores ni advertencias.
- `npx tsc --noEmit`: sin errores.
- `npx expo export --platform web --output-dir dist/social-export`: generado.
- `npx expo export --platform android --output-dir dist/social-android`: generado con bytecode Hermes. El aislamiento impedía ejecutar hermesc; el mismo comando pasó fuera del aislamiento.
- Siete archivos `supabase/tests/*.sql`: pasan en PostgreSQL 17 aislado con Auth/Storage mínimos, sin datos reales. El bootstrap local necesitó columnas `aud`, `role`, `email` para la prueba de perfiles existente.
- Migración 007 aplicada al proyecto remoto configurado. Comprobadas las tres tablas con RLS activado y bucket `group-media` privado. No se crearon fixtures remotos.

No verificados: aspecto visual e interacción en teléfono físico, uso simultáneo en dos móviles, ni subida real de fotos desde Android. El test SQL sí verifica lectura de archivos por miembro, denegación a terceros y expulsión. Las URLs firmadas duran una hora; no se invalidan instantáneamente al retirar acceso. No hay notificaciones ni suscripción a cambios en tiempo real: se actualiza al enfocar la pantalla o pulsar Actualizar.

Sin nuevas dependencias. Sin commits. Se conservaron los cambios previos del usuario y los datos de suscripciones.

## Retirada definitiva posterior, autorizada por la usuaria

Se eliminó el soporte de suscripciones del modelo, repositorio, sincronización e importación; migración 008 aplicada al remoto, eliminando la tabla. Prueba local con suscripción y evento de control: elimina suscripciones y mantiene el evento. La lectura y limpieza de snapshots antiguos descarta solo el campo retirado; los datos de otros apartados se conservan y el borrado local se realizará al abrir la app con sesión.

Verificación posterior: 89 pruebas Node pasan, lint y TypeScript sin errores. Los datos de suscripciones ya no se conservan en Supabase; esto sustituye la decisión inicial documentada arriba. No se ha probado esta limpieza en el teléfono físico.
