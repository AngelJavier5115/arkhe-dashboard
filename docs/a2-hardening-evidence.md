# A.2 — Evidencia de endurecimiento de identidad

## Alcance

Esta rama endurece la frontera:

`servicio ejecutor → investigador lógico → Arkhé Core`

La rama mantiene `main` sin cambios.

## Evidencia obtenida

### 1. Firma Ed25519 por servicio

El Core mantiene una clave pública independiente para:

- `atlas`
- `aletheia`
- `tekton`

Cada servicio conserva su clave privada fuera del repositorio.

La firma cubre:

`service_id + timestamp + nonce + SHA-256(body)`

Por diseño, modificar el cuerpo después de firmarlo invalida la firma.

Como la firma cubre el cuerpo completo, los campos declarativos `modelo` y `proveedor` también quedan criptográficamente vinculados al servicio que envía la petición.

Esto mejora la atribución de la declaración del servicio, pero **no constituye evidencia independiente del proveedor o del modelo**.

### 2. Correspondencia de claves

Se verificó localmente, usando las mismas claves privadas configuradas en Render y las correspondientes claves públicas configuradas para el preview del Core:

- Atlas: coincidencia privada → pública.
- Aletheia: coincidencia privada → pública.
- Tekton: coincidencia privada → pública.

La prueba adicional confirmó para los tres servicios:

- firma propia: aceptada;
- cambiar el `service_id`: rechazada;
- modificar el cuerpo: rechazada.

No se almacenan claves privadas en este documento.

### 3. Anti-replay persistente

Se creó `public.core_request_nonces`.

Características:

- `nonce` como clave primaria;
- `service_id`;
- timestamp firmado;
- expiración;
- RLS habilitado;
- sin permisos de lectura pública.

Prueba directa contra Supabase:

1. primer uso de un nonce: aceptado;
2. reutilización del mismo nonce: rechazado por la restricción de clave primaria `core_request_nonces_pkey`;
3. datos de prueba eliminados posteriormente.

La misma propiedad fue validada además mediante una petición HTTP real contra el Core desplegado: el primer uso de un nonce fue aceptado y la repetición exacta fue rechazada como replay.

### 4. Vinculación servicio → investigador

El Core ya no confía en `investigador_id` para autorizar:

- `obtener_convocatoria`;
- `completar_convocatoria`;
- `fallar_convocatoria`.

El investigador autenticado se deriva de la identidad criptográfica del servicio.

Por tanto:

`tekton + firma válida de Tekton + investigador_id=Atlas`

debe ser rechazado.

La contraprueba se ejecutó además por HTTP real contra el preview desplegado: una petición firmada con la clave de Atlas cuyo `service_id` fue cambiado a `aletheia` fue rechazada por el Core.

### 5. Evidencia HTTP desplegada

Se ejecutó una suite adversarial HTTP contra el endpoint del Core en el preview de la rama:

`https://arkhe-dashboard-git-audit-a2-provenance-boundary-arkhe7.vercel.app/api/arkhe-core`

La petición válida de Atlas usó:

- `x-arkhe-service-id: atlas`;
- timestamp fresco;
- nonce;
- firma Ed25519;
- acción `obtener_convocatoria`.

La respuesta fue `ok:true` y devolvió una convocatoria real de Atlas respaldada por los datos del Core.

La suite desplegada produjo:

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

Esta evidencia demuestra que la frontera criptográfica fue alcanzada por HTTP en el despliegue de auditoría y que las contrapruebas ejecutadas se comportaron según el diseño.

### 6. Despliegue de prueba

La rama tiene despliegues de preview de Vercel en estado `READY`.

Para la prueba de frontera HTTP se configuró temporalmente una clave pública Ed25519 exclusiva de esta rama; no afecta a `main` ni a Production.

También existe un PR draft:

`A2: endurecer identidad de servicios investigadores`

No se ha fusionado a `main`.

## Pruebas locales y de base de datos

La suite local de autenticación ejecutada previamente contiene seis pruebas y terminó con:

- 6 pasadas;
- 0 fallidas.

Las pruebas cubren firma válida, cambio de identidad declarada, firma falsa, uso cruzado de claves, timestamp obsoleto y mutación del cuerpo.

La prueba de anti-replay se ejecutó directamente contra Supabase y confirmó el rechazo del nonce duplicado.

## Evidencia de ejecución observable

La suite adversarial HTTP fue ejecutada desde un Codespace sobre la rama `audit/a2-provenance-boundary`, después de sincronizar el script con GitHub.

Resultado observado:

- 7/7 casos reportados como `PASS`;
- 0 casos reportados como `FAIL`.

Los siete resultados corresponden a seis pruebas conceptuales porque el anti-replay se observa en dos pasos separados: primer uso del nonce (4a) y repetición del mismo nonce (4b).

La suite validó específicamente aceptación válida, integridad del cuerpo, separación de servicios, anti-replay persistente, frescura temporal y rechazo de una firma creada con una clave incorrecta.

## Límites actuales

### Timestamp fuera de ventana

La prueba HTTP contra el Core desplegado utilizó un timestamp deliberadamente 10 minutos atrás y fue rechazada.

Estado: **DEMOSTRADO por HTTP**.

### Firma con clave incorrecta

La prueba HTTP contra el Core desplegado utilizó una clave Ed25519 aleatoria distinta de la clave pública configurada para Atlas y fue rechazada.

Estado: **DEMOSTRADO por HTTP**.

### Integración de los bots en despliegue

Los clientes firmados de Atlas, Aletheia y Tekton existen en sus respectivas ramas de auditoría, y las variables privadas fueron preparadas en Render. Sin embargo, los servicios normales de Render todavía siguen `main`.

Por tanto, **no se afirma todavía que las instancias normales desplegadas de los tres bots estén usando esta firma Ed25519**.

### Procedencia independiente del modelo/proveedor

La firma demuestra que la declaración `modelo/proveedor` provino del servicio autenticado y que no fue alterada durante el transporte.

Eso **no demuestra por sí solo** que el modelo o proveedor declarado sea realmente el motor que ejecutó la inferencia.

Estado: **PENDIENTE**.

### CI de GitHub

El workflow de la rama existe y está configurado para ejecutarse en:

- pushes a `audit/a2-provenance-boundary`;
- pull requests hacia `main`;
- ejecución manual.

Se observó una primera ejecución fallida en `setup-node`. La causa operativa fue la configuración de `cache: npm` sin archivo de lockfile disponible; se eliminó esa dependencia del workflow.

La siguiente ejecución llegó correctamente a `npm install`, y después `npm test` inicialmente falló porque `actionCompleteInvocation` no estaba exportada desde `api/arkhe-core.js`. Se corrigió la exportación para permitir el test directo de la acción.

En el commit posterior se observó la ejecución de GitHub Actions completada con:

- `npm install --no-audit --no-fund`: **success**;
- `npm test`: **success**;
- job `provenance`: **success**;
- ejecución por `push`: **success**;
- ejecución por `pull_request`: **success**.

Estado: **DEMOSTRADO** para la ejecución observable del workflow en la rama.

## Estado metodológico

- identidad lógica: **demostrado**;
- identidad criptográfica del servicio: **demostrado localmente y por HTTP contra Core desplegado**;
- integridad del mensaje: **demostrado localmente y por HTTP contra Core desplegado**;
- frescura temporal: **demostrado localmente y por HTTP contra Core desplegado**;
- anti-replay persistente: **demostrado contra Supabase y por HTTP contra Core desplegado**;
- suplantación cruzada entre servicios: **rechazada localmente y por HTTP contra Core desplegado**;
- autorización del Core con firma: **demostrado por HTTP contra Core desplegado**;
- atribución criptográfica de `modelo/proveedor` al servicio: **cubierta por la firma del cuerpo**;
- procedencia independiente del modelo/proveedor: **pendiente**;
- llamada HTTP real al Core protegido: **demostrado**;
- CI observable de la rama: **pendiente de evidencia**.

## Regla de integración

Esta rama no debe fusionarse a `main` solo porque el código compile o porque las pruebas locales pasen.

Con la suite HTTP actual ya existe evidencia desplegada para:

1. Atlas firmado → aceptar;
2. cuerpo mutado después de firmar → rechazar;
3. servicio cruzado / identidad falsificada → rechazar;
4. nonce reutilizado → rechazar;
5. timestamp fuera de ventana → rechazar;
6. firma con clave incorrecta → rechazar.

Las contrapruebas HTTP de autenticación, integridad, separación de servicios, anti-replay, frescura temporal y clave incorrecta ya tienen evidencia desplegada.

Para el cierre definitivo todavía deberá revisarse la integración real de los clientes de los tres bots, la procedencia independiente de modelo/proveedor, el resultado observable de CI y la limpieza de las credenciales temporales utilizadas en la auditoría.

Hasta completar esas evidencias, `main` permanece congelado respecto de este endurecimiento.
