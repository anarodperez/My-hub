# My Hub

Aplicación cultural en español, compatible con Expo SDK 54 y Expo Go SDK 54.

## Primera versión local

- Inicio con recomendaciones de libros, películas, series, compras y sitios; filtros, valoración y foto opcional desde la galería. Precio y enlace opcionales en compras; ubicación y enlace opcionales en sitios.
- Wishlist con deseos directos y recomendaciones guardadas, filtros, edición y estado cumplido. Privada por defecto; la opción pública guarda la preferencia para el futuro grupo, sin publicación real todavía.
- Calendario privado con eventos y navegación mensual.
- Suscripciones privadas con precio, frecuencia, próxima renovación y estimación mensual.
- Ajustes de nombre y tema: sistema, claro u oscuro.

Los datos permanecen en el dispositivo mediante AsyncStorage. Aún no hay cuentas, grupos compartidos, invitaciones ni recordatorios. Desinstalar Expo Go o borrar sus datos elimina este almacenamiento local.

## Arrancar

```powershell
npm install
npm start
```

Para el Samsung conectado por USB, con depuración autorizada:

```powershell
npx expo start --go --localhost --port 8083
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" reverse tcp:8083 tcp:8083
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" shell am start -a android.intent.action.VIEW -d exp://127.0.0.1:8083 -p host.exp.exponent
```

Mantener el cable conectado y Metro encendido. Cambiar el puerto en ambos comandos si fuera necesario.

## Cuentas Supabase

Configuración y migración en [supabase/README.md](supabase/README.md). El acceso está en **Mi perfil → Mi cuenta**. La cuenta permite guardar un nombre remoto; el resto del contenido sigue local hasta implementar su sincronización. Reiniciar Expo después de configurar `.env.local`.

## Comprobaciones

```powershell
node --experimental-strip-types --test tests/hub-model.test.cjs tests/hub-storage.test.cjs
npx tsc --noEmit
npx expo lint
npx expo install --check
```

Diseño y alcance: [especificación](docs/superpowers/specs/2026-10-13-my-hub-design.md).
