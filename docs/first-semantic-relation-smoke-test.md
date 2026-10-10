# Primera prueba real de relación semántica — nodos #5 y #6

**Estado:** preparación autorizada; una escritura requiere autorización final de Ángel después de revisar API, esquema, credenciales y preflight.  
**Fecha de autorización:** 2026-10-10  
**Rama:** \`security/tlacuilo-delegation\`  
**Entorno:** Vercel Preview + Supabase de Arkhé  
**No-go:** no tocar \`main\`, no usar la clave de servicio desde el navegador y no crear datos ficticios.

## Qué autorizó Ángel

Usar exclusivamente los nodos existentes **#5** y **#6** para la primera prueba real de registro semántico. La relación candidata es \`duplicates\`, como **propuesta provisional** basada en una comparación textual. No constituye una aprobación científica ni una conclusión irreversible.

- Nodo #5: “El uso de arquitecturas basadas en eventos optimiza la sincronización entre nodos en tiempo real.”
- Nodo #6: “El uso de arquitecturas orientadas a eventos optimiza la sincronización en tiempo real.”

Ambos existen en \`public.investigaciones\` y actualmente figuran como \`corroborado\`; ese estado preexistente no demuestra por sí solo que sean duplicados.

## Propuesta exacta a registrar

Dirección: #5 → #6  
Tipo: \`duplicates\`

Afirmación:
> Los nodos #5 y #6 parecen expresar la misma afirmación general: que las arquitecturas basadas u orientadas a eventos favorecen la sincronización en tiempo real. Con los textos disponibles no se aprecia una diferencia conceptual clara entre ambos registros; la relación queda como propuesta y puede ser discutida o rechazada.

Evidencia textual:
> Comparación directa de los registros existentes. El nodo #5 afirma que las arquitecturas basadas en eventos optimizan la sincronización “entre nodos en tiempo real”; el nodo #6 afirma que las arquitecturas orientadas a eventos optimizan la sincronización “en tiempo real”. Coinciden en la idea central y difieren en formulación y alcance explícito (“entre nodos”). No se ha aportado una fuente externa en esta prueba; la clasificación se apoya sólo en el texto de ambos nodos y no equivale a verificación externa.

Evidence URI: null (no inventar una fuente).  
Evidence node ID: null (la evidencia comparativa corresponde al par completo).  
Supersedes relation ID: null.  
Provider/model/run reference: null; no atribuir un modelo o proveedor que no haya sido observado y correlacionado.

Cuerpo JSON esperado:

    {
      "action": "create",
      "source_node_id": 5,
      "target_node_id": 6,
      "relation_type": "duplicates",
      "assertion": "Los nodos #5 y #6 parecen expresar la misma afirmación general: que las arquitecturas basadas u orientadas a eventos favorecen la sincronización en tiempo real. Con los textos disponibles no se aprecia una diferencia conceptual clara entre ambos registros; la relación queda como propuesta y puede ser discutida o rechazada.",
      "evidence_text": "Comparación directa de los registros existentes. El nodo #5 afirma que las arquitecturas basadas en eventos optimizan la sincronización entre nodos en tiempo real; el nodo #6 afirma que las arquitecturas orientadas a eventos optimizan la sincronización en tiempo real. Coinciden en la idea central y difieren en formulación y alcance explícito (entre nodos). No se ha aportado una fuente externa en esta prueba; la clasificación se apoya sólo en el texto de ambos nodos y no equivale a verificación externa.",
      "evidence_node_id": null,
      "evidence_uri": null,
      "provider": null,
      "model": null,
      "run_ref": null,
      "supersedes_relation_id": null
    }

## Cómo debe ejecutarse

1. Generar la pareja Ed25519 en un entorno local confiable: la clave privada sólo residirá en el entorno privado del ejecutor; nunca se copia al navegador, repositorio o chat. La clave pública sólo se configura en el Preview aprobado.
2. La API del Preview vuelve a verificar los textos actuales de ambos nodos y que no exista una relación previa en ninguna dirección. Si no puede comprobarlo o hay discrepancias, aborta antes de reservar la escritura.
3. Confirmar que las migraciones `20261010225627_allow_tlacuilo_executor_nonces.sql` y `20261010225642_enforce_tlacuilo_policy_single_use.sql` fueron revisadas y aplicadas deliberadamente antes de habilitar una escritura.
4. Enviar la única propuesta al endpoint `POST /api/semantic-relations` del Preview protegido de Vercel de la rama `security/tlacuilo-delegation`.
5. Verificar HTTP 201 y conservar el ID devuelto.
6. Consultar Supabase y confirmar exactamente una relación #5 → #6 de tipo `duplicates`, atribuida a Atlas, autenticada como Tlacuilo y con un solo evento `relation_created`.
7. Confirmar que no cambió ningún otro nodo, relación o evento. Si el resultado es ambiguo, no reintentar; inspeccionar la relación y el historial manualmente.

## Estado actual

La propuesta del par está documentada. La petición firmada real aún no se ejecuta. El límite de una única relación por política se apoyará en el índice único de la migración `20261010225642_enforce_tlacuilo_policy_single_use.sql`; hasta que ambas migraciones estén revisadas y aplicadas, no se autoriza ninguna escritura. En el último chequeo había cero filas en \`arkhe_semantic_relations\` y cero en \`arkhe_semantic_relation_events\`; no escribir nada hasta que el cliente firmado y el acceso autorizado estén disponibles.
