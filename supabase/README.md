# Conectar cuentas

1. En Supabase, abrir SQL Editor y ejecutar `migrations/202610140001_profiles.sql` una sola vez. Es una transacción: si falla, no queda aplicada parcialmente. No usar la clave pública para intentar administrar el esquema.
2. En Authentication, mantener proveedor Email y confirmación de correo activados. El formulario exige un mínimo de seis caracteres; si se configura una política más estricta, actualizar la validación local para explicar esos requisitos. Supabase siempre aplica su política del servidor.
3. En las plantillas **Confirm signup** y **Reset password**, incluir `<p>Tu código de My Hub: {{ .Token }}</p>`. Guardar ambas plantillas. La app permite introducir el código sin depender de enlaces de Expo Go; no fijar su longitud en el formulario.
4. Comprobar la entrega de correo. El servicio integrado restringe destinatarios y envíos: para amigos externos al equipo puede requerirse SMTP propio. No desactivar confirmación para ocultar un problema de correo ni contratar un servicio sin elegirlo explícitamente.
5. Completar `.env.local` con `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, y reiniciar Metro. Este archivo está excluido de Git. `.env.example` contiene solo los nombres.
6. Abrir **Mi perfil → Mi cuenta**: registrarse, introducir código y guardar un nombre. Cerrar sesión, volver a entrar y probar recuperación. La recuperación usa un cliente temporal que no persiste sesión: al salir o reiniciar hay que solicitar/verificar el código de nuevo; tras cambiar contraseña, entrar normalmente.

## Verificación de permisos

Ejecutar `tests/profiles.sql` como postgres en un proyecto Supabase de pruebas aislado después de aplicar la migración. El script crea fixtures en una transacción, prueba roles y hace rollback; ninguna aserción debe fallar. Con psql usar `-v ON_ERROR_STOP=1 -f supabase/tests/profiles.sql` y la conexión del proyecto configurada localmente. No versionar esa conexión ni su contraseña.

Probar con dos cuentas reales que cada una solo accede a su perfil. El código de esta entrega mantiene recomendaciones, wishlist, eventos y suscripciones locales. No hay importación automática, grupos, Storage ni sincronización de ese contenido todavía.

## Estado de esta entrega

Al abrir sin sesión se muestra acceso a cuenta. Mientras se recupera la sesión guardada se muestra carga; una sesión existente abre las pestañas. Cerrar sesión retira las rutas privadas del historial. Los enlaces directos a esas rutas tampoco permiten saltar el acceso. Si falta configuración de Supabase se informa en la pantalla de cuenta.

La conexión pública y Auth se pueden verificar sin crear usuarios. SQL y flujos de correo necesitan acceso al panel y cuentas reales: no se consideran verificados por pasar lint o TypeScript.
