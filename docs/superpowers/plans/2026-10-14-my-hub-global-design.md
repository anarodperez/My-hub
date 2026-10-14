# Diseño global de My Hub — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Ejecución en esta sesión, conservando los cambios locales actuales.

**Goal:** Aplicar las seis mejoras visuales aprobadas en móvil y web sin alterar datos, cuentas ni operaciones existentes.

**Architecture:** Extender los componentes de hub y Expo Router existentes. Un único árbol de pestañas cambia de posición según el ancho útil; las fuentes y métricas se resuelven en componentes compartidos. Persistencia, rutas y reglas de negocio permanecen intactas.

**Tech Stack:** Expo 54, Expo Router 6, React Native 0.81, expo-font, Phosphor, Animated y React Native Web ya instalados.

**Spec:** `docs/superpowers/specs/2026-10-14-my-hub-global-design.md`.

## Global Constraints

- Mantener crema/ciruela/salvia y sus equivalentes oscuros, login protegido y los cambios de login/wishlist presentes en el checkout.
- Fuentes locales Manrope y Source Sans 3 con sus licencias; no añadir dependencias para fuentes, menú o movimiento.
- Navegación lateral desde 900 puntos de ventana; pestañas inferiores por debajo. Mismo árbol de rutas.
- Ancho máximo 1200 para contenido; 520–680 para formularios. Tarjetas de al menos 160 puntos, fuente ampliada reduce columnas.
- Controles mínimos 48 puntos. Radios 16 para superficies, 12 para controles. Movimiento 140–220 ms, reducido cuando lo pida el sistema.
- No contratar, publicar, modificar Supabase ni crear funcionalidad de backend. No añadir aclaraciones largas.

## Review Focus

1. Cambiar de tamaño mientras se edita: no perder texto, sesión, ruta ni filtros.
2. Fuente local que falla: ofrecer alternativa legible y evitar carga infinita.
3. Ancho útil distinto al de ventana por sidebar: ninguna cuadrícula desborda ni crea tarjetas demasiado estrechas.
4. Menú abierto con teclado o lector: Escape/Atrás cierran, foco vuelve al activador y se anuncia el estado.
5. Fallo de guardado o movimiento reducido: no animar éxito antes de guardar; ningún cambio de preferencias deja una animación viva.

## Task 1: Fuentes y sistema visual compartido

**Files:** crear `assets/fonts/Manrope-SemiBold.ttf`, `Manrope-Bold.ttf`, `SourceSans3-Regular.ttf`, `SourceSans3-SemiBold.ttf`, `SourceSans3-Bold.ttf` y licencias `Manrope-OFL.txt`/`SourceSans3-OFL.txt`; crear `src/constants/hub-design.ts`; modificar `src/app/_layout.tsx`, `src/components/hub-ui.tsx` y `src/app/account.tsx`.

**Interfaces:** `hubType` con roles `screenTitle`, `sectionTitle`, `cardTitle`, `body`, `metadata`; `hubSpace`, `hubRadius` y `hubWidths`. Copiar valores exactos del spec. `Copy` mantiene API compatible y elige peso real entre regular/semibold/bold sin estilo sintético. Inputs usan Source Sans 3; títulos usan Manrope.

- [ ] Verificar licencia y distribución oficial de ambas familias. Descargar solo pesos utilizados; si el archivo oficial es variable, instanciar pesos reales con herramienta disponible o usar las distribuciones estáticas oficiales, sin renombrar el mismo archivo como varios pesos.
- [ ] Leer docs Expo 54/expo-font. Integrar `useFonts` existente en raíz y controlar tanto carga como error; un error permite fuente de sistema, no una pantalla vacía permanente.
- [ ] Aplicar roles desde hub-ui; actualizar los estilos explícitos de cuenta para conservar el centrado y el ajuste natural del título. Revisar todos los TextInput directos antes de cerrar la tarea.
- [ ] Verificar carga correcta y fallo de fuente por inspección de ejecución; no introducir pruebas que solo repitan los objetos de estilos. Ejecutar lint y TypeScript.

## Task 2: Navegación adaptable y cuadrículas

**Files:** crear `src/features/hub/layout.ts`, `tests/hub-layout.test.cjs`; modificar `src/app/(tabs)/_layout.tsx`, `src/components/hub-ui.tsx`, `src/app/(tabs)/index.tsx`, `library.tsx`, `calendar.tsx` y `subscriptions.tsx`.

**Interfaces:** `getHubLayout(windowWidth: number, fontScale: number): { sidebar: boolean; contentWidth: number; feedColumns: number; wishColumns: number }`. Sidebar ocupa 224 puntos; calcular contenido disponible tras sidebar y 48 puntos de margen antes del máximo de 1200. Inicio: 1/2/3 columnas según 900/1200 de ventana, limitadas por ancho útil; wishlist 2/3/4 con el mínimo 160 y gap 16. Fuente >1.3 fuerza una columna de wishlist. `Screen` añade únicamente una variante `wide?: boolean`; sigue estrecho por defecto.

- [ ] Tests: ventana 359/fuente1 → wishlist1; 390/1 → wishlist2; 899 → sidebarfalse; 900 → sidebartrue; 1440/1 → feed3/wishlist4; 1440/1.4 → wishlist1. Assert en todos que cada tarjeta cabe y ninguna columna es cero. Ejecutar y observar fallo inicial.
- [ ] Implementar cálculo puro. Verificar API de pestañas laterales de la versión instalada y docs; usar `tabBarPosition`, sin reemplazar Tabs por navegadores separados. Conservar nombres, iconos, enlaces y guardas.
- [ ] Adaptar tab labels y estilo a posición lateral; perfil sigue accesible desde shell existente. Mantener ancho mínimo de destinos, foco visible y navegación por teclado.
- [ ] Usar ancho útil y variantes wide en Inicio/Wishlist; `Screen` centra contenido hasta 1200 sin ensanchar formularios. Calendario y suscripciones reciben distribución amplia legible; no tocar fechas ni céntimos.
- [ ] Ejecutar test de layout y todos los existentes. Probar redimensionado conservando selección y texto, enlaces directos, pestaña activa y cierre de sesión.

## Task 3: Contenido y coherencia de pantallas

**Files:** modificar `src/components/recommendation-card.tsx`, `wishlist-tile.tsx`, `moment-song.tsx`, `calendar-heading.tsx`, `src/app/settings.tsx`, `compose.tsx`, `wish.tsx`, `song.tsx` y las cuatro pestañas cuando usen tamaños incompatibles.

**Interfaces:** reutilizar `hubType`/`hubSpace`/`hubRadius`; conservar props públicas de tarjetas y los handlers actuales.

- [ ] Revisar jerarquía de cada pantalla: portada/título/opinión primero, metadatos compactos y ninguna nueva sección promocional. Usar título18/24 en tarjetas y cuerpo16/24 donde proceda; no uniformar roles distintos a la fuerza.
- [ ] Mantener `contain` en portadas de libros/productos y fallback de imagen por categoría; comprobar título largo, ausencia de foto y error de imagen.
- [ ] Aplicar mismos campos/botones y márgenes a formularios, perfil y cuenta. Conservar errores, ejemplos y avisos que evitan prometer sincronización inexistente; no añadir nuevos párrafos explicativos.
- [ ] Inspeccionar ambas paletas y fuente ampliada; corregir contraste y truncamientos antes de continuar. Lint y TypeScript.

## Task 4: Acciones secundarias accesibles

**Files:** crear `src/components/item-actions.tsx`; modificar `src/components/hub-icons.ts`, `recommendation-card.tsx`, `wishlist-tile.tsx`, `src/app/compose.tsx` y `wish.tsx` solo donde haya acciones secundarias que agrupar.

**Interfaces:** `ItemActions({ label, actions }: { label: string; actions: { label: string; onPress: () => void; destructive?: boolean; disabled?: boolean }[] })`. No copiar eliminación de datos en el componente: consume callbacks de confirmación existentes. Una única acción secundaria puede conservar su icono directo.

- [ ] Leer código actual de confirmación en compose/wish y conservarlo. Enumerar acciones existentes antes de moverlas; ninguna desaparece ni se ejecuta al abrir el menú.
- [ ] Usar popover web o modal nativo accesible con primitivas existentes; cierre por backdrop, Escape/Atrás y selección. Activador anuncia expanded, foco vuelve al activador y acciones tienen 48 puntos. Sin librería nueva.
- [ ] Prueba de interacción en navegador: abrir con teclado, recorrer acciones, Escape, restauración de foco; cancelar eliminación no escribe nada. Probar Atrás y lector en Samsung cuando estén disponibles. Si no hay harness de UI, documentar estas comprobaciones manuales sin añadir un framework solo para este menú.
- [ ] Verificar que guardar/completar/enlace siguen visibles y que estados busy deshabilitan acciones que compiten. Ejecutar tests de persistencia y validación existentes.

## Task 5: Microinteracciones y verificación de conjunto

**Files:** crear `src/hooks/use-reduced-motion.ts`; modificar `src/components/save-recommendation.tsx`, `wishlist-tile.tsx`, `hub-ui.tsx` y `DESIGN.md`.

**Interfaces:** `useReducedMotion(): boolean`, inicial true hasta resolver preferencia. Reutilizar `AccessibilityInfo` y el soporte web documentado; limpiar listeners y parar animaciones al desmontar/cambiar preferencia.

- [ ] Extraer el comportamiento de movimiento reducido ya presente en SaveRecommendation. Mantener feedback después de `await update`, nunca antes. Sustituir duración abierta del spring por secuencia acotada total de 180–220 ms.
- [ ] Aplicar feedback de pulsación común y confirmación de completado. Si cambiar de estado elimina la tarjeta de la lista, usar confirmación de estado accesible en el contenedor, sin animación que requiera retener/copiar datos eliminados.
- [ ] Simular fallo de escritura y verificar que no se anuncia éxito. Activar movimiento reducido y comprobar respuesta instantánea. Probar rápidos cambios de filtro y desmontaje sin listeners pendientes.
- [ ] Actualizar DESIGN.md con fuentes, escala, breakpoints y movimiento realmente implementados.
- [ ] Ejecutar toda la suite Node, `npx expo lint`, `npx tsc --noEmit`, exportaciones Android y web. Inspección agrupada de Samsung, web1024/web1440, claro/oscuro y fuente ampliada; una ronda de correcciones y una confirmación como máximo.
- [ ] Revisar diff completo para detectar cambios de comportamiento/datos fuera del alcance. Guardar cambios en Git sin incluir `.env.local`; subir solo dentro de la autorización vigente para la publicación de esta entrega.

## Cierre

Las seis mejoras deben verse en pantallas reales. Reportar por separado evidencia local, pruebas de navegador/hardware y plataformas pendientes. No afirmar revisión de iOS sin dispositivo, ni presentar exportaciones como despliegue. No borrar ni sobrescribir los cambios de login/wishlist previos a este plan.
