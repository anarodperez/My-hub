# Mantine en My Hub web

Dirección autorizada: Mantine como base y Motion para transiciones, conservando la identidad ciruela y las pantallas nativas. Las colecciones aprovechan el ancho disponible sin volver a márgenes laterales grandes.

- Provider exclusivo de web, tema claro/oscuro conectado a la preferencia actual y fuentes locales.
- Navegación Mantine AppShell/NavLink con los mismos cuatro destinos, perfil al pie y barra inferior en pantallas pequeñas. Expo Router conserva el control de rutas y los enlaces permiten abrir otra pestaña.
- Adaptadores compartidos para Action, SaveAction, IconAction, ChoiceTabs y etiquetas/errores de Field. El TextInput existente mantiene sus propiedades y refs. FormDialog usa Modal con foco atrapado, restauración del foco y bloqueo de cierre al guardar.
- Motion mueve la selección de pestañas y el indicador de navegación; respeta movimiento reducido. No se desmonta el contenido durante una transición.
- Los archivos .web.tsx aíslan Mantine/Motion de los paquetes nativos. CSS de Mantine en capa para que los estilos propios tengan prioridad sin depender del orden de exportación.

Verificación: pruebas de navegación y controles, suite existente, TypeScript, lint y exportación web. La inspección visual queda pendiente si el navegador no está accesible.
