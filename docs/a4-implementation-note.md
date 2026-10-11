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


## 6. Staging gratuito creado y probado — 2026-10-11

Se creó el proyecto separado `arkhe-a4-staging` en la organización `Arkhe`:

- Project ref: `axfqtovorxohkpkkgcul`
- Región: `us-west-1`
- Estado observado: `ACTIVE_HEALTHY`
- Coste devuelto por la herramienta de facturación para el proyecto Free: `0 USD/mes` (el plan Free puede pausar proyectos inactivos; revisar el panel de uso).
- La base nueva comenzó vacía. No se copiaron datos de `arkhe-core`, nodos reales ni credenciales.

El archivo `tests/staging/a4-staging-foundation.sql` reproduce el contrato mínimo de tablas y funciones de Core requerido por A.4 y crea sólo fixtures sintéticas. Está marcado STAGING-ONLY y no pertenece a `supabase/migrations`; no debe aplicarse a la base compartida.

### Migraciones aplicadas en staging

La historia de `arkhe-a4-staging` registra 11 pasos iniciales de A.4 y cinco pasos añadidos para el Dashboard árbol/red:

- `a4_staging_foundation`
- `create_core_request_nonces_staging`
- `create_human_auth_tables_staging`
- `align_human_auth_principal_staging`
- `one_active_webauthn_challenge_staging`
- `bound_webauthn_attempts_staging`
- `recent_human_reauthentication_staging`
- `require_challenge_investigator_staging`
- `guard_human_credential_revocation_staging`
- `signed_invocation_dispatch_staging`
- `complete_invocation_atomically_staging`

- `dashboard_design_empty_modules`
- `semantic_relations_schema`
- `semantic_relation_dml_lock`
- `semantic_relation_write_api`
- `semantic_relation_dml_relock`

Auditoría posterior: las RPC de issue, claim, completion y reconciliation existen; 4 investigadores sintéticos, 4 participaciones de staging y 3 perfiles de bot. No hay credenciales, sesiones ni challenges reales registrados.

### Prueba ejecutada directamente en la base aislada

Una prueba SQL dentro de `arkhe-a4-staging` verificó:

1. despacho emitido y reclamado;
2. finalización atómica exitosa;
3. repetición exacta idempotente;
4. reconciliación de un despacho reclamado envejecido;
5. rechazo de finalización tardía del despacho revocado;
6. nueva finalización con un despacho nuevo autorizado.

La prueba eliminó sus rondas, convocatorias, despachos e intervenciones sintéticas. Consulta posterior: cero filas residuales del test. Esto valida las RPC contra el Postgres alojado de staging, pero no es todavía una prueba HTTP/E2E con una passkey real ni con un bot desplegado.

### Preview de Vercel — configuración pública

Se añadieron exclusivamente al target Preview de la rama `security/a4-idempotent-completion`:

- `VITE_SUPABASE_URL` apuntando al proyecto de staging;
- `VITE_SUPABASE_KEY` con la clave pública/publishable;
- `ARKHE_AUTH_RP_ID` y `ARKHE_AUTH_ORIGIN` para el alias estable de rama;
- `ARKHE_AUTH_RP_NAME`.

No se creó ninguna variable de Production ni se tocaron variables de los bots activos.

### Configuración de Preview para WebAuthn E2E — estado 2026-10-11

- `SUPABASE_SERVICE_ROLE_KEY` está configurada como variable sensible, sólo para Preview y la rama `security/a4-idempotent-completion`. Su valor corresponde a la clave secreta del proyecto aislado; no fue leído ni registrado en documentación.
- `ARKHE_AUTH_BOOTSTRAP_SECRET` está configurada como variable sensible con el mismo alcance. Ángel conserva su valor en su gestor de contraseñas; no se comparte por chat.
- `ARKHE_AUTH_BOOTSTRAP_EXPIRES_AT` está configurada para `2026-10-11T19:00:00.000Z` (13:00 en America/Mexico_City ese día). Si la ventana caduca antes del registro, hay que extenderla manualmente por un intervalo breve y volver a desplegar.
- Se realizó una nueva implementación de Preview después de configurar las variables; Vercel la reportó READY.
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_KEY`, `ARKHE_AUTH_RP_ID`, `ARKHE_AUTH_ORIGIN` y `ARKHE_AUTH_RP_NAME` están acotadas a Preview y a esta rama.

Las claves/URLs de despacho centrales y las credenciales públicas de despacho de los bots tampoco están configuradas. Los destinos `*-preview.onrender.com` continúan siendo nombres previstos, no servicios confirmados; los tres servicios activos siguen en `main`.

**No pedir ni pegar claves en el chat.** Ángel debe introducir la clave `service_role` y el secreto de bootstrap en Vercel Settings, cada uno como variable sensitive y con Git Branch exactamente `security/a4-idempotent-completion`, target Preview únicamente. Después se verificará sólo su presencia mediante metadata, sin leer valores; entonces se abrirá la ventana de bootstrap durante un periodo breve y se podrá realizar la inscripción de passkeys.

## 7. Diseño árbol/red integrado al Preview A.4 — 2026-10-11

Se corrigió la selección de interfaz en la misma rama `security/a4-idempotent-completion` para preservar el RP ID y el alias estable de WebAuthn:

- Se restauró el `src/App.jsx`, `src/index.css`, `src/KnowledgeGraph.jsx`, `src/ArkheTree.jsx` y `src/epistemicGraphModel.js` de `design/tree-network-dashboard`.
- Se añadió `HumanAuthPanel` como entrada separada de navegación `Gobierno humano`; el panel de A.4 no reemplaza el diseño del Dashboard.
- Se añadió una banda visible: `Preview aislado A.4 · datos sintéticos; no se muestran aquí los nodos ni las investigaciones de producción.`
- Se creó la estructura vacía de `ideas` y `tareas` para la interfaz y se aplicaron en staging las cuatro migraciones semánticas de la rama de diseño.
- Se verificaron ACL de lectura: las tablas semánticas están con RLS y política de sólo lectura para `anon` y `authenticated`; no hay relaciones ni eventos semánticos guardados en staging.
- La base contiene únicamente cuatro investigadores sintéticos, una investigación-proyecto sintética y tres perfiles de bots de prueba. `investigaciones`, `rondas_investigacion`, relaciones y eventos siguen vacíos. Los contadores de nodos en cero son esperados; no se copiaron datos del proyecto compartido.
- La CI `A.4 Human Auth and Atomic Completion Audit` terminó en verde para el commit de integración `802d8473c0d3de09464154888cbff0add2edd76d`; el deployment de Preview correspondiente aparece READY en Vercel. Esto acredita build y pruebas automatizadas, no una validación visual desde el dispositivo de Ángel.
- La antigua etiqueta `Nodo Aletheia: Online` era texto fijo, no señal de health check. La versión de diseño evita usar esa etiqueta como prueba de conectividad.

Las copias canónicas de las migraciones usadas en este staging se guardan bajo `tests/staging/migrations/` y el SQL de módulos vacíos en `tests/staging/dashboard-design-empty-modules.sql`. No forman una autorización para aplicarlas a la base compartida.

**Regla de cierre:** A.4 sólo podrá declararse cerrado después de las pruebas E2E de WebAuthn y despacho en infraestructura aislada, con evidencia reproducible y revisión humana final. Una CI verde, por sí sola, no basta.
