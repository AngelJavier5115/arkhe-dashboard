# A.2 — Revisión de cierre

**Fecha:** 2026-10-08  
**Rama auditada:** audit/a2-provenance-boundary  
**Base:** main  
**Decisión:** **A.2 técnicamente cerrada como frontera de identidad de servicio.**  
**Activación en Production:** separada, pendiente de autorización explícita.

## 1. Pregunta de auditoría

¿Puede un ejecutor distinto del investigador legítimo hacerse pasar por ese investigador dentro de Arkhé Core únicamente porque posee acceso válido al Core?

### Resultado

**La hipótesis original de vulnerabilidad fue refutada mediante implementación y pruebas adversariales.**

La frontera final exige tres elementos separados:

1. identidad lógica del investigador;
2. identidad criptográfica del servicio ejecutor;
3. declaración de modelo/proveedor vinculada al cuerpo firmado.

El Core deriva el investigador desde el servicio autenticado y no acepta el 'investigador_id' del cuerpo como autoridad.

## 2. Evidencia de frontera

### Criptografía

Ed25519 por servicio:

- Atlas → clave pública propia;
- Aletheia → clave pública propia;
- Tekton → clave pública propia.

La firma cubre:

'service_id + timestamp + nonce + SHA-256(body)'

Pruebas desplegadas:

- firma válida → acepta;
- cuerpo alterado → rechaza;
- identidad cruzada → rechaza;
- nonce repetido → rechaza;
- timestamp fuera de ventana → rechaza;
- clave incorrecta → rechaza.

Resultado observado:

**7/7 PASS**.

### Ejecución real

Se validó el recorrido desde instancias temporales reales de Render hacia el Core desplegado:

- Atlas Preview → Core → convocatoria de Atlas: **PASS**;
- Aletheia Preview → Core → convocatoria de Aletheia: **PASS**;
- Tekton Preview → Core → convocatoria de Tekton: **PASS**.

Los tres previews fueron posteriormente deprovisionados.

## 3. Anti-replay y retención

La tabla 'core_request_nonces' almacena cada nonce consumido.

La frescura criptográfica mantiene una ventana de 5 minutos.

Para retención operativa se añadió:

'arkhe_cleanup_expired_core_request_nonces()'

La función elimina nonces cuyo 'expires_at' tenga más de 24 horas de antigüedad.

Se programó un job diario de Supabase Cron:

'arkhe-cleanup-expired-core-request-nonces'

El job quedó activo.

La retención de 24 horas es intencional: mantiene una ventana forense adicional sin conservar indefinidamente los registros necesarios sólo para anti-replay.

## 4. Procedencia de modelo/proveedor

Se implementó 'provider-response-attested'.

El servicio registra:

- modelo solicitado;
- modelo/versión observado;
- ID de respuesta del proveedor;
- routing metadata cuando el proveedor la expone.

Core comprueba la consistencia interna de esos datos antes de persistir la intervención.

### Límite

Esto no constituye todavía una verificación independiente del proveedor.

La distinción queda:

'provider-response-attested' → **demostrado**

'provider-verified' → **pendiente**

'cryptographically-provider-attested' → **pendiente**

La procedencia independiente queda fuera de la frontera mínima necesaria para A.2 y se mantiene como trabajo posterior.

## 5. CI y revisión reproducible

Core:

- workflow de push → success;
- workflow de pull request → success;
- npm test → success.

Atlas, Aletheia y Tekton:

- workflow A2 de push → success;
- workflow A2 de pull request → success;
- validación de sintaxis de 'index.js', 'arkhe-round.js' y 'arkhe-core-client.js' → success.

La evidencia de fallos intermedios de CI y sus correcciones queda conservada en el historial de GitHub.

## 6. Higiene de auditoría

Completado:

- fixture temporal de Tekton eliminada;
- 0 filas restantes para ronda/convocatoria fixture;
- previews temporales de Render deprovisionados;
- bypass temporal de Vercel revocado;
- llaves privadas temporales del Codespace eliminadas;
- endpoint /a2/smoke eliminado;
- header temporal de bypass eliminado;
- harness HTTP one-shot eliminado.

Las claves públicas de servicio preparadas para Production no son secretas y no activan por sí mismas el código de A.2.

## 7. Qué NO se declara

Esta revisión no declara:

- que los tres bots normales de Render ya estén usando Ed25519;
- que main haya sido modificado;
- que la procedencia del modelo/proveedor sea independiente;
- que exista una atestación criptográfica emitida por un proveedor;
- que el Core pueda ejecutar gobierno sin Ángel.

## 8. Decisión de cierre

### A.2 — Frontera de identidad de servicio

**CERRADA TÉCNICAMENTE.**

La propiedad objetivo fue implementada y sometida a:

- pruebas unitarias;
- pruebas criptográficas;
- pruebas de base de datos;
- contrapruebas adversariales HTTP;
- pruebas de integración desde infraestructura Render real;
- CI observable.

### Activación productiva

**NO EJECUTADA.**

La activación debe ser un corte coordinado y separado, con revisión final del diff y autorización explícita.

### Trabajo posterior

- procedencia independiente externa de modelos/proveedores;
- observabilidad provider-side donde sea viable;
- evolución futura del Registro de Fuentes Arkhé;
- futura integración con IA locales por investigador.

## 9. Regla de Arkhé

Cerrar una pregunta no significa cerrar todo el sistema.

A.2 queda cerrada porque **la frontera que definimos fue demostrada**.

Las propiedades que requieren otra clase de evidencia permanecen explícitamente abiertas y no se usan para inflar la conclusión de esta auditoría.