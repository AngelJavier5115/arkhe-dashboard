# Revisión adversarial — Reglas candidatas Arkhé 0.2

**Fecha:** 2026-09-17  
**Base:** `docs/REGLAS_CANDIDATAS_ARKHE_0.2.md`, `docs/SINTESIS_EXCAVACION_ARKHE_v0.1.md`, `docs/ARCHIVO_MAESTRO_ARKHE_v0.2.md`  
**Estado:** REVISIÓN — no modifica todavía las reglas vigentes

---

## 0. Objetivo de esta revisión

La excavación 3H produjo seis candidatos. Esta etapa intenta hacer algo distinto a justificar su incorporación: busca encontrar las condiciones bajo las cuales cada candidato sería falso, peligroso, redundante o demasiado costoso.

La pregunta no es **“¿suena bien?”**, sino:

> **“¿Qué tendría que ocurrir para que esta regla dejara de ser útil, o para demostrar que está mal formulada?”**

El resultado de esta revisión no convierte automáticamente ningún candidato en regla vigente. Primero se separan los casos que sobreviven de los que necesitan reformulación.

---

# I. CANDIDATO A — Diagnóstico por nivel

### Formulación inicial

> Antes de modificar un principio por un fallo, localizar si el problema pertenece a datos, contrato, implementación, proveedor, transporte, arquitectura o metodología.

### Evidencia

La excavación técnica muestra fallos de naturaleza distinta: UUID, contratos de datos, parámetros específicos de proveedor, rutas redundantes, límites de Discord y decisiones arquitectónicas. En varios casos, corregir el nivel equivocado habría producido una modificación innecesaria de una capa superior.

### Contraargumento más fuerte

La clasificación puede ser incompleta. Un fallo puede pertenecer a varios niveles simultáneamente. También existe el riesgo de convertir “diagnosticar primero” en una excusa para retrasar una corrección obvia.

### Escenario de refutación

Si un problema claramente metodológico se mantiene durante varias iteraciones porque el equipo insiste en tratarlo como “implementación”, la regla, tal como está formulada, habría fallado.

### Evaluación

**Sobrevive, con modificación.** El patrón es suficientemente repetido y útil, pero la taxonomía no debe presentarse como cerrada.

### Formulación propuesta

> **Ante un fallo importante, diagnosticar primero en qué nivel se origina o se manifiesta antes de modificar un principio de nivel superior. Un fallo puede pertenecer a más de un nivel.**

### Veredicto

**Candidato fuerte a regla explícita de gobernanza.** No debe convertirse en principio raíz; funciona mejor como regla de diagnóstico.

---

# II. CANDIDATO B — Complejidad justificada

### Formulación inicial

> No incorporar una nueva capa, herramienta o automatización sin una necesidad demostrable, una función clara y una prueba que justifique su costo.

### Evidencia

La evolución del proyecto contiene varios casos donde una solución fue reducida, separada o retirada cuando su costo conceptual o técnico superó su valor.

### Contraargumento más fuerte

No toda infraestructura nueva puede demostrar su valor mediante una prueba antes de existir. Algunas herramientas son exploratorias: se prueban precisamente para descubrir si existe una necesidad o una oportunidad.

Además, exigir una “prueba” para cada incorporación puede producir burocracia y contradecir el espíritu experimental de Arkhé.

### Escenario de refutación

Una herramienta nueva podría ser barata, reversible y experimental, pero no tener una prueba previa que justifique su incorporación. Si la regla obliga a descartarla, la regla está bloqueando exploración legítima.

### Evaluación

**La intuición sobrevive; la formulación inicial es demasiado rígida.**

### Formulación propuesta

> **Toda nueva capa, herramienta o automatización debe tener una función identificable, un costo asumible y un criterio para evaluar posteriormente si su valor justifica mantenerla.**

La prueba puede ser posterior cuando se trate de un experimento reversible.

### Veredicto

**Candidato a regla explícita, pero reformulado.** Su función es gobernar la permanencia de la complejidad, no impedir toda exploración.

---

# III. CANDIDATO C — Simplificación como progreso

### Formulación inicial

> Eliminar redundancia, acoplamiento o complejidad innecesaria cuenta como una forma válida de construir Arkhé.

### Evidencia

La excavación técnica registra varios avances producidos mediante eliminación o separación: retiro de `tekton-evaluar`, separación del adaptador Discord, separación nodo/ronda/intervención y separación entre memoria operativa e histórica.

### Contraargumento más fuerte

“Menos” no significa automáticamente “mejor”. Una reducción puede eliminar una capacidad que parecía redundante pero que luego era necesaria.

### Escenario de refutación

Si retirar una capa reduce complejidad inmediata pero destruye una propiedad metodológica importante, la simplificación habría sido regresión, no progreso.

### Evaluación

El candidato es válido, pero depende de B: la simplificación es una forma de revisar el costo/valor de una estructura existente.

### Veredicto

**No recomiendo mantenerlo como regla independiente.** Debe integrarse con la regla de complejidad justificada como una consecuencia:

> **Eliminar complejidad injustificada también es una mejora.**

Esto evita duplicar gobernanza.

---

# IV. CANDIDATO D — Trazabilidad suficiente

### Formulación inicial

> Toda decisión o transformación importante debe conservar contexto suficiente para reconstruir su origen, motivo, cambio, resultado y decisión posterior.

### Evidencia

La trazabilidad aparece en memoria, rondas, intervenciones, réplicas, spawnpoint y separación entre estado validado y experimentos posteriores.

### Contraargumento más fuerte

“Importante” y “suficiente” son conceptos variables. Si se interpreta como obligación de registrar todo, se convierte en carga documental y vuelve a saturar la memoria operativa.

### Escenario de refutación

Si una decisión menor requiere registrar una cadena documental extensa que cuesta más mantener que el valor que aporta, la regla estaría mal aplicada.

### Evaluación

El patrón es extremadamente repetido, pero precisamente por eso debe evitar convertirse en una regla de documentación exhaustiva.

### Formulación propuesta

> **Las decisiones y transformaciones relevantes deben conservar el contexto mínimo necesario para reconstruir su origen, motivo, cambio, resultado y decisión posterior cuando ese contexto sea necesario para comprenderlas o auditarlas.**

### Veredicto

**Candidato fuerte a regla transversal.** Debe vincularse explícitamente con la idea de “trazabilidad suficiente”, no “trazabilidad total”.

---

# V. CANDIDATO E — Modularidad de identidad

### Formulación inicial

> Los componentes técnicos pueden reemplazarse siempre que las funciones metodológicas que protegen permanezcan explícitas y verificables.

### Evidencia

El cambio DeepSeek → Groq, la separación de canales y la distinción investigador/modelo/canal muestran que componentes técnicos pueden cambiar sin que eso obligue a redefinir la función metodológica del investigador.

### Contraargumento más fuerte

No todo reemplazo es neutral. Un nuevo proveedor o canal puede introducir sesgos, pérdidas de capacidad, cambios de privacidad, latencia o comportamiento que sí alteren la práctica metodológica.

### Escenario de refutación

Si sustituir un proveedor cambia sistemáticamente la capacidad de detectar contradicciones o altera la independencia de las perspectivas, no sería suficiente decir que “la función metodológica sigue siendo la misma”. Habría que reevaluarla.

### Evaluación

El patrón sobrevive si la modularidad no se entiende como garantía de equivalencia, sino como posibilidad de sustitución bajo verificación.

### Formulación propuesta

> **Los componentes técnicos pueden reemplazarse sin reemplazar automáticamente la identidad metodológica, siempre que las funciones que protegen puedan identificarse y verificarse nuevamente después del cambio.**

### Veredicto

**Candidato fuerte a regla de arquitectura.** Complementa, sin duplicar, “Investigador ≠ modelo ≠ canal”.

---

# VI. CANDIDATO F — Separación entre validación y experimento

### Formulación inicial

> Ningún experimento posterior debe retroactivamente convertirse en parte de la evidencia que validó una línea base anterior.

### Evidencia

El spawnpoint fue definido como línea base protegida. La arquitectura documental ya distingue estado previo, experimento posterior, resultado y decisión de conservar/descartar.

### Contraargumento más fuerte

Una validación posterior puede descubrir que la línea base estaba mal interpretada. En ese caso, preservar la historia no debe convertirse en tratar la validación inicial como verdad intocable.

### Escenario de refutación

Si un experimento posterior demuestra que una condición supuestamente satisfecha por el spawnpoint nunca estuvo realmente satisfecha, la historia debe conservar que el spawnpoint fue considerado validado, pero la conclusión actual debe poder revisarse.

### Evaluación

La regla no debe proteger una conclusión contra nueva evidencia. Debe proteger la integridad histórica de qué evidencia existía en el momento de la validación.

### Formulación propuesta

> **Los experimentos posteriores deben distinguirse de la evidencia que estableció una línea base anterior; si nueva evidencia cuestiona esa línea base, debe revisarse la conclusión sin reescribir retrospectivamente qué fue lo que originalmente se probó.**

### Veredicto

**Candidato fuerte a regla de gobernanza histórica/epistemológica.** Protege trazabilidad sin congelar el conocimiento.

---

# VII. RESULTADO DE LA REVISIÓN

La revisión produce tres grupos.

## A. Candidatos que sobreviven con incorporación futura

- **A — Diagnóstico por nivel**, reformulado para permitir fallos multicapa.
- **D — Trazabilidad suficiente**, reformulado como trazabilidad mínima necesaria, no exhaustiva.
- **E — Modularidad de identidad**, entendida como sustitución con reverificación.
- **F — Separación entre validación y experimento**, entendida como integridad histórica sin inmunidad ante nueva evidencia.

## B. Candidato que sobrevive, pero debe reformularse antes de incorporarse

- **B — Complejidad justificada.** Debe gobernar la permanencia de complejidad y permitir experimentos reversibles.

## C. Candidato que no conviene mantener como regla independiente

- **C — Simplificación como progreso.** Su contenido es útil, pero puede vivir dentro de B para evitar duplicación.

La decisión importante aquí no es “tener cinco reglas nuevas”. Es evitar convertir patrones parecidos en burocracia duplicada.

---

# VIII. PROPUESTA DE SIGUIENTE PASO

No incorporar todavía estas reglas al núcleo maestro como si la revisión ya fuera una validación final.

La siguiente etapa debería ser una **prueba de interacción entre las cinco reglas supervivientes**:

1. A — Diagnóstico por nivel.
2. B — Complejidad justificada (reformulada).
3. D — Trazabilidad suficiente.
4. E — Modularidad de identidad.
5. F — Separación entre validación y experimento.

La pregunta será si juntas producen conflictos, redundancias o una carga de gobernanza excesiva.

Si sobreviven esa prueba, entonces sí tendría sentido preparar un cambio explícito de Arkhé 0.2, con un commit separado y claramente identificable, en lugar de mezclarlas silenciosamente con el estado anterior.

---

## Nota de método

Esta revisión es una evaluación del material histórico y del estado documental disponible. No demuestra todavía que las reglas funcionen en condiciones reales de alta complejidad, concurrencia o investigación científica profunda. Es una reducción de candidatos y una formulación más precisa para futuras pruebas.
