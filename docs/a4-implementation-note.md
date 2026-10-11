# A.4 — punto de continuidad de implementación y recuperación

**Fecha de revisión:** 2026-10-11  
**Rama:** `security/a4-idempotent-completion`  
**PR:** [#5 — signed dispatch and atomic invocation lifecycle](https://github.com/AngelJavier5115/arkhe-dashboard/pull/5)  
**Estado:** Draft; no autorizado para fusión ni producción.

Este documento registra la decisión y la evidencia de continuidad. No sustituye las pruebas ni autoriza desplegar servicios, configurar secretos o aplicar migraciones.

## 1. Invariantes ya implementados en la rama

- La identidad humana para las acciones de gobierno se deriva de la sesión WebAuthn verificada por el servidor; el cuerpo del cliente no decide quién es Ángel.
- La finalización de una convocatoria inserta la intervención y cambia el estado de la convocatoria en una transacción, con idempotencia para la misma carga y conflicto si cambia la carga.
- El despacho Core → investigador usa un sobre Ed25519 ligado al investigador destinatario, timestamp, UUID único y cuerpo serializado exacto.
- La reclamación del despacho está ligada al investigador autenticado y es de un solo uso. Los destinos están restringidos a una URL HTTPS exacta por investigador, en rutas de Preview; los servicios Render activos quedan fuera de la allowlist.
- La API no reintenta automáticamente un envío cuyo resultado de red sea ambiguo.

## 2. Decisión de recuperación para este prototipo

Los receptores de Atlas, Aletheia y Tekton reclaman el despacho y responden HTTP 202 antes de iniciar el trabajo mediante `setImmediate`. No es una cola durable: una caída del proceso puede dejar una convocatoria reclamada sin una intervención resultante.

Para esta fase, la opción de menor complejidad y más conservadora es **reconciliación humana obligatoria**, no reintento automático ni un trabajador durable nuevo. Esto no significa que el trabajo se recupere solo: exige revisar el estado y volver a autorizar conscientemente la ejecución.

La migración propuesta implementa estas barreras:

1. Sólo el gobernador humano autenticado que originó la convocatoria puede reconciliarla.
2. Deben haber pasado al menos cinco minutos desde la reclamación.
3. La convocatoria debe seguir en estado `enviada` o `pendiente`, y no debe existir una intervención asociada.
4. Se exige una nota de auditoría de entre 10 y 500 caracteres.
5. La reconciliación revoca el despacho antiguo. Una finalización tardía que presente ese UUID revocado debe fallar.
6. Para volver a ejecutar, Ángel debe emitir un despacho nuevo de forma explícita. No hay reintento automático.

## 3. Evidencia de CI y límites

La CI del head revisado `177b11d32fb3fa578b6f1032f4d1bb3bdcafaca2` terminó en verde en [run 38150345260](https://github.com/AngelJavier5115/arkhe-dashboard/actions/runs/38150345260). La ejecución pasó el build, las pruebas Node y el script PostgreSQL contra una base desechable.

El script `tests/a4-completion-rpc.sh` cubre el ciclo de recuperación: despacho reclamado envejecido, reconciliación humana, rechazo de una finalización tardía con el despacho revocado y finalización con un despacho nuevo. `tests/a4-dispatch-boundary.test.mjs` comprueba los límites de autorización y de destinatario.

**Esta evidencia prueba las reglas de base de datos y las barreras de código en pruebas aisladas; no demuestra todavía recuperación E2E tras una caída real del proceso ni cierra A.4.**

## 4. Trabajo que sigue bloqueando el cierre de A.4

- Preparar un entorno de Preview/staging separado de los tres servicios Render activos y un destino de base de datos aislado.
- Revisar la configuración por metadatos, sin mostrar valores secretos; crear y custodiar claves separadas fuera del repositorio y del navegador.
- Realizar la inscripción real de una passkey en Preview, autenticar, inscribir y verificar una segunda passkey de recuperación, y probar revocación sin permitir revocar la última credencial activa.
- Ejecutar la suite adversarial en runtime: sesión ausente o vencida, actor falsificado, origen/RP ID incorrecto, desafío vencido o repetido, credencial desconocida o revocada y reautenticación caducada.
- Ejecutar un despacho firmado en el entorno aislado; comprobar una única reclamación, una única intervención, atribución correcta y ausencia de escrituras colaterales.
- Forzar un caso controlado de despacho reclamado sin resultado; esperar el umbral, reconciliar con nota humana, demostrar que el despacho viejo ya no puede completar y que sólo un nuevo despacho humano puede hacerlo.
- Revisar credenciales, sesiones, desafíos y logs; retirar cualquier bootstrap temporal al terminar.

## 5. Límites que permanecen vigentes

- Las dos migraciones A.4 de esta rama (`20261011053000_signed_invocation_dispatch.sql` y `20261011054000_complete_invocation_atomically.sql`) son propuestas de revisión; no aplicarlas al Supabase compartido.
- La tabla `public.core_invocation_dispatches` no existe todavía en la base compartida, según la comprobación de solo lectura del 2026-10-11.
- Las URLs `atlas-preview`, `aletheia-preview` y `tekton-preview` son nombres previstos, no servicios confirmados. No se han configurado las claves/URLs de despacho de A.4 en Preview/Render.
- Los PR firmados de Atlas (#3), Aletheia (#2) y Tekton (#2) también siguen Draft. Sus CI están verdes, pero sus servicios activos no se modificaron.
- No fusionar, activar producción, cambiar secretos ni desplegar bots productivos como parte de este checkpoint.

**Regla de cierre:** A.4 sólo podrá declararse cerrado después de las pruebas E2E de WebAuthn y despacho en infraestructura aislada, con evidencia reproducible y revisión humana final. Una CI verde, por sí sola, no basta.
