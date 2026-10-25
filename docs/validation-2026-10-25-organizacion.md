# Organización de vistas

Revisión estática de todas las pantallas: Inicio, Wishlist/Mis descubrimientos, Calendario, Amigas/Mis grupos, Mi cuenta, acceso y recuperación, recomendación/evento, deseo, canción, valoración, descubrimiento con comentarios, espacio del grupo, administración del grupo y publicación de plan/regalo. Navegación y rutas existentes conservadas.

Cambios:
- Inicio: elimina accesos que duplicaban las pestañas; muestra la canción solo si existe. Su edición/creación queda accesible desde Mi cuenta.
- Wishlist: colección y estado primero; búsqueda y filtros agrupados con menor separación. Categoría y nota se despliegan bajo Filtros, con indicador de filtros activos y acción Limpiar. Conserva selección y búsquedas.
- Calendario personal: mes y agenda antes de accesos sociales; próximo evento dentro de la agenda y disponibilidad de grupo en una sección final.
- Disponibilidad compartida: calendario y día seleccionado antes de resúmenes de coincidencias.
- Grupos: pestañas y contenido antes de administración; miembros y actualización manual en Opciones del grupo. Errores conservan reintento visible. Reserva, entrega y retirada en Gestionar publicación, con confirmación de retirada conservada; asistencia e interés siguen visibles.
- Formularios: jerarquía de títulos más contenida, título antes de foto y fecha del plan antes de descripción. Conserva validaciones y selectores.
- Cabecera compartida: las vistas con Volver muestran sus subtítulos y acciones, y anuncian el título como encabezado. Pestañas permiten salto de línea para texto ampliado.

Las pantallas de acceso, recuperación, detalle, valoración, canción y administración de grupo se revisaron y mantienen su estructura salvo las mejoras compartidas: no se añaden pasos ni se ocultan acciones necesarias.

Verificación: 103 pruebas Node pasan; lint y TypeScript sin errores. Nuevas pruebas de filtros, menús de gestión y cabeceras, junto a regresión del teclado. No se modificó Supabase ni se subió al PR. La revisión visual en un teléfono físico sigue pendiente.
