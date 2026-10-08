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

Los clientes firmados de Atlas, Aletheia y Tekton existen en sus respectivas ramas de auditoría. Las ramas contienen cambios aislados en los componentes de cliente, cuerpo investigador y workflow de auditoría; la comparación contra `main` no incorpora cambios funcionales ajenos a A2.

Las tres instancias normales de Render continúan desplegadas desde `main`. Las variables `ARKHE_SERVICE_ID` y `ARKHE_SERVICE_PRIVATE_KEY` ya fueron preparadas en Render.

Las ramas de auditoría ahora incluyen además un modo seguro para Pull Request Preview: cuando Render marca `IS_PULL_REQUEST=true`, el bot no inicia sesión en Discord. Un endpoint `/a2/smoke` solo se habilita con `ARKHE_A2_PREVIEW=1` y requiere un `ARKHE_A2_CONVOCATORIA_ID` explícito para probar el cliente firmado contra el Core de auditoría.

Los tres PR de los bots fueron creados como Draft con el marcador `[render preview]`. Los servicios Render actuales tienen `pullRequestPreviewsEnabled=no`, por lo que **la instancia aislada todavía no ha sido creada** y la activación del preview es la siguiente acción de infraestructura.

Por tanto, **no se afirma todavía que las instancias normales desplegadas de los tres bots estén usando esta firma Ed25519**.

### Procedencia del modelo/proveedor: mejora provider-response-attested

Se revisaron los tres clientes investigadores contra la semántica actual de sus APIs de inferencia.

**Atlas** realiza sus llamadas mediante el cliente OpenAI, con OpenRouter como ruta cuando `OPENROUTER_API_KEY` está presente. En la rama de auditoría ahora captura `respuesta.model` y `respuesta.id` devueltos por la API, en lugar de persistir únicamente el modelo solicitado. OpenRouter documenta que el atributo `model` de la respuesta permite saber qué modelo fue usado por el router. Cuando la ruta es OpenRouter, el proveedor upstream concreto puede variar y queda explícitamente sin afirmar. citeturn176258search7turn176258search1

**Aletheia** usa Google Gemini y ahora captura `response.modelVersion` y `response.responseId`, ambos campos de salida definidos por la API de Gemini para identificar la versión del modelo utilizada y la respuesta concreta. citeturn808613search2

**Tekton** usa Groq mediante el cliente OpenAI y ahora captura `respuesta.model` y `respuesta.id` devueltos por la Responses API de Groq. La documentación de Groq define ambos campos en la respuesta. citeturn808613search0turn808613search1

Los tres clientes envían al Core:

- `modelo_solicitado`;
- `modelo_observado`;
- `id_respuesta_proveedor`;
- `nivel_procedencia: provider-response-attested`.

El Core fue endurecido para aceptar este nivel únicamente cuando el modelo observado y el identificador de respuesta están presentes y `body.modelo` coincide con `metadata.modelo_observado`.

Esto cambia la calidad de la evidencia: ya no registramos únicamente lo que el servicio **pidió** usar, sino también lo que el **proveedor devolvió como modelo/versión y respuesta**.

Sin embargo, esta evidencia sigue siendo **atestación del servicio basada en la respuesta del proveedor**. El servicio todavía puede falsificar externamente esos campos antes de firmarlos si fuera malicioso. Por ello, no se considera una prueba criptográficamente independiente de la inferencia.

**Estado: DEMOSTRADO como provider-response-attested; procedencia independiente externa: PENDIENTE.**

El detalle comparativo de las rutas OpenRouter, OpenAI, Gemini y Groq, y los niveles A/B/C de evidencia, quedó documentado en `docs/provider-provenance.md`.

### CI de GitHub

El workflow de la rama existe y está configurado para ejecutarse en:

- pushes a `audit/a2-provenance-boundary`;
- pull requests hacia `main`;
- ejecución manual.

Se observó una primera ejecución fallida en `setup-node`. La causa operativa fue la configuración de `cache: npm` sin archivo de lockfile disponible; se eliminó esa dependencia del workflow.

La siguiente ejecución llegó correctamente a `npm install`, y después `npm test` inicialmente falló porque `actionCompleteInvocation` no estaba exportada desde `api/arkhe-core.js`. Se corrigió la exportación para permitir el test directo de la acción.

En ejecuciones posteriores y tras completar los cambios de esta auditoría se observó:

- `npm install --no-audit --no-fund`: **success**;
- `npm test`: **success**;
- job `provenance`: **success**;
- ejecución por `push`: **success** (run #81);
- ejecución por `pull_request`: **success** (run #82).

Estado: **DEMOSTRADO** para la ejecución observable del workflow en la rama.

Los workflows A2 de los tres repositorios de bots también terminaron en **success** para `push` y `pull_request`, validando sintaxis de `index.js`, `arkhe-round.js` y `arkhe-core-client.js`. Las ejecuciones más recientes tras el guard de Pull Request Preview fueron success en Atlas, Aletheia y Tekton.

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

Para el cierre definitivo todavía deberá revisarse la activación desplegada de los clientes firmados de los tres bots, la procedencia independiente externa de modelo/proveedor, la limpieza del bypass temporal de Vercel y la política operativa de retención/limpieza de nonces expirados.

Hasta completar esas evidencias, `main` permanece congelado respecto de este endurecimiento.
