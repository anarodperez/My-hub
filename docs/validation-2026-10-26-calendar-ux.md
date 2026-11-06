# Calendarios: acceso y disponibilidad

- Calendario ofrece Personal / Con amigas. Con amigas reutiliza la lista de grupos privados y abre su calendario; no expone eventos personales.
- El día seleccionado muestra por franja cuántas pueden, no pueden o no han indicado respuesta, con nombres, texto e iconos.
- Las acciones de todo el día permiten marcar Puedo, No puedo o quitar las tres respuestas. Se guardan mediante un único RPC transaccional, reutilizando permisos y validación de la migración 010.
- La lista de grupos y su contenido se actualizan deslizando hacia abajo, con indicador de carga; se bloquean cambios durante guardados.
- El mes distingue días con respuestas negativas de los días sin información. La leyenda explica el recuento de disponibilidad.

Verificado: 105 pruebas Node, Expo lint y TypeScript correctos. availability_day.sql comprueba cambios positivos, negativos y retirada de todo el día en PostgreSQL aislado con fixtures revertidos. Migración 011 aplicada en Supabase sin modificar respuestas existentes.

Rollback: volver al cliente anterior conservando la función añadida; no hay cambios de datos ni tablas en 011. Pendiente probar gestos y tamaños en Android físico. Cambios locales sin subir a GitHub.
