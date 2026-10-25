# Cuentas Supabase: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Ejecución propuesta: en esta sesión, sin delegación.

**Goal:** Permitir registro, acceso, confirmación de correo, recuperación de contraseña y perfil privado en el proyecto Supabase real, conservando el modo local.

**Architecture:** Supabase Auth gestiona cuentas; PostgreSQL con permisos explícitos y RLS guarda perfiles. Un proveedor de sesión separado del HubProvider actual evita convertir los datos locales en datos de cuenta antes de implementar su importación. Esta entrega no presenta el contenido local como sincronizado.

**Tech Stack:** Expo SDK 54, Expo Router, TypeScript, Supabase JS, AsyncStorage existente, Node test y pruebas SQL.

**Spec:** `docs/superpowers/specs/2026-10-14-my-hub-backend-design.md`.

## Global Constraints

- Mantener Expo SDK 54 y Expo Router; leer las páginas versionadas antes de usar sus APIs.
- Plan gratuito; no contratar servicios ni incluir claves administrativas en la app.
- Mantener intacta `my-hub:v1`. No importar ni compartir datos automáticamente.
- Español, componentes existentes, rutas en `src/app/` y lógica fuera de esa carpeta.
- Sin servidor Node adicional. Todas las tablas expuestas llevan RLS y grants explícitos.
- Esta es la entrega 1 de cuentas: grupos/fotos, contenido sincronizado e importación tendrán sus propios planes antes de implementación. El alcance global acordado sigue vigente.

## Review Focus

1. Configuración ausente o clave secret: modo local disponible, cuenta deshabilitada con explicación.
2. Respuesta tardía de perfil tras cerrar sesión: no mostrar datos de la cuenta anterior.
3. Código de recuperación rechazado o caducado: no permitir cambiar contraseña ni perder la posibilidad de reintentar.
4. Perfil modificado desde el cliente de otro usuario: PostgreSQL debe rechazarlo.
5. Error de red durante acceso o cierre: no mostrar éxito falso ni cambiar de cuenta implícitamente.

## Task 1: Perfil privado y políticas verificables

**Files:** crear `supabase/migrations/202610140001_profiles.sql`, `supabase/tests/profiles.sql` y `supabase/README.md`.

**Interfaces:** `public.profiles(id uuid primary key references auth.users(id) on delete cascade, name text not null default '', avatar_path text, updated_at timestamptz not null default now())`. Esta fase permite únicamente acceso propio; ampliar lectura a compañeros al implementar membresías. Sin buckets ni rutas de avatar activas todavía.

- [ ] Escribir pruebas SQL transaccionales con cuentas A/B y roles `anon`/`authenticated`: A consulta/actualiza A, nunca B; B no puede apropiarse del ID de A; anon carece de acceso. Usar usuarios de prueba y rollback.
- [ ] Ejecutar esas pruebas antes de la migración en una base de pruebas Supabase; deben fallar por tabla ausente. No crear cuentas de prueba en un proyecto con datos reales sin aislarlas.
- [ ] Crear tabla, restricciones, grants mínimos y políticas select/insert/update usando `auth.uid() = id`, incluyendo `with check`. Actualizar timestamp en servidor; revocar privilegios innecesarios. Usar upsert propio al guardar perfil, sin trigger sobre `auth.users`.
- [ ] Aplicar migración y repetir SQL: ninguna aserción falla. Documentar ejecución mediante SQL Editor o `psql` con acceso suministrado localmente, sin publicar contraseñas.
- [ ] Commit: `feat: add private Supabase profiles`.

## Task 2: Cliente y sesión sin alterar datos locales

**Files:** crear `.env.example`, `src/features/account/config.ts`, `src/features/account/client.ts`, `src/features/account/provider.tsx`, `tests/account-config.test.cjs`, `tests/account-session.test.cjs`; modificar `src/app/_layout.tsx`, `package.json` y `package-lock.json`. Si la prueba de respuestas tardías requiere extraer la gestión de sesión, crear `src/features/account/session.ts` y probar ese comportamiento, sin simular React entero.

**Interfaces:** `readAccountConfig(url: string | undefined, key: string | undefined): { url: string; key: string } | null` rechaza claves no públicas y URL no HTTPS. `supabase: SupabaseClient | null`. `useAccount()` devuelve `{ configured: boolean; loading: boolean; session: Session | null; profile: { id: string; name: string } | null; error: string | null }`; acciones de autenticación usan el cliente oficial, sin crear un adaptador redundante.

- [ ] Pruebas: variables ausentes devuelven null; `sb_secret_...` y URL HTTP se rechazan; URL HTTPS y clave publishable se aceptan. Las pruebas de sesión deben demostrar que una respuesta de perfil A recibida después del cierre o del acceso B se descarta.
- [ ] Ejecutar `node --experimental-strip-types --test tests/account-config.test.cjs tests/account-session.test.cjs`; confirmar fallo inicial por módulo ausente.
- [ ] Leer documentación Expo 54, índice Expo y quickstart Supabase React Native. Instalar `@supabase/supabase-js` con `npx expo install`; reutilizar AsyncStorage. Añadir polyfill solo si la documentación y runtime de SDK 54 lo requieren, no copiar dependencias visuales del quickstart.
- [ ] Configurar `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, persistencia de sesión, `detectSessionInUrl: false` y renovación al volver a primer plano. Registrar y limpiar listeners; controlar carga y errores; no registrar tokens. Usar nombre de almacenamiento distinto a `my-hub:v1`.
- [ ] Montar AccountProvider sin reemplazar HubProvider. Proteger resultados async mediante identidad/generación de sesión. Vaciar perfil inmediatamente al cierre; un fallo de red no debe dejar visible un perfil de otra sesión.
- [ ] Ejecutar pruebas, `npx expo lint` y `npx tsc --noEmit`; commit `feat: persist Supabase account sessions`.

## Task 3: Flujos reales de cuenta y configuración de correo

**Files:** crear `src/app/account.tsx`; modificar `src/app/settings.tsx`, `README.md` y `supabase/README.md`. Reutilizar `Screen`, `Field`, `Action`, `Copy`, `Surface` y `TextAction` de `src/components/hub-ui.tsx`. Añadir `tests/account-validation.test.cjs` y `src/features/account/validation.ts` únicamente para validaciones no triviales compartidas.

**Interfaces:** pantalla `/account` con estados acceso, registro, confirmación, recuperar, verificar recuperación y nueva contraseña. Usar `auth.signUp`, `signInWithPassword`, `resetPasswordForEmail`, `verifyOtp({ email, token, type: 'signup' | 'recovery' })`, `updateUser({ password })` y `signOut`. Un token recovery verificado abre únicamente el flujo de cambio de contraseña hasta completarlo o cancelar cerrando la sesión creada por recuperación.

- [ ] Antes de implementar, verificar APIs actuales y requisitos de contraseña/código del proyecto. Pruebas de validación: correo vacío, contraseña por debajo del mínimo configurado y confirmación distinta bloquean envío. No recortar ni transformar contraseñas.
- [ ] Ejecutar pruebas y confirmar fallo inicial. Implementar formulario con teclado adecuado, contraseña oculta, etiquetas accesibles, bloqueo de doble envío y errores legibles que no revelen existencia de cuentas.
- [ ] Configurar plantillas de confirmación y recuperación para mostrar `{{ .Token }}` e introducirlo en la app, sin depender de enlaces de Expo Go. No fijar seis dígitos: respetar la longitud configurada del proyecto. Probar código incorrecto, caducado y reenvío limitado sin perder correo escrito.
- [ ] Añadir acceso a cuenta en perfil, mostrar correo de la sesión propia, editar nombre remoto mediante upsert y cerrar sesión. Mantener aviso claro de que recomendaciones y demás contenido siguen locales en esta entrega. No subir avatar local antes de implementar Storage.
- [ ] Configurar y verificar entrega de correo: el SMTP integrado puede restringir destinatarios y envíos. Si hace falta SMTP propio, documentar el bloqueo y facilitar configuración sin contratar nada automáticamente ni desactivar verificación para fingir éxito.
- [ ] Prueba real: registrar A, confirmar, entrar, reiniciar, guardar nombre, cerrar, entrar B y comprobar aislamiento. Recuperar contraseña A con código, confirmar nueva contraseña y volver a entrar. Repetir con desconexión; ninguna acción fallida anuncia éxito.
- [ ] Ejecutar todos los tests existentes y nuevos, lint y TypeScript. Abrir en Samsung y registrar evidencia; iOS pendiente si no hay dispositivo. Commit `feat: add account access and password recovery`.

## Criterio de cierre y continuación

No declarar desplegado hasta verificar Auth y RLS contra el proyecto real. Si falta acceso al panel, entregar código, SQL y pasos exactos, marcando explícitamente pruebas externas pendientes. Tras completar cuentas, preparar el plan de grupos/invitaciones/recomendaciones y Storage, seguido del de datos personales y el de importación; no descartar ninguna de esas entregas.
