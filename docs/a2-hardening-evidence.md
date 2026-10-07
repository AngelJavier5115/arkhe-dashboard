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

### 4. Vinculación servicio → investigador

El Core ya no confía en `investigador_id` para autorizar:

- `obtener_convocatoria`;
- `completar_convocatoria`;
- `fallar_convocatoria`.

El investigador autenticado se deriva de la identidad criptográfica del servicio.

Por tanto:

`tekton + firma válida de Tekton + investigador_id=Atlas`

debe ser rechazado.

### 5. Despliegue de prueba

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

## Límites actuales

### HTTP real contra el preview protegido

No se contabiliza todavía como evidencia una llamada HTTP externa completa al endpoint protegido del preview.

Se intentó una petición POST real con firma Atlas válida, timestamp fresco, nonce y cuerpo de `obtener_convocatoria`. Vercel Authentication respondió `401 Protected by Vercel Authentication` antes de alcanzar al Core.

La documentación vigente de Vercel ofrece `vercel curl` y Protection Bypass for Automation para pruebas E2E. Sin embargo, el canal de ejecución disponible en esta auditoría no permite transportar de forma segura el secreto de bypass hasta el sandbox que realiza el POST.

Por metodología, esto queda como:

**NO DEMOSTRADO TODAVÍA**

No se contabiliza un `401` de Vercel como éxito de la autenticación interna del Core.

### Integración desplegada contra Supabase

Se preparó un sandbox aislado con el código exacto de esta rama y dependencias instaladas. El arnés logró acceder a la red externa, pero la frontera de protección de Vercel bloqueó la petición real al endpoint.

No se afirma una prueba de integración que no haya alcanzado al Core.

### CI de GitHub

El workflow de la rama existe y está configurado para ejecutarse en:

- pushes a `audit/a2-provenance-boundary`;
- pull requests hacia `main`;
- ejecución manual.

La ejecución de CI debe considerarse válida únicamente cuando exista una ejecución observable del workflow con sus resultados. No se reutiliza como evidencia una simple existencia del archivo YAML.

## Estado metodológico

- identidad lógica: **demostrado**;
- identidad criptográfica del servicio: **demostrado en pruebas locales**;
- integridad del mensaje: **demostrado**;
- frescura temporal: **demostrado en pruebas locales**;
- anti-replay persistente: **demostrado contra Supabase**;
- suplantación cruzada entre servicios: **rechazada en prueba criptográfica**;
- autorización del Core con firma: **implementada en rama**;
- atribución criptográfica de `modelo/proveedor` al servicio: **cubierta por la firma del cuerpo**;
- procedencia independiente del modelo/proveedor: **pendiente**;
- llamada HTTP real al Core protegido: **pendiente de demostración**;
- CI observable de la rama: **pendiente de evidencia**.

## Regla de integración

Esta rama no debe fusionarse a `main` solo porque el código compile o porque las pruebas locales pasen.

La condición de cierre de A.2 es obtener evidencia de la frontera desplegada y completar la contraprueba adversarial:

1. Atlas firmado → aceptar;
2. Tekton firmado intentando actuar como Atlas → rechazar;
3. cuerpo mutado después de firmar → rechazar;
4. timestamp fuera de ventana → rechazar;
5. nonce reutilizado → rechazar;
6. firma con clave incorrecta → rechazar.

Hasta completar esa evidencia, `main` permanece congelado respecto de este endurecimiento.
