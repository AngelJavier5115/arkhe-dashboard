# Tlacuilo — criterio de custodia para operaciones técnicas

**Revisión de continuidad:** 2026-10-11  
**Rama de código:** `security/tlacuilo-delegation`  
**Estado:** prototipo aislado; no fusionado a `main` ni activado en producción.

Este documento distingue el estado observado de lo que aún está pendiente. No autoriza nuevas escrituras epistemológicas, despliegues productivos ni cambios constitucionales del proyecto.

## Raíz conceptual

El Archivo Maestro de Arkhé documenta el **Protocolo de Custodia del Proyecto** y distingue entre:

- **Cambios operativos:** pruebas, herramientas o ajustes que se pueden realizar y evaluar.
- **Cambios constitucionales:** modificaciones del propósito, identidad, principios o metodología central, que requieren activar la custodia.

Las tres perspectivas de custodia son Ángel (realidad y visión), Atlas (coherencia e integración) y Aletheia (rigor y evaluación crítica). No son una fila de aprobaciones para cada tarea operativa: la custodia protege la identidad de Arkhé, no paraliza su evolución ni gobierna a los investigadores.

La implementación de Tlacuilo es una propuesta técnica inspirada en ese principio, no una afirmación de que cada detalle de software se acordara históricamente en la conversación original. La referencia histórica literal al nombre aún puede ampliarse si recuperamos esa conversación.

## Mandato limitado

Tlacuilo es un ejecutor restringido y guardián de condiciones; no es un investigador autónomo ni un gobernador del proyecto.

Su única política inicial es intentar la propuesta `#5 → #6`, tipo `duplicates`, con afirmación y evidencia textual fijas:

- **Ejecutor autenticado:** servicio `tlacuilo`, identidad criptográfica distinta de Atlas.
- **Investigador al que se atribuye la propuesta:** Atlas, por delegación fija del lado del servidor.
- **Política:** `tlacuilo-smoke-relation-5-6-duplicates-v1`.

La petición no puede escoger libremente investigador, nodo, tipo, evidencia, destino o política. La procedencia registra tanto el servicio ejecutor como la identidad delegada. Tlacuilo no firma como Atlas.

## Invariantes de custodia

1. **Preflight de solo lectura primero.** Comprobar destino, textos exactos de los nodos y ausencia de relación en ambas direcciones antes de reservar la escritura.
2. **Denegación por defecto.** Cualquier diferencia en texto, nodo, tipo, URI, evidencia, política o destino detiene la ejecución.
3. **No autoautorización.** Una confirmación en un workflow no sustituye a los límites del servidor ni a la decisión humana.
4. **Identidad separada.** Tlacuilo usa su identidad de servicio propia y sólo la delegación descrita.
5. **Vía única de escritura.** El ejecutor llama a la API de Preview; nunca inserta directamente en las tablas semánticas ni llama RPC de escritura con una clave de base de datos.
6. **Sin repetición automática.** Si la respuesta es ambigua o falla la comprobación posterior, parar y reconciliar manualmente.
7. **Registro comprobable.** La propuesta requiere relación y evento esperados, con Atlas como investigador delegado y Tlacuilo como ejecutor.
8. **Secretos protegidos.** No imprimir, adjuntar, registrar ni copiar claves privadas o bypass a repositorio, logs o chat.
9. **Sin efecto productivo.** No cambiar `main`, los servicios activos de Render ni variables de Production.
10. **Custodia humana.** La fusión, activación, aprobación de nuevas políticas y cambios constitucionales siguen bajo decisión humana.

## Estado verificado el 2026-10-11

### Preflight y datos

- El preflight firmado de solo lectura ejecutado desde iSH devolvió HTTP 200.
- La consulta posterior de solo lectura confirmó **cero filas** en `public.arkhe_semantic_relations`, **cero filas** en `public.arkhe_semantic_relation_events` y cero relaciones con la política de Tlacuilo.
- Existe un nonce de `tlacuilo` en `public.core_request_nonces`, coherente con el preflight anti-repetición observado.
- Los nodos existentes #5 y #6 conservan los textos previstos y el estado preexistente `corroborado`. Ese estado no demuestra que sean duplicados.
- La propuesta de escritura `#5 → #6` **no se ha enviado**. No se debe afirmar que la relación está registrada.

### Migraciones de Supabase

La consulta de solo lectura a la historia de migraciones de `arkhe-core` confirmó como aplicadas las siguientes migraciones semánticas y de Tlacuilo:

- `20261009210448_create_epistemic_semantic_relations`
- `20261009211409_lock_semantic_relation_direct_writes`
- `20261009214326_semantic_relation_write_api`
- `20261009214834_relock_semantic_relation_direct_writes_after_api_migration`
- `20261010225627_allow_tlacuilo_executor_nonces`
- `20261010225642_enforce_tlacuilo_policy_single_use`
- `20261011051206_tlacuilo_atomic_pair_guard`

**No volver a aplicar estas migraciones.** La barrera atómica del par también está instalada en la base compartida. Serializa las inserciones para el par no ordenado #5/#6 y bloquea la política de un solo uso si ya hay una relación en cualquiera de las direcciones; si Tlacuilo registra primero, también impide que otro escritor añada después otra relación para ese par. No probar esta protección creando escrituras adicionales sobre #5/#6.

### Configuración de Preview

- La metadata de Vercel muestra una entrada de entorno `ARKHE_TLACUILO_PUBLIC_KEY` de tipo `encrypted`, acotada al Preview de `security/tlacuilo-delegation`. Durante esta revisión no se leyó ni mostró el valor.
- El preflight firmado HTTP 200 es evidencia de que esa prueba pudo autenticarse en ese momento; no demuestra por sí sola que la clave privada siga disponible ni que toda la ruta de escritura esté validada.
- Las notas anteriores que decían que la variable pública no existía o que las migraciones seguían pendientes han quedado desactualizadas y se sustituyen por este estado.
- No se modificaron secretos ni se crearon claves durante esta revisión.

## Secuencia segura pendiente

1. Mantener la rama `security/tlacuilo-delegation` aislada; no crear un PR de integración ni fusionar a `main` como atajo.
2. Antes de configurar o volver a usar credenciales, confirmar en el entorno privado autorizado que la clave privada del ejecutor está disponible y corresponde a la clave pública de Preview. No revelar sus bytes, huella sensible ni valor secreto en el chat.
3. Ejecutar un preflight fresco de solo lectura y conservar únicamente su resultado, hora, identificadores no sensibles y comprobación de cero relaciones/eventos.
4. Revisar la API actual y la barrera de uso único antes de cualquier escritura.
5. La escritura continúa bloqueada hasta que Ángel autorice explícitamente la propuesta exacta tras revisar destino, nodos, tipo, afirmación y evidencia.
6. Si se autoriza más adelante, enviar una sola propuesta por la API; verificar HTTP 201, un único ID de relación, un evento de creación y ausencia de cambios colaterales. Ante una respuesta ambigua, no reintentar: consultar el estado y el historial manualmente.
7. Retirar credenciales temporales al terminar, según su alcance; no cambiar variables de producción.

## Criterio de aceptación de la primera propuesta

La candidata es `#5 → #6`, tipo `duplicates`. La afirmación es provisional: ambos textos hablan de arquitecturas basadas/orientadas a eventos y sincronización en tiempo real, pero #5 explicita “entre nodos” y #6 no. La evidencia es la comparación textual de esos dos registros; no hay fuente externa adjunta y no debe presentarse como verificación científica independiente.

**Estado final:** esquema, API y barrera de un solo uso existen en la rama de diseño; las migraciones citadas están aplicadas en `arkhe-core`; el preflight fue aceptado; la propuesta todavía no está escrita. Ningún punto de lo anterior autoriza producción ni convierte una relación candidata en conocimiento aprobado.
