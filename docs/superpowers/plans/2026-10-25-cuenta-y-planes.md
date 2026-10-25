# Cuenta y organización de grupos

Alcance aceptado: unificar perfil/cuenta, destacar coincidencias de disponibilidad, proponer planes desde una fecha, reservar regalos indicando destinataria, refrescar grupos automáticamente y revisar Android si existe dispositivo conectado.

- Cuenta: `/settings` reúne foto, nombre, correo, apariencia, grupos y cierre de sesión. `/account` conserva acceso y recuperación; redirige las sesiones existentes a settings.
- Coincidencias: contar personas únicas y miembros actuales por día/franja, excluir pasado, ordenar por participación y fecha; mostrar las tres mejores y permitir seleccionar día y proponer plan con fecha.
- Regalos: ampliar estado a open/reserved/delivered; RPC de propietario con revisión esperada, destinataria miembro e interesada. No reservar automáticamente al pulsar Me interesa. Mantener RLS y datos existentes.
- Actualización: consulta automática cada 20 segundos, solo con pantalla enfocada y app activa; sin peticiones superpuestas ni reinicio durante guardados. No instalar dependencias.
- Verificación: pruebas de coincidencias, fecha inicial y repositorio; SQL aislado para reserva y conflictos; lint, TypeScript y pruebas Node. Revisar disponibilidad de Android, sin declarar comprobación visual si no existe un dispositivo utilizable.

No se suben estos cambios al PR sin nueva petición. Se preservan los ajustes visuales locales anteriores.

Estado: implementación completada y migración 009 aplicada al remoto. 98 pruebas Node, nueve archivos SQL aislados, lint, TypeScript y exportación Android verificados. Revisión física pendiente: ADB no detecta dispositivos. Evidencia en `docs/validation-2026-10-25-cuenta-planes.md`.
