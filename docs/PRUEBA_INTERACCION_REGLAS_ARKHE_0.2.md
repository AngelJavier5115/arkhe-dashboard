# Prueba de interacción — Reglas candidatas Arkhé 0.2

**Fecha:** 2026-09-17  
**Estado:** PRUEBA DOCUMENTAL — no incorpora reglas al núcleo vigente  
**Base:** revisión adversarial de candidatos A–F, Síntesis 3H, Excavaciones 3E–3G, Archivo Maestro v0.2 y Spawnpoint

---

## 0. Propósito

La revisión adversarial dejó cinco candidatos supervivientes:

- **A — Diagnóstico por nivel**
- **B — Complejidad justificada**, reformulado
- **D — Trazabilidad suficiente**
- **E — Modularidad de identidad**
- **F — Separación entre validación y experimento**

La presente prueba no pregunta si cada regla funciona aislada. Pregunta si pueden coexistir sin crear una arquitectura de gobernanza contradictoria, redundante o demasiado pesada.

El objetivo es detectar si una regla destruye otra cuando se aplica correctamente.

---

# I. Modelo de interacción

Las cinco reglas forman, provisionalmente, una cadena y no cinco autoridades independientes:

**A diagnostica → B decide si la complejidad merece permanecer → D conserva el contexto necesario → E permite sustituir medios sin asumir equivalencia → F protege la separación histórica entre línea base y experimento.**

Esto permite una primera observación:

> Las reglas no compiten por el mismo espacio si cada una conserva una función distinta.

Pero esta compatibilidad todavía debe probarse contra casos difíciles.

---

# II. Escenario 1 — Fallo técnico que parece fallo metodológico

### Situación

Una nueva integración produce respuestas incompletas de un investigador. El equipo inicialmente sospecha que la metodología de perspectivas independientes está fallando.

### Aplicación de A

Primero se diagnostica el nivel. Se comprueba si el problema pertenece a datos, contrato, proveedor, transporte, arquitectura o metodología.

Si se descubre que el proveedor está truncando respuestas, no se modifica la metodología.

### Aplicación de B

Si la solución requiere una nueva capa de transporte, debe identificarse su función y evaluarse posteriormente si su costo justifica mantenerla.

### Aplicación de D

Debe quedar registrado qué falló, qué diagnóstico se realizó y qué solución se probó.

### Aplicación de E

Si finalmente se sustituye el proveedor, la identidad metodológica del investigador no cambia automáticamente; se verifica nuevamente que la función que protegía el proveedor siga funcionando.

### Aplicación de F

El experimento posterior no puede convertirse retroactivamente en parte de la evidencia que validó la línea base.

### Resultado

**Compatibles.** Ninguna regla exige modificar una capa superior antes de demostrar que el problema pertenece a ella.

---

# III. Escenario 2 — Nueva herramienta experimental

### Situación

Aparece una herramienta que podría mejorar una tarea de investigación, pero todavía no existe evidencia suficiente para saber si realmente aporta valor.

### Posible conflicto B

La formulación inicial de B habría podido bloquearla porque no existe una prueba previa que justifique su incorporación.

### Resolución

La reformulación permite introducirla como experimento cuando:

- tiene función identificable;
- el costo es asumible;
- es razonablemente reversible;
- existe un criterio posterior para evaluar su permanencia.

### Aplicación de D

Se registra el estado anterior, la incorporación, el resultado y la decisión posterior.

### Aplicación de F

El experimento permanece claramente separado de la línea base anterior.

### Resultado

**Compatible después de reformular B.** Esta prueba confirma que B debe gobernar la permanencia de la complejidad, no prohibir la exploración.

---

# IV. Escenario 3 — Simplificación que destruye una capacidad

### Situación

Una capa parece redundante y se propone eliminarla.

### Aplicación de A

Primero se determina qué problema representa la capa y en qué nivel existe la supuesta redundancia.

### Aplicación de B

Se compara el costo de mantenerla contra la función que realmente aporta.

### Aplicación de D

Antes de eliminarla, debe conservarse contexto suficiente para reconstruir qué protegía y por qué se consideró redundante.

### Aplicación de E

Si la capa se reemplaza por otra, la nueva implementación debe verificarse; no se presupone equivalencia.

### Aplicación de F

El experimento de eliminación queda separado de la arquitectura que había sido validada antes.

### Resultado

**Compatible.** Aquí se confirma que C no necesita existir como regla independiente: la simplificación es una aplicación de B bajo diagnóstico A, con trazabilidad D y separación experimental F.

---

# V. Escenario 4 — Sustitución de proveedor

### Situación

El proveedor actual deja de cumplir una condición operativa y se considera sustituirlo.

### Aplicación de A

Se determina si el problema es realmente del proveedor y no de datos, contrato, transporte o arquitectura.

### Aplicación de B

Se evalúa el costo de mantener el proveedor frente al costo de migrar.

### Aplicación de D

Se registra el motivo, el estado previo, el cambio y el resultado.

### Aplicación de E

La sustitución no cambia automáticamente la identidad del investigador. Sin embargo, se deben volver a verificar las funciones metodológicas relevantes.

### Aplicación de F

La nueva configuración pertenece al estado experimental posterior hasta que exista evidencia suficiente para incorporarla al estado operativo.

### Resultado

**Compatible.** E no significa “todos los proveedores son equivalentes”; significa que la identidad metodológica no depende automáticamente de uno de ellos.

---

# VI. Escenario 5 — Un experimento posterior cuestiona el spawnpoint

### Situación

Una prueba futura descubre que una condición del protocolo que se consideraba satisfecha en el spawnpoint no estaba realmente satisfecha bajo una condición que no había sido probada.

### Conflicto aparente

F protege la integridad histórica del spawnpoint, mientras que la provisionalidad de Arkhé exige poder revisar conclusiones con nueva evidencia.

### Resolución

F no protege la conclusión. Protege el registro histórico de qué se probó y qué se consideró validado en ese momento.

Por tanto:

- el documento del spawnpoint permanece como registro histórico;
- la conclusión actual puede ser revisada;
- el nuevo experimento queda separado de la evidencia original;
- no se reescribe el pasado para hacerlo coincidir con el resultado posterior.

### Resultado

**Compatibles.** Esta distinción es necesaria para que F no se convierta en una forma de dogmatismo histórico.

---

# VII. Escenario 6 — El sistema empieza a volverse burocrático

### Situación

Las cinco reglas empiezan a producir formularios, registros y revisiones para prácticamente cualquier cambio pequeño.

### Aplicación de B

La propia complejidad de gobernanza debe justificar su existencia.

### Aplicación de D

“Trazabilidad suficiente” no significa documentar absolutamente todo.

### Aplicación de A

Se diagnostica si el problema está en las reglas, en su aplicación o en una mala clasificación del cambio.

### Resultado

**La interacción contiene su propia señal de exceso.** B y D impiden que las reglas se conviertan automáticamente en burocracia.

---

# VIII. Prueba de redundancia

Se buscó si alguna regla podía absorber completamente a otra.

### A vs. B

No son equivalentes.

A responde: **“¿dónde está el problema?”**

B responde: **“¿vale la pena mantener esta complejidad?”**

### B vs. D

No son equivalentes.

B gobierna costo/valor de estructuras.

D conserva contexto suficiente para reconstruir decisiones relevantes.

### D vs. F

No son equivalentes.

D responde: **“¿qué necesitamos conservar para reconstruir?”**

F responde: **“¿cómo evitamos mezclar retrospectivamente estados experimentales con evidencia histórica?”**

### E vs. A

No son equivalentes.

A diagnostica el nivel del problema.

E gobierna qué significa sustituir un componente técnico sin asumir que la identidad metodológica desaparece.

### Resultado

No se detecta una duplicación completa. C sigue siendo el único candidato que puede eliminarse sin pérdida porque su función ya queda cubierta por B.

---

# IX. Prueba de carga conceptual

La pregunta final es si cinco reglas nuevas transformarían Arkhé en un sistema de permisos y controles.

La respuesta provisional es **no**, con una condición:

Las reglas deben funcionar como criterios de diagnóstico y protección, no como una lista de pasos obligatorios para cada acción.

Una modificación pequeña no necesita un expediente completo.

Un cambio metodológico importante sí necesita mayor trazabilidad.

Un experimento reversible puede tener documentación ligera.

Una modificación que altere una condición validada necesita documentación y prueba más fuertes.

Por tanto, la carga debe ser proporcional a la relevancia del cambio.

---

# X. Resultado de la prueba de interacción

## A — Diagnóstico por nivel

**SUPERADO PROVISIONALMENTE.**

No entra en conflicto con las demás y funciona como regla de diagnóstico previa.

## B — Complejidad justificada

**SUPERADO PROVISIONALMENTE, reformulado.**

Debe permitir experimentación reversible y gobernar la permanencia de complejidad.

## D — Trazabilidad suficiente

**SUPERADO PROVISIONALMENTE.**

Debe conservar contexto mínimo necesario, no documentación exhaustiva.

## E — Modularidad de identidad

**SUPERADO PROVISIONALMENTE.**

Debe incluir reverificación después de sustituciones técnicas.

## F — Separación entre validación y experimento

**SUPERADO PROVISIONALMENTE.**

Protege integridad histórica, no conclusiones inmunes a nueva evidencia.

## C — Simplificación como progreso

**DESCARTADO COMO REGLA INDEPENDIENTE.**

Su contenido queda absorbido dentro de B.

---

# XI. Conclusión

La interacción no encontró una contradicción estructural entre A, B, D, E y F.

Más importante todavía: las cinco parecen describir **niveles diferentes de una misma disciplina de construcción**:

> **diagnosticar correctamente → decidir qué complejidad merece permanecer → conservar contexto suficiente → sustituir medios sin confundirlos con identidad → separar siempre lo experimentado de lo históricamente validado.**

Sin embargo, esta prueba sigue siendo documental. No constituye evidencia experimental de que las reglas funcionen bajo investigación científica profunda, alta concurrencia, múltiples contradicciones o exposición pública.

Por ello, el resultado correcto todavía no es “reglas activadas”. El resultado correcto es:

> **cinco candidatas sobreviven juntas a una prueba conceptual de interacción y quedan listas para una decisión explícita de incorporación o para ser sometidas a experimentos reales.**

---

# XII. Estado posterior a esta prueba

- Archivo Maestro v0.2: **sin modificación**.
- Spawnpoint: **sin modificación**.
- Reglas candidatas A–F: **sin convertir automáticamente en reglas vigentes**.
- C: **descartado como regla independiente**, conservando su contenido dentro de B.
- A, B, D, E y F: **candidatas supervivientes**.
- Próximo paso: preparar, si corresponde, una propuesta formal de incorporación a Arkhé 0.2 que conserve la distinción entre evidencia histórica, regla vigente y propuesta nueva.
