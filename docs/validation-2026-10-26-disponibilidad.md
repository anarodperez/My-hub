# Disponibilidad negativa

Cada franja permite Puedo, No puedo o Sin indicar. Los miembros ven ambas respuestas, pero solo Puedo cuenta en el calendario y las coincidencias. Las citas personales siguen privadas.

La migración 010 conserva todas las disponibilidades existentes. Las respuestas negativas se guardan aparte para que los clientes anteriores no las interpreten como positivas. El RPC deriva la persona de la sesión, valida pertenencia y guarda los cambios de forma atómica. Los triggers impiden respuestas contradictorias incluso cuando un cliente anterior marca disponibilidad.

Validación: 103 pruebas Node, lint y TypeScript correctos. Migración 010 y pruebas group_unavailability.sql y group_social.sql correctas en PostgreSQL aislado, con fixtures revertidos. Migración aplicada al proyecto Supabase configurado sin insertar fixtures.

Rollback: volver al cliente anterior sin eliminar tablas, funciones ni triggers; las respuestas negativas se conservan, pero ese cliente no las muestra. No retirar la migración mientras haya clientes nuevos en uso. Pendiente revisión en teléfonos físicos y prueba simultánea desde dos dispositivos.
