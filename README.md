# My Hub

Aplicación cultural en español, compatible con Expo SDK 54 y Expo Go SDK 54.

## Primera versión local

- Inicio con recomendaciones de libros, películas, series, compras y sitios; filtros, valoración y foto opcional desde la galería. Precio y enlace opcionales en compras; ubicación y enlace opcionales en sitios.
- Wishlist con deseos directos y recomendaciones guardadas, filtros, edición y estado cumplido. Privada por defecto; la opción pública guarda la preferencia para el futuro grupo, sin publicación real todavía.
- Calendario privado con eventos y navegación mensual.
- Grupos privados con disponibilidad compartida, propuestas de planes y cosas para regalar.
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

## Pendiente: monetización con Amazon Afiliados

Decisión del 15 de octubre de 2026: retomar la afiliación cuando My Hub esté preparada para publicarse. No está implementada ni aprobada.

- [ ] Revisar las condiciones vigentes de [Amazon Afiliados España](https://afiliados.amazon.es/) y los [requisitos específicos para aplicaciones móviles](https://afiliados.amazon.es/help/node/topic/GHBY6W8UPTEFD3ZX).
- [ ] Solicitar el alta y la aprobación específica de My Hub como aplicación móvil.
- [ ] Tras la aprobación, añadir «Comprar en Amazon» en libros y productos, con enlaces generados mediante las herramientas autorizadas de Amazon y aviso claro de afiliación.
- [ ] Definir cómo se gestionan los enlaces aportados por usuarios; no sustituirlos automáticamente sin una decisión explícita.
- [ ] Verificar atribución y apertura de enlaces en Android, iOS y web antes de activar la monetización.

Esta anotación es un pendiente del proyecto, no un recordatorio programado.

## Autocompletar productos por enlace

En wishlist y recomendaciones, selecciona **Compras** y pega un enlace público. Tras una pausa breve se consultan nombre e imagen; en recomendaciones también se importa el precio cuando la página declara explícitamente EUR. Solo se rellenan campos vacíos y siempre puedes editarlos antes de guardar. La opinión no se sustituye por texto de la tienda. Wishlist conserva sus campos actuales: nombre, imagen y enlace.

La consulta utiliza [Microlink](https://microlink.io/docs/api/getting-started/overview) sin cuenta ni clave: recibe el enlace público, sin la sesión de My Hub. El formulario lo indica. No pegues enlaces privados con tokens de acceso. Su [cuota gratuita](https://microlink.io/docs/api/basics/rate-limit) y los bloqueos de las tiendas pueden impedir la extracción; el formulario sigue disponible manualmente y permite reintentar. Las imágenes se guardan como URLs remotas y pueden dejar de funcionar si la tienda las retira. No requiere migraciones, variables de entorno ni despliegue de funciones.

Pruebas: `node --test tests/product-metadata.test.cjs tests/product-link-field.test.cjs`. La extracción no ejecuta JavaScript de la tienda dentro de la app; lee metadatos y Product JSON-LD mediante el proveedor. Verificar visualmente en Android, iOS y web antes de publicar.
