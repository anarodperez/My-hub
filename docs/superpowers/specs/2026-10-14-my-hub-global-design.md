# My Hub: diseño global adaptable

## Resultado

Aplicar las seis mejoras aceptadas: tipografía propia, contenido protagonista, navegación para ordenador, microinteracciones, acciones secundarias discretas y un sistema visual consistente. La misma aplicación Expo mantiene Android, iOS y web; no crear otra web ni cambiar el backend. Conservar todos los cambios de login y wishlist que el usuario está revisando.

## Identidad y tipografía

Mantener crema, ciruela y salvia en claro, y ciruela profunda y lavanda en oscuro. Conservar Phosphor y el wordmark actual; no crear un logo nuevo sin un encargo específico. Usar Manrope para títulos y Source Sans 3 para texto y formularios, con archivos locales y sus licencias. Cargar mediante expo-font instalado, sin peticiones de fuentes durante el uso. Seleccionar pesos reales para regular, semibold y bold; no simular pesos inexistentes.

Escala común: título de pantalla 30/36, encabezados 22/28, título de tarjeta 18/24, cuerpo 16/24 y metadatos 12/18. Login y registro conservan encabezado centrado de 38/43, ajustable por ancho y tamaño de texto. Permitir saltos naturales y ampliación de fuente del sistema. Nombres de marca y términos de interfaz permanecen en español.

## Navegación y distribución

A partir de 900 puntos de ancho de ventana, mostrar barra lateral con Inicio, Wishlist, Calendario, Suscripciones y acceso a perfil. Por debajo, conservar las cuatro pestañas inferiores. Usar Expo Router para ambos, con rutas actuales e indicador activo accesible. La navegación por teclado y el botón Atrás deben seguir funcionando. No duplicar árboles de pantallas ni montar dos navegadores para simular la barra lateral.

Mantener el contenido alineado a una cuadrícula con máximo de 1200 puntos en pantallas de contenido. Formularios, cuentas y ajustes conservan un ancho máximo de 520–680. Inicio usa una columna en móvil, dos desde 900 y tres desde 1200. Wishlist conserva dos columnas en móvil normal, una por debajo de 360 o con fuente ampliada, tres desde 900 y cuatro desde 1200; reducir columnas si el ancho útil de una tarjeta cae por debajo de 160 puntos. Calcular respecto al espacio de contenido, descontando la barra lateral.

## Contenido

Inicio da prioridad a portadas, título y opinión, con categorías y valoración compactas. Wishlist mantiene sus filtros, recuentos, dos tipos de elementos y preferencia de visibilidad al final. Calendario conserva fechas y acciones; ampliar su espacio sin reinterpretar las fechas. Suscripciones conserva los céntimos exactos, periodicidad y cálculos actuales.

No añadir párrafos explicativos, decoración promocional ni información sobre implementación. Mantener estados, errores y avisos necesarios para evitar engaños, como contenido de ejemplo o datos que todavía no están sincronizados. No fingir que elegir preferencia pública publica la lista.

## Componentes y acciones

Centralizar fuente, escala, espacio, esquinas y anchos en el sistema existente de componentes de hub. Usar superficies de radio 16, campos y botones de radio 12 y controles de al menos 48 puntos. Conservar el contraste de ambos temas y los mensajes de validación. Las pantallas no deben definir variantes incompatibles para la misma función.

Agrupar editar/eliminar en un menú de acciones accesible allí donde existan varias acciones secundarias. Guardar, completar y abrir enlace siguen visibles cuando son tareas principales. Reutilizar las confirmaciones de eliminación actuales. El menú se cierra con Atrás/Escape, recupera el foco del activador y no deja el teclado atrapado. No añadir funciones nuevas ni eliminar acciones existentes.

## Movimiento

Usar las animaciones ya instaladas. Respuesta de pulsación breve y confirmación al guardar/completar; las confirmaciones aparecen solo después de persistencia correcta. Transiciones de 140–220 ms, sin animar cada tarjeta al entrar ni introducir parallax o fondos animados. Respetar movimiento reducido tanto en web como en nativo; no animar colores o dimensiones que perjudiquen el desplazamiento. No introducir dependencias solo para movimiento.

## Alcance de implementación

- Fuentes y estilos compartidos: raíz, componentes hub y campos de formularios.
- Shell: `src/app/(tabs)/_layout.tsx` y navegación compartida.
- Contenido: cuatro pantallas de pestañas, tarjetas, perfil y cuenta para comprobar consistencia.
- Acciones: componentes de tarjetas y formularios que ya exponen editar/eliminar.
- Documentación: actualizar DESIGN.md para reflejar la implementación resultante, sin rehacer documentación de producto ajena al alcance.

## Verificación y aceptación

Comprobar móvil compacto, Samsung conectado y web a 1024 y 1440 de ancho, en claro y oscuro. Probar texto ampliado, teclado abierto, enlaces directos protegidos, Atrás/Escape, filtros sin resultados, imágenes ausentes y errores de persistencia. No perder datos, estados de filtros ni sesión al cambiar el ancho de ventana.

Pruebas de lógica para columnas y breakpoints, conservación de rutas y movimiento reducido donde haya nueva lógica compartida. Ejecutar todas las pruebas relevantes, lint y TypeScript. Exportar Android y web. Inspeccionar las pantallas reales en una ronda agrupada; corregir defectos en una segunda ronda como máximo. Registrar iOS como no verificado si no hay hardware disponible.

## Límites

No cambiar el esquema de Supabase ni la persistencia local, no publicar una web, no contratar servicios y no añadir chat, notificaciones o sincronización. Conservar el login obligatorio y la sesión persistente. Las mejoras visuales no implican que funciones de backend pendientes hayan empezado a funcionar.
