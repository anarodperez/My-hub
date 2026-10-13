# My Hub local — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Subagent-driven execution is an alternative only if the user chooses it.

**Goal:** Reemplazar la plantilla por una app cultural local funcional, con recomendaciones, biblioteca, calendario, suscripciones y dos temas.

**Architecture:** Expo Router conserva la propiedad de la navegación. Un contexto pequeño carga y guarda un documento local mediante AsyncStorage; las pantallas usan sus operaciones y no acceden directamente al almacenamiento. Validación y cálculo de fechas e importes viven en funciones puras comprobables con Node.

**Tech Stack:** Expo SDK 54, React Native 0.81, TypeScript, Expo Router 6, Phosphor, react-native-svg y AsyncStorage compatibles con SDK 54.

**Spec:** `docs/superpowers/specs/2026-10-13-my-hub-design.md` — implementar únicamente la primera entrega.

## Global Constraints

- Mantener Expo SDK 54 y Expo Go del usuario; comprobar en Samsung por USB.
- Español, sin emojis, Phosphor de línea y duotone con importaciones individuales.
- Claro: fondo #FAF7F2, superficie #FFFDFA, texto #302936, acento #705080, salvia #DCE8DA.
- Oscuro: fondo #19161D, superficie #25212B, texto #F5EFF7, acento #C4A7DC, salvia #33463B.
- Tema del sistema inicialmente; elección persistente sistema/claro/oscuro.
- Calendario privado por defecto; no simular publicación, grupos, invitaciones ni avisos.
- EUR; importes en céntimos; fechas locales YYYY-MM-DD.
- No sobrescribir datos ilegibles ni cerrar formularios cuando falla el guardado.
- Conservar los cambios previos de SDK 54; commits solo de los archivos de cada tarea.
- Leer las páginas versionadas de Expo antes de usar sus API. Instalar mediante `npx expo install`.

## Review Focus

1. JSON válido pero con estructura inválida: bloquear escrituras y ofrecer reintento, sin vaciar los datos.
2. Dos guardados rápidos: serializarlos para que el último cambio no se pierda.
3. Fecha inexistente o cambio de año/mes: rechazar fechas inválidas y conservar el día local.
4. Importe con coma o decimales excesivos: aceptar 12,50 y rechazar importes ambiguos, negativos o superiores a dos decimales.
5. Borrar una recomendación guardada: quitar también su referencia de biblioteca, sin afectar otras entradas.

## Archivos y responsabilidades

- `src/features/hub/model.ts`: tipos, estado inicial, validación, fechas e importes.
- `src/features/hub/storage.ts`: lectura validada y escritura serializada del documento local.
- `src/features/hub/provider.tsx`: estado cargado, acciones asíncronas y errores.
- `src/constants/theme.ts`, `src/hooks/use-theme.ts`, `src/hooks/use-color-scheme.ts`, `src/hooks/use-color-scheme.web.ts`: tema elegido y tokens; conservar contratos necesarios de componentes reutilizados.
- `src/components/hub-ui.tsx`: cabecera, botón, campo y estado vacío; únicamente elementos repetidos.
- `src/components/recommendation-card.tsx`: tarjeta, portada y acciones.
- `src/app/_layout.tsx`: proveedores y Stack; `src/app/(tabs)/_layout.tsx`: Tabs con Phosphor.
- `src/app/(tabs)/index.tsx`, `library.tsx`, `calendar.tsx`, `subscriptions.tsx`: cuatro pantallas principales.
- `src/app/recommendation.tsx`, `event.tsx`, `subscription.tsx`, `settings.tsx`: formularios y ajustes.
- `tests/hub-model.test.cjs`, `tests/hub-storage.test.cjs`: pruebas Node sin añadir framework.
- `PRODUCT.md`, `DESIGN.md`, `README.md`: contexto aprobado, reglas visuales y uso local/USB.

## Task 1: Datos locales y persistencia segura

**Interfaces:**
- `Category = 'book' | 'movie' | 'series'`; `ThemePreference = 'system' | 'light' | 'dark'`.
- `Recommendation = { id: string; title: string; category: Category; opinion: string; rating: number; coverUrl: string; createdAt: string }`.
- `SavedItem = { recommendationId: string; status: 'pending' | 'finished' }`.
- `CalendarEvent = { id: string; title: string; category: Category; date: string }`; todos locales y privados en esta entrega.
- `Subscription = { id: string; name: string; amountCents: number; frequency: 'monthly' | 'yearly'; nextDate: string }`.
- `HubState = { version: 1; recommendations: Recommendation[]; saved: SavedItem[]; events: CalendarEvent[]; subscriptions: Subscription[]; preferences: { name: string; theme: ThemePreference } }`.
- `parseAmountCents(input: string): number | null`, `isLocalDate(input: string): boolean`, `decodeState(raw: string | null): HubState`, `removeRecommendation(state: HubState, id: string): HubState`.
- `loadState(): Promise<HubState>`, `saveState(state: HubState): Promise<void>` usan clave `my-hub:v1`; nunca escribir tras una carga fallida.
- `useHub()` devuelve `{ state, loading, error, retry, update }`; `update(change: (previous: HubState) => HubState): Promise<void>` serializa cambios y publica estado únicamente tras guardado satisfactorio.

- [ ] Leer documentación SDK 54 de AsyncStorage y react-native-svg y compatibilidad de Phosphor. Instalar con `npx expo install @react-native-async-storage/async-storage react-native-svg phosphor-react-native`.
- [ ] Escribir pruebas antes del modelo. Afirmar: `parseAmountCents('12,50') === 1250`, `'12.50' === 1250`, `'-2'`, `'1.234'`, vacío e infinito devuelven null; fecha 2028-02-29 válida y 2026-02-29 inválida; `decodeState(null)` vacío y `decodeState('{}')` lanza; eliminación limpia solo la referencia relacionada.
- [ ] Ejecutar `node --experimental-strip-types --test tests/hub-model.test.cjs`; confirmar fallo por módulo o función ausente.
- [ ] Implementar tipos y funciones puras sin enums. Mantener fechas de día como texto; usar constructor local solo para mostrar o calcular la cuadrícula.
- [ ] Añadir pruebas de almacenamiento con un adaptador falso limitado a getItem/setItem: dos cambios consecutivos conservan ambos, fallo de escritura se propaga, lectura corrupta no llama setItem. Implementar cola y provider con reintento y estado de error.
- [ ] Ejecutar ambos archivos de pruebas con Node; confirmar resultados correctos y sin escrituras tras error.
- [ ] Registrar únicamente archivos de tarea 1 y dependencias en un commit.

## Task 2: Identidad, navegación y ajustes

**Consumes:** `useHub`, `ThemePreference` y preferencias de tarea 1.
**Produces:** cuatro pestañas, ruta de ajustes y componentes compartidos. `useTheme()` devuelve los tokens del tema efectivo, respetando la preferencia persistida.

- [ ] Ejecutar el contexto de Impeccable una vez; leer sus referencias de trabajo nuevo, contexto de producto y calidad antes de editar UI. Crear PRODUCT.md y DESIGN.md a partir de la especificación aprobada, sin añadir promesas.
- [ ] Escribir y ejecutar una prueba de resolución de tema: system+dark devuelve dark; light+dark devuelve light; system+null devuelve light. Implementar esa función junto al modelo y comprobarla.
- [ ] Reemplazar layout raíz por Stack con provider; añadir `(tabs)` con cuatro rutas. Mover/reemplazar Inicio, eliminar la ruta de ejemplo Explore y retirar los componentes de plantilla que dejen de usarse. No mantener rutas duplicadas para `/`.
- [ ] Implementar tokens y componentes repetidos con áreas seguras, texto escalable, etiquetas de accesibilidad y controles de al menos 48 puntos. Usar Phosphor importado por icono según la versión instalada.
- [ ] Implementar ajustes de nombre y tema; guardar error sin cerrar la pantalla. Señalar en Inicio «En este dispositivo» y explicar que compartir con amigos llegará después.
- [ ] Verificar navegación y los tres ajustes de tema, además de reinicio en Samsung. Ejecutar lint y typecheck; commit limitado a esta tarea.

## Task 3: Recomendaciones y biblioteca

**Consumes:** `Recommendation`, `SavedItem`, `useHub().update`, componentes y tema.
**Produces:** Inicio, Biblioteca y `/recommendation?id=<id>` para editar; sin id crea una recomendación.

- [ ] Añadir pruebas de validación: título vacío, categoría desconocida, opinión vacía, nota fuera de 1–5 y URL no HTTP/HTTPS se rechazan; portada vacía válida. Ejecutarlas en rojo y luego implementar validación en modelo.
- [ ] Implementar tarjeta con portada opcional y fallback visible cuando falle; categoría, nombre del perfil local, opinión y nota. Inicio usa filtros y acción para recomendar; orden de más reciente a más antiguo.
- [ ] Implementar formulario con previsualización, campos accesibles, teclado desplazable, errores junto a campos y bloqueo de doble envío. Guardar mediante update y cerrar solo tras éxito.
- [ ] Añadir edición/eliminación con confirmación. Implementar guardado como pendiente, cambio a terminado y retirada de Biblioteca; evitar referencias duplicadas.
- [ ] Probar en el móvil creación, filtros, edición, guardado, cambio de estado, borrado y reinicio. Con almacenamiento simulado fallido comprobar que el formulario conserva entradas. Lint, typecheck, pruebas y commit.

## Task 4: Calendario privado

**Consumes:** `CalendarEvent`, `isLocalDate`, `useHub().update` y UI compartida.
**Produces:** cuadrícula mensual, agenda del día y `/event?id=<id>`.

- [ ] Añadir pruebas para primer/último mes del año, febrero bisiesto y conversión entrada DD/MM/YYYY a fecha local. Afirmar que la fecha no cambia de día en diferentes zonas horarias. Ejecutarlas en rojo e implementar funciones de calendario en modelo.
- [ ] Implementar navegación mensual, selección de día, indicadores de eventos y agenda. Mostrar «Calendario privado»; compartir figura como pendiente con explicación, sin activar acceso público.
- [ ] Implementar formulario de título, categoría y fecha; edición y borrado confirmado. Mantener el día seleccionado tras guardar y mostrar estados vacíos útiles.
- [ ] Comprobar cambio diciembre/enero, varias entradas en un día, fechas inválidas y persistencia al reiniciar. Lint, typecheck, pruebas y commit.

## Task 5: Suscripciones personales

**Consumes:** `Subscription`, `parseAmountCents`, `isLocalDate`, persistencia y tema.
**Produces:** lista por próxima renovación y `/subscription?id=<id>`.

- [ ] Añadir pruebas: estimación mensual de 12000 céntimos/año es 1000; junto a 999/mes suma 1999; importe cero válido; valores negativos y fechas inválidas rechazados. Ejecutarlas en rojo e implementar cálculo y validación en modelo.
- [ ] Implementar lista, coste, frecuencia, próxima fecha y «Estimación mensual» en EUR. Mantener la fecha informada; no avanzar cobros automáticamente ni anunciar avisos activos.
- [ ] Implementar formulario con nombre, importe, frecuencia y fecha; errores locales, edición, borrado confirmado y privacidad visible. Guardar solo tras validación.
- [ ] Probar importes con coma, frecuencia anual, teclado, edición, borrado y reinicio. Lint, typecheck, pruebas y commit.

## Task 6: Comprobación y entrega en Samsung

- [ ] Actualizar README: alcance local, SDK 54, comandos reales y USB usando el puerto que tenga Metro. No tocar autorizaciones del dispositivo ni actualizar Expo Go.
- [ ] Ejecutar `node --experimental-strip-types --test tests/hub-model.test.cjs tests/hub-storage.test.cjs`, `npx expo lint`, `npx tsc --noEmit` y `npx expo install --check`. Todos deben terminar sin errores.
- [ ] Abrir por USB con ADB reverse y enlace `exp://127.0.0.1:<puerto>`. Confirmar en el dispositivo cada flujo de las tareas 2–5 y persistencia tras forzar cierre/reabrir.
- [ ] Capturar Inicio, Calendario, Suscripciones y formulario con teclado en ambos temas en una ronda. Corregir en un lote los defectos observados y hacer como máximo una ronda adicional.
- [ ] Revisar diff completo, privacidad, validación, escrituras y ausencia de funciones simuladas. Un revisor independiente únicamente si el método elegido lo autoriza.
- [ ] Informar resultados, pantallas disponibles y límites: sin grupo sincronizado, invitaciones ni notificaciones todavía. Detenerse al pasar la aceptación; no iniciar servicios externos.
