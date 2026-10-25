# Ejecución de cuentas

- Base: 0a27e55. Configuración local presente; no se imprime ni versiona la clave.
- Ruling: trabajar en la rama de función actual para conservar la configuración y el servidor del usuario; no crear un checkout adicional sin consentimiento.
- Ruling: no hay acceso administrativo al proyecto. Preparar migración y prueba SQL; no simular su ejecución ni desplegar mediante la clave pública.
- Ruling: contraseña mínima local de seis caracteres como suelo; Supabase aplica la política real del proyecto. Documentar que políticas más estrictas deben reflejarse en el formulario.
- Entrega limitada a cuentas; datos culturales siguen locales hasta las entregas posteriores del diseño.
- Verificación pública real: Auth settings HTTP 200, email activo y confirmación requerida; perfiles HTTP 404/PGRST205, migración aún pendiente en panel.
- Revisión: recuperación con cliente temporal sin persistencia, separada de sesión normal. Al reiniciar o salir no queda autenticación de recuperación en almacenamiento; tras cambiar contraseña se requiere acceso normal. Sustituye el estado de recuperación propuesto en el proveedor.
- Tests config/sesión/validación: observados fallar por módulos ausentes y después pasar.
- Revisión independiente final: sin hallazgos importantes después de separar la recuperación y ampliar pruebas de inserción SQL.
- Verificación local: 20/20 tests, lint sin advertencias, TypeScript y exportación Android/Hermes correctos. El primer intento de Hermes estuvo bloqueado por permisos y pasó al ejecutarlo con acceso adecuado.
- Pendiente externo: aplicar migración, probar SQL en proyecto aislado, configurar plantillas y entrega de correo, validar registro/recuperación con cuentas reales y Samsung/iOS.
- Ruling: agrupar los cambios de esta primera entrega en un único commit porque comparten la integración de cuentas; no afirmar que están desplegados.
