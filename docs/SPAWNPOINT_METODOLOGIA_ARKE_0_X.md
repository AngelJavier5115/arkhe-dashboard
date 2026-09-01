# Spawnpoint — Metodología Arkhé v0.x

**Fecha de congelación:** 2026-09-01
**Estado:** VALIDACIÓN FUNCIONAL CONTROLADA COMPLETADA
**Proyecto:** Arkhé / Arkane

## Propósito

Este documento marca un punto de congelación conceptual y técnico después de una prueba controlada de la metodología de investigación de los cuatro investigadores: Ángel, Atlas, Aletheia y Tekton.

El spawnpoint no declara que el sistema esté terminado ni que sea robusto para producción a gran escala. Declara que el protocolo probado funciona y queda como base reproducible para la siguiente etapa.

## Protocolo validado

1. Ángel inicia la investigación y conserva el control del ciclo.
2. Un investigador puede aportar una perspectiva independiente.
3. Ángel puede analizar las perspectivas y decidir si abre una nueva ronda.
4. Ángel puede dirigir una réplica a un investigador específico y a una intervención específica.
5. La réplica se registra como una nueva ronda con relación a su ronda padre.
6. La intervención de réplica conserva `responde_a_intervencion_id` para mantener trazabilidad explícita.
7. La réplica no abre automáticamente otra ronda.
8. Los investigadores no modifican por sí mismos el estado colectivo ni fuerzan consenso.
9. Las posiciones pueden permanecer provisionales o declarar insuficiencia de información.
10. La conclusión final permanece bajo conducción humana.

## Prueba final ejecutada

### Nodo ancla
- Nodo: `#23`
- Estado antes/después de la prueba: `postulado`
- Autor: Aletheia

### Ronda 1
- UUID: `8250b994-c1b1-40ca-8483-71444387176e`
- Número: `1`
- Tipo: `consulta`
- Investigador: Atlas

### Ronda 2
- UUID: `0cd259ff-40ed-400f-ac59-a68040f99ac3`
- Número: `2`
- Tipo: `consulta`
- Investigador: Aletheia
- Intervención objetivo de la réplica: `c194b6f4-0acb-4443-ab6a-517876a24b97`

### Ronda 3
- UUID: `0244d458-ce77-4579-80c2-852c1c0838a8`
- Número: `3`
- Tipo: `replica`
- Estado: `abierta`
- Ronda padre: `#2`
- Destinatario: Tekton
- Iniciada por: Ángel
- Nodo ancla: `#23`

### Intervención de Aletheia
- UUID: `c194b6f4-0acb-4443-ab6a-517876a24b97`
- Investigador: Aletheia
- Ronda: `#2`

### Intervención de Tekton
- UUID: `89f5aba6-52f6-4c2d-84d5-54dbc213e6d0`
- Investigador: Tekton
- Tipo: `replica`
- Ronda: `#3`
- `responde_a_intervencion_id`: `c194b6f4-0acb-4443-ab6a-517876a24b97`
- `nodo_id`: `23`

## Invariantes comprobados

- [x] Nodo #23 no cambió de estado.
- [x] Existen exactamente tres rondas en el escenario probado.
- [x] La ronda #3 es una réplica dirigida.
- [x] La ronda #3 tiene como padre la ronda #2.
- [x] La réplica apunta exactamente a la intervención de Aletheia.
- [x] La intervención de Tekton quedó registrada correctamente.
- [x] La intervención de Tekton quedó vinculada al nodo #23.
- [x] No apareció una ronda #4 automáticamente.
- [x] No hubo bucle automático entre investigadores.
- [x] El estado colectivo no fue alterado por la réplica.

## Veredicto

**VALIDADO FUNCIONALMENTE EN ESCENARIO CONTROLADO.**

La evidencia permite afirmar que el protocolo humano-dirigido de perspectiva → análisis humano → réplica dirigida → trazabilidad explícita → ausencia de continuación automática funciona en el escenario probado.

No permite afirmar todavía robustez epistemológica general, escalabilidad, resiliencia ante contradicciones sistemáticas, comportamiento bajo concurrencia masiva ni preparación para producción.

## Hallazgos pendientes de robustez

Tekton identificó como líneas futuras:

1. Política de resolución de contradicciones.
2. Mecanismo de filtrado y clasificación de ruido.
3. Auditoría del sesgo de consenso.
4. Pruebas de escalabilidad y concurrencia.
5. Gobernanza y versionado de grafos mediante `ref_id`.
6. Auditoría de trazabilidad y mecanismos de recuperación/rollback.

Estos puntos **no invalidan el protocolo validado**; quedan explícitamente fuera del alcance de este spawnpoint y deberán abordarse en etapas posteriores.

## Estado de desarrollo congelado

A partir de este spawnpoint no se deben realizar cambios centrales a la metodología validada sin abrir una nueva etapa de desarrollo y documentar la modificación.

La siguiente etapa puede investigar robustez, seguridad, concurrencia, grafos complejos, canales de comunicación adicionales y mejoras de infraestructura, pero debe tomar este documento como referencia del estado conocido y validado.

## Cambios relevantes previos al spawnpoint

Tekton incorporó `/tekton-ronda` para permitir réplicas dirigidas por Ángel. El cambio fue realizado en `AngelJavier5115/tekton-bot` mediante el commit:

`1459255770c90a94fd1fa68f8b5f5c5d30b1c521`

Mensaje: `feat: add human-directed Tekton replica rounds`

La funcionalidad conserva los comandos existentes y añade la capacidad de responder a una intervención concreta sin iniciar automáticamente otra ronda.

## Nota de seguridad

RLS permanece deshabilitado durante esta etapa experimental por decisión explícita del proyecto. Esto es una deuda de seguridad y debe resolverse antes de considerar el sistema listo para exposición pública o producción. No forma parte de la validación funcional de este spawnpoint.

## Regla del spawnpoint

**Este estado es una base de referencia, no un final.**

Toda futura modificación debe poder responder: qué cambia, por qué cambia, qué evidencia lo motiva y contra qué invariantes se vuelve a probar.
