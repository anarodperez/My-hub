# Animaciones sutiles

Se añaden fundidos breves a la navegación por pestañas, selección de opciones,
resultados de wishlist, agenda del día, paneles de filtros, selector de mes/año,
formularios de grupos, detalles de disponibilidad, campos condicionales y mensajes.
Los menús de opciones usan el fundido nativo del modal.

`src/components/hub-motion.tsx` concentra las entradas de 180 ms, salidas de
120 ms y cambios de contenido de 180 ms. Los cambios de contenido mantienen los
hijos montados, sin usar claves para reiniciar formularios. Las animaciones
respetan reducir movimiento; las transiciones de contenido se cancelan al
repetir la interacción, activar esa preferencia o desmontar el componente.

Se conservan las confirmaciones de guardado y el movimiento del dado al pulsarlo.
Se eliminan el balanceo automático del dado y el giro continuo del disco.
No se añaden dependencias ni se modifican los datos o las operaciones de guardado.

## Validación

- TypeScript: `npm exec -- tsc --noEmit`, correcto.
- Pruebas: `node --test tests/*.test.cjs`, 109 correctas.
- Web: `npm exec -- expo export --platform web`, exportación correcta.
- Lint: ejecutado; 25 errores existentes. Antes de estos cambios había 29;
  los cuatro eliminados estaban asociados a las referencias del disco animado.
- Detector de interfaz sobre el componente de movimiento, wishlist y menú:
  sin observaciones.

Pendiente la comprobación visual y de fluidez en Android/iOS reales. La
exportación web y las pruebas de lógica no verifican el resultado visual ni
la tasa de fotogramas en un dispositivo.
