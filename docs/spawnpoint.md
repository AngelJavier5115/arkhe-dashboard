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

**Integración real de bots:** Atlas/Aletheia/Tekton en Render todavía siguen `main`; los clientes firmados de auditoría no deben considerarse producción.

**Procedencia independiente del modelo/proveedor:** la firma vincula la declaración al servicio, pero todavía no prueba qué motor produjo realmente la inferencia.

**CI observable:** existe el workflow, pero falta una ejecución observable que pueda contabilizarse como evidencia.

**Higiene final de auditoría:** restaurar la clave pública temporal del preview, revocar/rotar el bypass temporal de Vercel y borrar llaves privadas temporales locales.

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

1. Hacer limpieza de credenciales temporales de la auditoría.
2. Revisar diff completo de A.2 y verificar que `main` siga intacto.
3. Obtener una ejecución observable de CI y registrar su resultado.
4. Revisar la integración desplegada de los clientes firmados de los tres bots.
5. Mantener separado como trabajo posterior la procedencia independiente de modelo/proveedor y definir su evidencia.
6. Solo después evaluar el cierre formal de la auditoría y una eventual integración a `main`.

## Principio metodológico Arkhé

No declarar resuelto lo que no haya sido demostrado.

El objetivo de esta auditoría no es confirmar que nuestra implementación “parece correcta”, sino intentar romper la frontera y conservar tanto los éxitos como los fallos y límites.

**Estado del checkpoint:** A.2 avanzada, evidencia desplegada parcial, `main` congelado.

## Continuidad

Al reanudar, empezar leyendo:

`docs/a2-hardening-evidence.md`

y después este Spawnpoint.

No reiniciar trabajo ya demostrado salvo que aparezca evidencia contradictoria.
