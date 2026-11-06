# Carga de imágenes

`LoadingImage` conserva las dimensiones de la foto y presenta fondo suave, icono e indicador mientras carga. Oculta la espera en `onDisplay`, no al terminar la descarga, y conserva los callbacks de los consumidores. Un error detiene el indicador; los consumidores mantienen sus fallbacks existentes. Cada fuente nueva tiene su propio estado. Caché de memoria/disco y aparición de 180 ms; movimiento reducido elimina spinner y transición.

Aplicado a regalos, recomendaciones, wishlist, sorpresa, detalle de descubrimiento y selector de portada. No cambia fotos de perfil, iconos ni la reproducción de música.

Validación: servidor local demorando la imagen 7 segundos, viewport de 390 px. Antes: imagen incompleta y un indicador visible. Después: imagen de 1000 px cargada e indicador retirado. Sin desbordamiento ni cambios de tamaño. Capturas `docs/screenshots/2026-11-06-image-loading.png` y `2026-11-06-image-ready.png`.

Siete pruebas de componente/layout/movimiento, TypeScript y compilación web pasan. Lint de los archivos enfocados limpio; lint global conserva 25 errores anteriores, incluidos los de la ruta de detalle. La ruta temporal de verificación se eliminó. Pendiente prueba de carga lenta en dispositivo físico.
