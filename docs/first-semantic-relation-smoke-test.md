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

1. Usar un cliente autorizado de A.2 que firme el cuerpo completo con Ed25519 usando su clave privada en su entorno de servidor. Nunca copiar esa clave a un navegador, GitHub, el repositorio o el chat.
2. Enviar la petición al endpoint \`POST /api/semantic-relations\` del Preview protegido de Vercel de la rama `security/tlacuilo-delegation`.
3. Verificar HTTP 201 y conservar el ID devuelto.
4. Consultar Supabase y confirmar exactamente una relación con source #5, target #6, type \`duplicates\`, el investigador derivado de la firma y la procedencia marcada como no verificada independientemente.
5. Confirmar un solo evento \`relation_created\` para ese ID.
6. Confirmar que no cambió ningún otro nodo, relación o evento.
7. Si no hay acceso autorizado al cliente de firma o al Preview, detenerse. No sustituir este procedimiento por una escritura SQL administrativa o un atajo que evite la autenticación.

## Estado actual

La propuesta del par está documentada. La petición firmada real aún no se ejecuta. El límite de una única relación por política se apoyará en el índice único de la migración `20261010103000_enforce_tlacuilo_policy_single_use.sql`; hasta que ambas migraciones estén revisadas y aplicadas, no se autoriza ninguna escritura. En el último chequeo había cero filas en \`arkhe_semantic_relations\` y cero en \`arkhe_semantic_relation_events\`; no escribir nada hasta que el cliente firmado y el acceso autorizado estén disponibles.
