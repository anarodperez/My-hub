# Regalo, precio fijo y subasta

Autorizado: tres modalidades al publicar, regalo por defecto y subasta ganada automáticamente por la puja más alta al finalizar. Se reutilizan plazo, Cron, permisos de grupo y estados existentes.

Decisiones: euros en céntimos enteros, de 0,01 a 999.999,99 €. Subida mínima de 1 € respecto a la mayor puja vigente; primera oferta desde el precio de salida. Solo miembros actuales, nunca la propietaria. Sin retirada de pujas. Reintentos iguales son idempotentes. Precio fijo sin fecha de cierre: primera reserva confirmada gana. Pago y entrega acordados entre amigas, sin cobro integrado.

- [x] Tests de importes, validación y RPC.
- [x] Migración aditiva: modalidad, precio, pujas con RLS/RPC y resolución bajo bloqueo del artículo; conservar resultado e importe de cierre.
- [x] Formulario y panel de precio/subasta con confirmación antes de reservar o pujar.
- [x] Pruebas SQL aisladas, revisión, typecheck, lint y compilación; activar y comprobar servidor.

Riesgos: ofertas simultáneas, cierre con cliente desconectado, miembro expulsado, cuenta borrada, importes inválidos y preservación de regalos antiguos. No modificar sorteos existentes ni añadir pagos, envíos o chat.
