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

También existe un PR draft:

`A2: endurecer identidad de servicios investigadores`

No se ha fusionado a `main`.

## Límites actuales

### HTTP real contra el preview protegido

No se contabiliza todavía como evidencia una llamada HTTP externa completa al endpoint protegido del preview.

El despliegue de Vercel utiliza protección de acceso y el entorno de herramientas disponible no posee un canal autenticado equivalente a `vercel curl`/Trusted Sources para ejecutar esa petición.

Por metodología, esto queda como:

**NO DEMOSTRADO TODAVÍA**, no como éxito.

### CI de GitHub

El workflow de la rama existe y está configurado para ejecutarse en pull requests y pushes.

No se observó una ejecución de GitHub Actions en el conector disponible, por lo que no se afirma que CI haya pasado.

## Estado metodológico

- identidad lógica: demostrado;
- identidad criptográfica del servicio: demostrado en pruebas locales;
- integridad del mensaje: demostrado;
- frescura temporal: demostrado en pruebas locales;
- anti-replay persistente: demostrado contra Supabase;
- suplantación cruzada entre servicios: rechazada en prueba criptográfica;
- autorización del Core con firma: implementada en rama;
- llamada HTTP real al Core protegido: pendiente de demostración;
- procedencia independiente del modelo: pendiente.

### HTTP real al preview

Se intentó una petición POST real al preview con firma Atlas válida, timestamp fresco, nonce y cuerpo de `obtener_convocatoria`.

La petición llegó a Vercel, pero la capa de Vercel Authentication respondió `401 Protected by Vercel Authentication` antes de alcanzar al Core.

Se creó un bypass temporal de 5 minutos exclusivamente para el preview durante esta prueba y se revocó inmediatamente después.

No se contabiliza este intento como prueba de autorización del Core porque la petición no atravesó la protección de Vercel.

### Prueba de integración adicional

Se preparó un sandbox aislado con el código exacto de esta rama y dependencias instaladas para intentar ejecutar el handler contra el Supabase real.

Los controles de ejecución bloquearon ese arnés al intentar cruzar la frontera de ejecución con el backend real, por lo que no se falsea el resultado: esta integración queda pendiente.

## Regla de integración

Esta rama no debe fusionarse a `main` solo porque el código compile.

La condición de cierre de A.2 es obtener evidencia de la frontera desplegada y completar la contraprueba adversarial.

