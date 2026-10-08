# Spawnpoint — Estado de continuidad Arkhé

> Punto de reanudación técnico y metodológico. Este archivo funciona como checkpoint vivo del proyecto para evitar pérdida de continuidad entre sesiones.

**Fecha del checkpoint:** 2026-10-08  
**Hora aproximada:** 02:11 (UTC-06)  
**Repositorio:** `AngelJavier5115/arkhe-dashboard`  
**Rama activa:** `audit/a2-provenance-boundary`  
**Base protegida:** `main` permanece sin cambios por este endurecimiento.

## Propósito

Conservar el estado verificable de la auditoría A.2 y dejar claro desde dónde continuar, qué está demostrado, qué está pendiente y qué acciones no deben ejecutarse todavía.

El Spawnpoint **no sustituye la evidencia técnica**. La evidencia detallada vive en:

`docs/a2-hardening-evidence.md`

Este documento conserva la continuidad operativa y metodológica.

## Último hito demostrado

Se ejecutó desde un Codespace una suite HTTP adversarial completa contra el Core desplegado en el preview de la rama.

Resultado observado:

```
PASS | 1. Atlas válido → Core acepta
PASS | 2. Cuerpo alterado → firma rechazada
PASS | 3. Atlas intentando presentarse como Aletheia → rechazado
PASS | 4a. Primera petición con nonce → aceptada
PASS | 4b. Repetición del mismo nonce → replay rechazado
PASS | 5. Timestamp fuera de ventana → rechazado
PASS | 6. Firma con clave incorrecta → rechazado
Suite terminada: 7/7 PASS.
```

Los siete resultados corresponden a seis pruebas conceptuales porque el anti-replay se divide en primera aceptación y repetición.

Esto aporta evidencia desplegada de:

- autenticación criptográfica del servicio;
- vinculación servicio → investigador;
- integridad del cuerpo firmado;
- separación entre identidades de servicio;
- anti-replay persistente;
- frescura temporal;
- rechazo de una firma con clave incorrecta;
- autorización de una petición válida de Atlas por el Core desplegado.

## Estado A.2

### Demostrado

**Identidad lógica:** investigadores persistentes y separados.

**Identidad criptográfica:** Ed25519 por servicio, validada localmente y mediante HTTP contra Core desplegado.

**Integridad:** mutación del cuerpo rechazada mediante HTTP.

**Anti-replay:** nonce persistente demostrado contra Supabase y mediante HTTP.

**Separación de servicios:** Atlas no puede presentarse como Aletheia usando una firma de Atlas.

**Autorización Core:** una petición válida de Atlas obtiene su convocatoria real desde Core.

### Pendiente

**Integración real de bots:** Atlas, Aletheia y Tekton en Render siguen en `main`. Cada rama `audit/a2-provenance-boundary` está 2 commits por encima de `main`: el cliente firmado `arkhe-core-client.js` y la captura de procedencia observada en `arkhe-round.js`. Por tanto, estos cambios todavía no están activos en las instancias normales.

**Procedencia del modelo/proveedor:** ahora existe nivel `provider-response-attested`, que registra el modelo/versión y el ID de respuesta devueltos por cada proveedor. Esto es más fuerte que una declaración del servicio, pero todavía no constituye verificación independiente externa.

**CI observable:** ya demostrado. Las ejecuciones más recientes terminaron correctamente: push run #81 y pull_request run #82.

**Higiene final de auditoría:** la clave pública temporal de Atlas en el preview ya fue restaurada, los endpoints/scripts diagnósticos temporales fueron eliminados y las llaves privadas temporales locales ya fueron borradas. Solo queda la gestión del bypass temporal de Vercel; su operación de revocación disponible requiere el secreto y no se expone ni se vuelve a solicitar en el chat.

**Retención de nonces:** existe expiración lógica, pero todavía debe definirse una limpieza/retención operativa de filas expiradas.

## Regla de seguridad y gobierno

No fusionar esta rama con `main` todavía.

No exponer ni registrar en texto:

- claves privadas;
- Core token;
- secretos de bypass de Vercel;
- cualquier otra credencial temporal.

La evidencia debe conservar únicamente identificadores no sensibles, resultados de pruebas y límites explícitos.

## Siguiente punto de reanudación

1. Revocar/rotar el bypass temporal de Vercel y borrar las llaves privadas temporales locales de Codespace.
2. Revisar diff completo de A.2 y verificar que `main` siga intacto.
3. Obtener una ejecución observable de CI y registrar su resultado.
4. Revisar la activación desplegada de los clientes firmados y de la captura `provider-response-attested` en los tres bots.
5. Mantener separado como trabajo posterior la verificación independiente externa de modelo/proveedor.
6. Definir la política operativa de retención/limpieza de nonces expirados.
7. Solo después evaluar el cierre formal de la auditoría y una eventual integración a `main`.

## Principio metodológico Arkhé

No declarar resuelto lo que no haya sido demostrado.

El objetivo de esta auditoría no es confirmar que nuestra implementación “parece correcta”, sino intentar romper la frontera y conservar tanto los éxitos como los fallos y límites.

**Estado del checkpoint:** A.2 avanzada, evidencia desplegada parcial, `main` congelado.

## Continuidad

Al reanudar, empezar leyendo:

`docs/a2-hardening-evidence.md`

y después este Spawnpoint.

No reiniciar trabajo ya demostrado salvo que aparezca evidencia contradictoria.
