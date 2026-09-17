# Reglas candidatas — Arkhé 0.2

**Fecha:** 2026-09-17  
**Estado:** CANDIDATAS — no vigentes automáticamente  
**Origen:** Síntesis de la Excavación 3H

---

## Propósito

Este documento no modifica por sí mismo la metodología vigente.

Su función es separar los patrones históricos que parecen suficientemente repetidos para merecer una discusión explícita antes de incorporarlos al núcleo de Arkhé 0.2.

La regla de gobierno es:

> **Una regularidad observada no se convierte automáticamente en principio. Primero se formula, se contrasta y se decide conscientemente.**

---

## Candidato A — Diagnóstico por nivel

**Propuesta:**

> Antes de modificar un principio por un fallo, localizar si el problema pertenece a datos, contrato, implementación, proveedor, transporte, arquitectura o metodología.

**Por qué aparece:** UUID inconsistente, separación nodo/ronda, cambio DeepSeek → Groq, parámetro `reasoning_effort`, rutas redundantes y límites de Discord mostraron que distintos problemas pueden parecer similares desde fuera.

**Qué protege:** evita corregir un fallo local destruyendo o alterando innecesariamente una decisión metodológica superior.

**Estado:** pendiente de validación consciente.

---

## Candidato B — Complejidad justificada

**Propuesta:**

> No incorporar una nueva capa, herramienta o automatización sin una necesidad demostrable, una función clara y una prueba que justifique su costo.

**Por qué aparece:** varias soluciones útiles terminaron reducidas, separadas o retiradas cuando se comprobó que introducían más acoplamiento que valor.

**Qué protege:** claridad, mantenibilidad, trazabilidad y capacidad de investigación.

**Estado:** pendiente de validación consciente.

---

## Candidato C — Simplificación como progreso

**Propuesta:**

> Eliminar redundancia, acoplamiento o complejidad innecesaria cuenta como una forma válida de construir Arkhé.

**Por qué aparece:** retiro de `tekton-evaluar`, separación del adaptador Discord, separación nodo/ronda/intervención y separación de niveles documentales.

**Qué protege:** que “avanzar” no signifique únicamente agregar funciones.

**Estado:** pendiente de validación consciente.

---

## Candidato D — Trazabilidad suficiente

**Propuesta:**

> Toda decisión o transformación importante debe conservar contexto suficiente para reconstruir su origen, motivo, cambio, resultado y decisión posterior.

**Por qué aparece:** la trazabilidad terminó siendo necesaria tanto para la memoria como para las rondas, intervenciones, réplicas y experimentos posteriores al spawnpoint.

**Qué protege:** continuidad, auditoría y posibilidad de aprender del pasado.

**Importante:** “suficiente” no significa registrar absolutamente todo.

**Estado:** pendiente de formalización transversal.

---

## Candidato E — Modularidad de identidad

**Propuesta:**

> Los componentes técnicos pueden reemplazarse siempre que las funciones metodológicas que protegen permanezcan explícitas y verificables.

**Por qué aparece:** cambio de proveedor de Tekton, separación de canales y evolución de la infraestructura sin sustituir automáticamente la identidad del investigador.

**Qué protege:** continuidad metodológica frente a cambios tecnológicos.

**Estado:** pendiente de formalización arquitectónica.

---

## Candidato F — Separación entre validación y experimento

**Propuesta:**

> Ningún experimento posterior debe retroactivamente convertirse en parte de la evidencia que validó una línea base anterior.

**Por qué aparece:** el spawnpoint funciona como referencia histórica protegida y los cambios posteriores deben distinguirse de aquello que originalmente fue probado.

**Qué protege:** rigor histórico y epistemológico.

**Estado:** pendiente de validación mediante futuros experimentos.

---

## Cómo decidir

Cada candidato deberá pasar por una revisión separada:

1. ¿El patrón realmente se repite?
2. ¿Qué problema concreto resuelve?
3. ¿Qué riesgo introduce si se convierte en regla?
4. ¿Puede formularse de manera suficientemente clara para ser comprobable?
5. ¿Ya existe otra regla que cubra el mismo problema?
6. ¿Podemos diseñar una prueba o escenario que pueda refutarlo?
7. ¿Su incorporación aumenta la capacidad de Arkhé sin desplazar su propósito?

Una respuesta negativa no obliga a eliminar el candidato. Puede mantenerlo como hipótesis metodológica o registro histórico.

---

## Estado documental

Hasta que Ángel cierre esta revisión, estos seis elementos **no deben tratarse como reglas vigentes de Arkhé 0.2**.

La síntesis 3H permanece como evidencia del patrón histórico que motivó su formulación.

La decisión de convertirlos en reglas, modificarlos o conservarlos como candidatos pertenece a la siguiente etapa metodológica.
