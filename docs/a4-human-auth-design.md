# A.4 — Diseño de autenticación humana de Ángel

**Fecha:** 2026-10-08  
**Rama:** `audit/a4-human-auth`  
**Base:** `audit/a2-provenance-boundary` @ `48e0d3be41e54fc1470799cf26d84221a2f62cb3`  
**Estado:** Diseño — sin activación productiva

## 1. Pregunta de auditoría

¿Puede una persona que no sea Ángel acceder al Dashboard privado o ejecutar acciones de gobierno de Arkhé simplemente porque conoce o roba una credencial técnica del Core, modifica `actor_id` o reutiliza una autenticación previa?

### Propiedad objetivo

La autoridad humana de gobierno debe derivarse de una **autenticación criptográfica de Ángel**, no de un `actor_id` enviado por el cliente ni de la mera posesión de un bearer token compartido.

La identidad resultante debe quedar fijada en servidor como:

`actor = ANGEL_ID`

y no como:

`actor = body.actor_id`

## 2. Decisión arquitectónica

La propuesta es usar **WebAuthn / passkeys** como autenticación humana.

WebAuthn usa criptografía de clave pública: el autenticador conserva la clave privada y el servidor conserva la clave pública; durante el acceso, el servidor genera un desafío y el autenticador firma el desafío junto con el contexto del sitio. El servidor verifica la firma, el desafío y el contexto de origen. Esto evita almacenar una contraseña compartida en Arkhé y aporta una defensa fuerte contra phishing por la vinculación del credencial al RP ID y al origen. citehttps://developer.mozilla.org/en-US/docs/Web/Security/Authentication/Passkeys

La implementación se hará con:

- `@simplewebauthn/server` 14.x en las funciones de servidor;
- `@simplewebauthn/browser` 14.x en el Dashboard.

La documentación oficial de SimpleWebAuthn separa el flujo en generación de opciones y verificación tanto para registro como para autenticación. citehttps://simplewebauthn.dev/docs/packages/server

## 3. Separación de fronteras

Arkhé debe terminar con tres fronteras distintas:

### Frontera H — Humano → Core

Ángel autentica mediante WebAuthn.

El Core recibe una sesión humana válida y deriva:

`actor_id = ANGEL_ID`

### Frontera S — Servicio → Core

Atlas, Aletheia y Tekton usan Ed25519, como se demostró en A.2.

### Frontera P — Proveedor → Evidencia

La procedencia de los modelos se conserva como:

- A: `provider-response-attested`;
- B: evidencia provider-side correlacionable;
- C: atestación criptográfica del proveedor, sólo si realmente existe.

Ninguna de estas fronteras sustituye a otra.

## 4. Flujo de autenticación humana

### Inicio

1. El Dashboard solicita opciones de autenticación al servidor.
2. El servidor genera un challenge aleatorio.
3. El challenge se guarda como pendiente, de un solo uso y con expiración corta.
4. El navegador invoca WebAuthn.
5. El autenticador solicita consentimiento y, con `userVerification=required`, exige verificación de usuario cuando el autenticador lo soporta.
6. El navegador envía la assertion al servidor.
7. El servidor verifica:
   - challenge esperado;
   - RP ID;
   - origin;
   - firma con la clave pública registrada;
   - credencial registrada;
   - contador de uso cuando corresponda.
8. El challenge queda consumido.
9. El servidor crea una sesión autenticada para Ángel.
10. El navegador recibe únicamente una cookie de sesión HttpOnly; nunca recibe la clave privada ni un token maestro del Core.

WebAuthn recomienda generar el challenge en servidor, comprobarlo durante la verificación e invalidarlo después de su uso. También exige validar el origin esperado. citehttps://developer.mozilla.org/en-US/docs/Web/Security/Authentication/Passkeyshttps://developer.mozilla.org/en-US/docs/Web/API/PublicKeyCredentialRequestOptions

## 5. Sesión

No se reutilizará `ARKHE_CORE_TOKEN` como sesión del Dashboard.

Se propone una sesión **opaca y revocable**:

- cookie: `__Host-arkhe-session`;
- `Secure`;
- `HttpOnly`;
- `SameSite=Strict`;
- `Path=/`;
- valor aleatorio de alta entropía;
- servidor guarda únicamente un hash del identificador de sesión;
- expiración absoluta corta;
- expiración por inactividad;
- revocación inmediata.

La sesión debe representar:

`session → human_user → ANGEL_ID`

No:

`session → actor_id proporcionado por el navegador`

## 6. Registro inicial de passkey

Existe un problema especial: antes del primer registro todavía no tenemos una identidad humana autenticada.

Por ello habrá una fase de **bootstrap de una sola vez**.

### Bootstrap controlado

- se habilita temporalmente una credencial de provisioning de alta entropía;
- sólo permite iniciar el registro de la primera passkey;
- tiene expiración corta;
- tiene límite de intentos;
- queda invalidada al registrar la primera credencial;
- después se elimina del entorno de producción.

El bootstrap no será un mecanismo cotidiano de login.

Una vez terminada la instalación inicial, el acceso normal será exclusivamente WebAuthn.

### Redundancia

Registrar al menos dos credenciales independientes:

- una passkey principal;
- una passkey de recuperación.

El sistema debe permitir revocar una credencial perdida sin invalidar necesariamente las demás.

## 7. RP ID y origin

Se usarán explícitamente dos valores de configuración:

`ARKHE_WEBAUTHN_RP_ID`

`ARKHE_WEBAUTHN_ORIGIN`

Estos valores deberán corresponder al dominio de producción estable.

No se registrará una passkey de producción sobre una URL de preview de Vercel porque una preview no debe convertirse accidentalmente en la identidad permanente del RP.

La WebAuthn API vincula el credential a un RP ID y verifica que dicho RP ID sea compatible con el origen que ejecuta la ceremonia. citehttps://developer.mozilla.org/en-US/docs/Web/Security/Authentication/Passkeyshttps://developer.mozilla.org/en-US/docs/Web/API/PublicKeyCredentialRequestOptions

## 8. Modelo de datos propuesto

### `arkhe_human_credentials`

Campos conceptuales:

- `id`
- `user_id`
- `credential_id`
- `public_key`
- `counter`
- `transports`
- `name`
- `created_at`
- `last_used_at`
- `revoked_at`

La clave privada nunca se almacena en Arkhé.

### `arkhe_webauthn_challenges`

Campos conceptuales:

- `id`
- `user_id`
- `challenge`
- `purpose` (`registration` / `authentication`)
- `expires_at`
- `used_at`
- `created_at`

Regla:

`used_at IS NULL ∧ expires_at > now()`

debe ser requisito para aceptar una respuesta.

### `arkhe_human_sessions`

Campos conceptuales:

- `id`
- `session_hash`
- `user_id`
- `created_at`
- `last_seen_at`
- `expires_at`
- `revoked_at`

El valor de sesión enviado al navegador será el secreto; la base conservará sólo su hash.

## 9. Endpoints propuestos

### `POST /api/auth/webauthn/options`

Genera challenge de autenticación.

### `POST /api/auth/webauthn/verify`

Verifica assertion y crea sesión.

### `POST /api/auth/webauthn/register-options`

Genera opciones de registro para una persona ya autorizada por el bootstrap.

### `POST /api/auth/webauthn/register-verify`

Verifica y almacena la nueva credencial.

### `POST /api/auth/logout`

Revoca la sesión actual.

### `GET /api/auth/session`

Devuelve sólo el estado de sesión mínimo necesario para el UI.

## 10. Cambio crítico en Core

Actualmente las acciones de gobierno llaman a:

`requireAngel(body.actor_id)`

Ese diseño será reemplazado.

La forma objetivo es:

`requireHumanSession(req)`

seguido de:

`const actorId = ANGEL_ID`

Las acciones:

- `iniciar_ronda`
- `convocar_investigadores`
- `abrir_debate`
- `pausar_ronda`
- `cerrar_ronda`
- `cancelar_ronda`

no deben confiar en `body.actor_id`.

Si el cliente envía:

`actor_id = otro-uuid`

el Core simplemente ignorará esa declaración y seguirá usando la identidad de la sesión autenticada.

## 11. Control del Dashboard completo

A.4 no debe limitarse al botón de “iniciar ronda”.

Si el objetivo es que una persona no autorizada **no pueda entrar al proyecto**, habrá que revisar todas las superficies privadas del Dashboard.

Criterio de cierre:

- ningún dato privado se expone sólo porque el visitante conozca una URL;
- ningún endpoint de gobierno acepta `actor_id` como autoridad;
- las rutas privadas exigen sesión humana;
- las operaciones de gobierno requieren sesión válida;
- el navegador no recibe secretos de infraestructura;
- cualquier acceso directo a Supabase desde el navegador debe evaluarse: si expone datos privados, debe pasar por una API autenticada o por una autorización equivalente.

RLS queda fuera de este cambio, respetando la decisión vigente. A.4 será una frontera de autenticación/autorización de aplicación.

## 12. CSRF y sesión

Como la autenticación usará cookie HttpOnly, las operaciones que cambian estado deberán incorporar defensa contra CSRF.

Mínimo:

- `SameSite=Strict`;
- comprobación de `Origin` / `Referer` apropiada;
- métodos de mutación exclusivamente POST;
- token CSRF o mecanismo equivalente cuando la operación y el despliegue lo hagan necesario.

## 13. Reautenticación de acciones sensibles

La sesión normal podrá mantenerse durante la navegación, pero ciertas acciones críticas podrán exigir una ceremonia WebAuthn reciente.

Candidatas:

- cerrar ronda;
- cancelar ronda;
- eliminar/revocar credenciales;
- modificar configuración de seguridad;
- registrar una nueva passkey.

Esto crea una segunda barrera:

`sesión válida + autenticación reciente`

## 14. Amenazas y contrapruebas A.4

La suite adversarial deberá intentar:

1. entrar sin sesión;
2. falsificar `actor_id`;
3. reutilizar una assertion;
4. usar un challenge expirado;
5. usar un challenge para otra finalidad;
6. presentar una credencial no registrada;
7. modificar la assertion;
8. utilizar la ceremonia desde un origin incorrecto;
9. reutilizar una sesión revocada;
10. modificar una acción de gobierno después de autenticarse;
11. intentar registrar una nueva passkey sin autorización;
12. usar una credencial revocada;
13. acceder directamente a endpoints privados sin pasar por el gate de sesión.

Objetivo:

**todas las contrapruebas deben fallar de forma reproducible.**

## 15. Node.js

El proyecto actual usa Node 20 en CI.

La versión actual 14.x de SimpleWebAuthn requiere Node LTS 22 o superior. Vercel ya deshabilitó Node 20 para nuevas configuraciones de Builds y Functions desde el 1 de octubre de 2026 y recomienda migrar; Node 24.x está disponible como runtime de Vercel. citehttps://www.npmjs.com/package/%40simplewebauthn/serverhttps://vercel.com/changelog/node-js-20-is-being-deprecatedhttps://vercel.com/changelog/node-js-24-lts-is-now-generally-available-for-builds-and-functions

Por tanto, A.4 deberá aprovechar el cambio y fijar una versión moderna de Node, preferentemente `24.x`, en:

- `package.json` (`engines`);
- CI;
- desarrollo local;
- configuración/runtime de Vercel donde aplique.

## 16. Criterios de cierre A.4

A.4 sólo podrá declararse cerrada cuando:

- exista al menos una passkey real registrada;
- la autenticación real funcione contra producción/entorno de prueba;
- una assertion válida cree una sesión de Ángel;
- una assertion inválida sea rechazada;
- el challenge sea de un solo uso;
- origin/RP ID incorrectos sean rechazados;
- `actor_id` del cuerpo deje de ser una autoridad;
- las acciones de gobierno dependan de la sesión criptográficamente autenticada;
- sesiones revocadas no funcionen;
- las rutas privadas del Dashboard estén protegidas;
- las contrapruebas adversariales pasen;
- CI quede verde;
- no queden secretos de bootstrap activos;
- exista mecanismo de recuperación mediante una segunda credencial.

## 17. Regla metodológica Arkhé

No declararemos:

> “Ángel está autenticado”

porque el Dashboard muestre su nombre.

Declararemos:

> “Core verificó una assertion WebAuthn válida, vinculada al RP/origin esperado y a una credencial registrada para ANGEL_ID, y creó una sesión cuyo principal fue fijado por servidor.”

Esa es la evidencia que queremos poder demostrar.

## 18. Estado

**A.4 — DISEÑADA, NO IMPLEMENTADA.**

No se ha cambiado todavía:

- `main`;
- RLS;
- autenticación productiva;
- credenciales de producción;
- passkeys reales;
- acciones de gobierno.

El siguiente paso de implementación será crear el modelo de datos y el módulo WebAuthn en la rama `audit/a4-human-auth`, antes de sustituir los guards de gobierno.
