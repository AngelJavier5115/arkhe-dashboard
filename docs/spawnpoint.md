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

### Pendiente / posterior a A2

**Integración real de bots:** las instancias normales de Atlas, Aletheia y Tekton en Render siguen en `main`. Atlas, Aletheia y Tekton demostraron el smoke firmado en previews aislados, y esas previews ya fueron deprovisionadas. Los clientes firmados y la captura de procedencia observada siguen en las ramas de auditoría; todavía no están activos en las instancias normales.

**Procedencia del modelo/proveedor:** ahora existe nivel `provider-response-attested`, implementado en los tres clientes y validado estáticamente por CI. Atlas además captura metadata de routing de OpenRouter cuando utiliza esa ruta y correlaciona la generación con `convocatoriaId` mediante `trace_id`. Esto es más fuerte que una declaración del servicio, pero todavía no constituye verificación independiente externa ni se ha ejecutado aquí una inferencia runtime posterior al cambio. El marco A/B/C de evidencia quedó documentado en `docs/provider-provenance.md`.

**CI observable:** ya demostrado. Core tiene runs finales #145/#146 en `success`; los tres bots tienen runs finales de push y pull_request en `success`.

**Higiene final de auditoría:** completada para los recursos temporales utilizados: clave pública temporal restaurada, endpoints/scripts diagnósticos eliminados, llaves privadas temporales borradas, fixture de Tekton eliminada y bypass temporal de Vercel revocado.

**Retención de nonces:** implementada. Supabase Cron ejecuta limpieza diaria y conserva 24 horas adicionales después de `expires_at`.

**Frontera de gobierno humano:** pendiente como trabajo posterior. Las acciones de gobierno continúan usando `ARKHE_CORE_TOKEN` + `actor_id === ANGEL_ID`; esto demuestra una regla lógica de gobierno dentro del Core, pero no una prueba criptográfica de que el poseedor del token sea Ángel. No se modifica RLS por este hallazgo.

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
4. Revisar el diff completo de A2 en Core y los tres bots y comprobar que no quede código o configuración específica de la prueba temporal.
5. Leer `docs/a2-closure-review.md` y tratar A2 como cerrada técnicamente; cualquier cambio posterior debe considerarse una nueva fase o excepción documentada.
5. Mantener separado como trabajo posterior la verificación independiente externa de modelo/proveedor.
6. Definir la política operativa de retención/limpieza de nonces expirados.
7. Hacer una revisión final de los cuatro PR y confirmar la estrategia de merge (preferentemente squash para conservar un historial limpio).
8. Solo después de autorización explícita evaluar la integración a `main`.

## Principio metodológico Arkhé

No declarar resuelto lo que no haya sido demostrado.

El objetivo de esta auditoría no es confirmar que nuestra implementación “parece correcta”, sino intentar romper la frontera y conservar tanto los éxitos como los fallos y límites.

**Estado del checkpoint:** A.2 **CERRADA TÉCNICAMENTE** en la frontera de identidad de servicio; no fusionada. La retención de nonces está operativa. `main` congelado hasta el corte productivo autorizado.

## Continuidad

Al reanudar, empezar leyendo:

`docs/a2-hardening-evidence.md`

Después leer este Spawnpoint y, cuando corresponda, `docs/provider-provenance.md` y `docs/source-registry-proposal.md`.

No reiniciar trabajo ya demostrado salvo que aparezca evidencia contradictoria.
