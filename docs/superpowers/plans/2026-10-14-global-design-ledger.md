# Ejecución del diseño global

- Base: 662b113 más cambios locales de login y wishlist del usuario; preservarlos.
- Ejecución inline autorizada. Se mantiene checkout actual para conservar Metro/configuración y no duplicar el entorno.
- Fuentes estáticas oficiales descargadas desde expo/google-fonts, licencias OFL desde google/fonts. Sin nuevas dependencias.
- La revisión de la API instalada confirma tabBarPosition left/bottom en @react-navigation/bottom-tabs.
- Ruling: calendario lateral desde 1024 y suscripciones desde 1200; a 900 las columnas estrechas perjudican el calendario y los importes. Navegación lateral sí empieza en 900.
- Ruling: modal accesible compartido para acciones en web y nativo, usando la trampa de foco existente de React Native Web; no añadir un paquete de popovers.
- Ruling: fuentes y escala aplicadas a través de Copy y Field para no propagar reemplazos de estilo por cada pantalla. Archivos existentes de perfil/avatar se conservan para evitar dependencia circular.
- Ruling: tarjetas compactas de wishlist admiten mínimo 144 puntos en móvil para conservar las dos columnas aprobadas en Samsung de 360 puntos; escritorio conserva mínimo 160. Una columna con texto ampliado.
- Exportación web reprodujo un fallo previo de cuentas durante SSR (AsyncStorage intenta leer window). Cliente de cuentas se omite solo durante render de servidor; exportación web posterior correcta.
- Revisión independiente detectó animación que podía empezar tras desmontaje; ahora el resultado pendiente comprueba mounted antes de animar o actualizar estado.
- Interacciones web con fixtures aislados: destinos laterales 52 puntos, Escape cierra y foco restaurado después de onDismiss; ruta /library conservada al pasar de 1440 a 390. Movimiento reducido emulado. Ninguna cuenta real usada por estas pruebas.
- Corrección de cálculo: redondear puntos lógicos antes de breakpoints para que 359.9999 no pierda las dos columnas de una ventana de 360. Prueba observada fallar y pasar.
- Ruling: sidebar usa tabBar personalizado sobre el mismo estado/navegador Tabs, evitando el colapso del destino de pulsación en BottomTabBar. Pestañas móviles mantienen BottomTabBar, con flex 1.
- Evidencia: capturas web a 1024/1440, claro/oscuro, imágenes reales y fixtures sin imagen; captura Samsung. Pruebas Node 23/23, lint y TypeScript. Exportaciones Android y web correctas.
- Pendiente: iOS, foco con lector de pantalla nativo y verificación exhaustiva de texto ampliado en hardware. No se cambió ninguna cuenta ni configuración del dispositivo para estas pruebas.
- Fuentes y mejoras implementadas localmente; no se publicó un sitio ni se modificó el esquema de Supabase.
