# Tlacuilo — criterio de custodia para operaciones técnicas

**Estado:** propuesta de implementación en rama aislada `security/tlacuilo-delegation`. No está aplicada a Supabase ni desplegada en producción.

## Raíz conceptual

El Archivo Maestro de Arkhé documenta el **Protocolo de Custodia del Proyecto** y distingue entre:
- **Cambios operativos:** pruebas, herramientas o ajustes que pueden realizarse y evaluarse.
- **Cambios constitucionales:** alteraciones del propósito, identidad, principios o metodología central, que requieren activar la custodia.

También define tres perspectivas de custodia: Ángel (realidad y visión), Atlas (coherencia e integración) y Aletheia (rigor y evaluación crítica). Esas perspectivas no deben ponerse en una fila de aprobaciones para toda tarea operativa: la custodia protege la identidad de Arkhé, no paraliza su evolución ni controla a sus investigadores.

La implementación presente traduce ese principio a un mecanismo técnico para una prueba de operación. Es una propuesta inspirada en ese protocolo, no una afirmación de que todos los detalles de software estuvieran ya acordados en la conversación original sobre Tlacuilo con Tekton. La referencia histórica literal a ese nombre sigue pendiente de recuperar.

## Mandato limitado

Tlacuilo es un ejecutor y guardián de condiciones, no un investigador autónomo ni un gobernador del proyecto.

Para la prueba inicial, su único mandato es intentar la propuesta #5 → #6, tipo `duplicates`, con una afirmación y evidencia fija revisadas. El servidor aplica la restricción, no confía en el workflow como único control.

La identidad queda separada:
- **Ejecutor autenticado:** servicio `tlacuilo`, clave Ed25519 propia.
- **Investigador al que se atribuye la propuesta:** Atlas, según una delegación fijada del lado del servidor.
- **Política:** `tlacuilo-smoke-relation-5-6-duplicates-v1`.

La procedencia registra el servicio ejecutor, el investigador delegado y el identificador de política. Tlacuilo no firma como Atlas ni puede escoger a quién atribuirse en el cuerpo de la petición.

## Invariantes

1. **Preflight de solo lectura primero.** Verifica el destino de Supabase, los textos exactos de los nodos y que no haya una relación en ninguna dirección. Comprueba también permisos de lectura de los campos necesarios para verificar después. No escribe.
2. **Denegación por defecto.** Cualquier texto, nodo, tipo, URI, proveedor, modelo, referencia, destino o política distinta aborta.
3. **No autoautorización.** La marca de confirmación del workflow no sustituye a los límites de la API ni a la aprobación humana.
4. **Identidad diferenciada.** Tlacuilo tiene un servicio y una clave distintos de Atlas; la delegación sólo se aplica a la política descrita.
5. **Vía de escritura única.** El ejecutor llama la API de Preview; nunca inserta directamente en las tablas semánticas ni llama RPCs de escritura con una clave de base de datos.
6. **No repetición automática.** Si la respuesta es ambigua o falla la verificación posterior, se detiene para revisión humana.
7. **Registro comprobable.** Se exige relación y evento esperado, con Atlas como investigador delegado y Tlacuilo como ejecutor.
8. **Secretos fuera del código.** Clave privada y bypass nunca se imprimen, suben como artefacto ni se copian a esta conversación.
9. **Cero efecto productivo.** No se cambia `main`, el servicio activo de Render ni variables de Production.
10. **Custodia humana.** La fusión, despliegue, aprobación de nuevas políticas y cualquier cambio constitucional siguen requiriendo decisión humana.

## Plan de aplicación

1. Terminar pruebas estáticas/API en ramas aisladas.
2. Revisar la rama y el PR de la API; la migración que añade `tlacuilo` al allowlist de nonces es una propuesta y **no se ha aplicado** a la base de datos compartida.
3. Alojar el runner en un repositorio **privado dedicado** antes de configurar secretos. `atlas-bot` es público; por tanto, no deben almacenarse secretos de ejecución en ese repositorio.
4. Crear un entorno protegido con aprobación manual y secretos de alcance mínimo.
5. Registrar una pareja Ed25519 creada fuera de GitHub: pública sólo en Vercel Preview de `design/tree-network-dashboard` como `ARKHE_TLACUILO_PUBLIC_KEY`; privada sólo como secreto del executor privado.
6. Correr preflight de solo lectura y revisar el informe.
7. Sólo después, Ángel autoriza la única escritura aprobada.
8. Verificar resultado e historial, retirar el bypass temporal y eliminar credenciales efímeras.

## Límites actuales

- No se han creado ni configurado claves para Tlacuilo.
- El valor de `ARKHE_TLACUILO_PUBLIC_KEY` todavía no existe en la configuración activa de Vercel; la variable previa `ARKHE_ATLAS_PUBLIC_KEY` está vacía y deshabilitada en Preview.
- La restricción de servicio de `core_request_nonces` en la base actual permite `atlas`, `aletheia` y `tekton`, pero todavía no `tlacuilo`. La migración nueva debe revisarse y aplicarse explícitamente antes de ejecutar la prueba; no se ha aplicado.
- El workflow de ejecución necesita trasladarse al repo privado dedicado o una decisión explícita para cambiar su ubicación. No se debe fusionar a `main` para “desbloquear” la ejecución.
- En este momento ninguna relación semántica ha sido creada por Tlacuilo.
