# Cuenta y organización de grupos — verificación

Implementado: perfil y cuenta reunidos en settings, correo y cierre de sesión en la misma pantalla; account redirige sesiones existentes a settings sin cambiar el destino de un acceso nuevo. Coincidencias por miembros únicos y franjas, mejores tres del mes excluyendo fechas pasadas; acceso al formulario de plan con fecha inicial válida. Regalos con reserva por destinataria y revisión esperada. Consulta automática cada 20 segundos mientras el grupo está enfocado y la app activa, con guardados en pausa y sin consultas periódicas solapadas. Conserva las páginas cargadas y reutiliza firmas de fotos vigentes.

Verificado:
- 98 pruebas Node pasan, incluidas navegación, coincidencias, reservas y ciclo del refresco.
- Expo lint y TypeScript sin errores.
- Nueve archivos SQL pasan en PostgreSQL 17 aislado con Auth y Storage mínimos; fixtures revertidos.
- Migración 009 aplicada al proyecto remoto configurado, sin fixtures personales ni cambios en publicaciones existentes.
- Exportación Android con bytecode Hermes generada.
- ADB disponible, pero `adb devices` no muestra ningún teléfono conectado: no se verificó el aspecto ni el teclado en un móvil físico.

Actualizar el cliente de Expo antes de cambiar estados de regalos: desde 009 los cambios deben usar `set_group_gift_state`, no un UPDATE directo. El refresco es periódico, no una suscripción Realtime ni notificaciones. No se subieron estos cambios al PR.
