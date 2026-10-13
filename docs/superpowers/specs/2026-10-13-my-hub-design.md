# My Hub: diseño de producto y primera entrega

## Objetivo acordado

Aplicación móvil en español para recomendar libros, películas y series entre amigos. Todos los miembros pueden publicar. Los grupos son privados y se accede por invitación. Cada persona organiza sus estrenos y suscripciones.

Se mantiene Expo SDK 54 y Expo Go del usuario. La prueba principal se realiza en el Samsung conectado por USB. Navegación con Expo Router, reutilizando la estructura de `src/app`, componentes y hooks existentes.

## Aspecto

Phosphor Icons, sin emojis. Iconos de línea en navegación y duotone en categorías; importar únicamente los iconos utilizados. Comprobar compatibilidad con SDK 54 antes de instalar. Portadas protagonistas, composición limpia, etiquetas legibles y botones cómodos para usar con una mano.

| Elemento | Claro | Oscuro |
| --- | --- | --- |
| Fondo | #FAF7F2 | #19161D |
| Superficie | #FFFDFA | #25212B |
| Texto | #302936 | #F5EFF7 |
| Acento | #705080 | #C4A7DC |
| Salvia decorativa | #DCE8DA | #33463B |

El tema sigue al sistema inicialmente. Ajustes permite seleccionar sistema, claro u oscuro y recuerda la preferencia. Los tonos suaves no se usan como texto de bajo contraste. El estado seleccionado se comunica mediante forma, etiqueta y color.

## Pantallas y acciones

1. **Inicio:** recomendaciones del grupo, autor, categoría, título, opinión y valoración. Filtros Todos, Libros, Películas y Series. Acción visible para publicar y guardar una recomendación como pendiente.
2. **Publicar:** título obligatorio, categoría, opinión, nota de 1 a 5 y URL de portada opcional. Previsualización y errores de validación junto al campo. El autor puede editar o eliminar su publicación.
3. **Mi biblioteca:** recomendaciones guardadas; marcar pendiente o terminado y quitar de la biblioteca.
4. **Calendario:** mes, día seleccionado y lista de eventos. Añadir título, categoría y fecha. Editar o eliminar eventos propios. Son privados por defecto; compartir un evento concreto con el grupo no comparte el resto del calendario.
5. **Suscripciones:** nombre, importe, moneda EUR inicialmente, frecuencia mensual o anual y próxima fecha de cobro. Añadir, editar y eliminar. No se conectan bancos ni se realizan pagos. No mostrar un total mensual que mezcle importes anuales sin convertirlos y etiquetarlos como estimación.
6. **Ajustes:** nombre visible, tema y, cuando exista servicio compartido, cuenta y grupo.

La navegación inferior contiene Inicio, Biblioteca, Calendario y Suscripciones. Ajustes se abre desde la cabecera. Publicar se abre desde Inicio.

## Entregas y alternativas

**Propuesta recomendada:** empezar por una versión local funcional en el móvil y conectar después las cuentas y el grupo. Permite revisar diseño y uso antes de contratar o configurar servicios externos. La primera entrega no promete sincronización, invitaciones ni avisos que aún no existen.

**Alternativa:** implementar cuentas y almacenamiento compartido desde el principio. Permite probar inmediatamente con varios amigos, pero exige configurar un servicio externo y sus permisos antes de utilizar la app.

### Primera entrega: interfaz funcional y datos locales

Reemplazar la plantilla de Expo por las pantallas descritas. Recomendaciones propias, pendientes, eventos, suscripciones y preferencias se guardan en el dispositivo y sobreviven al reinicio. Si se incluyen ejemplos visuales, se identifican como ejemplos y no como actividad real de amigos. El inicio muestra claramente que todavía no está conectado al grupo.

La opción de compartir eventos puede mostrarse como función pendiente, pero no debe presentar un evento como publicado sin haberlo enviado. No mostrar un formulario de acceso o un enlace de invitación que finjan funcionar.

### Segunda entrega: compartir con amigos

Propuesta de servicio: Supabase para autenticación y base de datos, pendiente de elegir y configurar antes de esta entrega. Cuenta con correo y contraseña, invitaciones, membresías y publicaciones compartidas. El backend aplica permisos: solo miembros del grupo leen sus recomendaciones y eventos compartidos; solo el propietario accede a sus suscripciones, biblioteca y eventos privados. Ocultar contenido en pantalla no sustituye estos permisos.

La migración de datos locales a cuenta deberá ser explícita, recuperable y evitar duplicados. Las credenciales administrativas nunca estarán en la app. No crear servicios externos ni publicar datos durante la primera entrega.

### Entrega posterior: recordatorios

Avisos locales configurables para estrenos y renovaciones, con permiso solicitado al activar la función. No simular notificaciones. Verificar límites de SDK 54 y Expo Go antes de implementarlos.

## Datos y errores

Separar datos y persistencia de las pantallas. Modelos mínimos: recomendación, elemento guardado, evento, suscripción y preferencia de tema. Las fechas de calendario se conservan como fechas locales para evitar cambios de día por zona horaria. Los importes se validan y almacenan en céntimos.

Validar entradas vacías, fechas inválidas, importes negativos y URL de portada no HTTP/HTTPS. Una portada ausente o fallida usa un icono de categoría. Un fallo al guardar muestra un mensaje y conserva el formulario; no reemplazar datos ilegibles por una colección vacía silenciosamente. Pedir confirmación para eliminar y mantener estados vacíos útiles.

## Verificación y final de la primera entrega

- No queda contenido de bienvenida de Expo en las rutas de producto.
- Se puede crear, editar y eliminar una recomendación, evento y suscripción; guardar un pendiente y cambiar su estado.
- Los datos y el tema permanecen al cerrar y abrir la app.
- La privacidad propuesta y las funciones pendientes se comunican con veracidad.
- Navegación, formularios y ambos temas se comprueban en el Samsung por USB; teclado y áreas seguras no tapan controles.
- Pruebas pequeñas para validación de importes y fechas y recuperación de almacenamiento.
- Pasan `npx expo lint`, `npx tsc --noEmit` y comprobación de dependencias SDK 54.

Fuera de esta primera entrega: chat, comentarios, búsqueda automática en catálogos, integración bancaria, cobros y publicación en tiendas. La primera entrega termina cuando los flujos locales anteriores funcionan y se ha revisado su aspecto en el móvil.
