# Reglas de Gobernanza — Arkhé 0.2

**Fecha de incorporación:** 2026-09-17  
**Estado:** VIGENTE  
**Base:** excavación histórica + revisión adversarial + prueba de interacción  
**Documento de propuesta:** `docs/PROPUESTA_INCORPORACION_REGLAS_ARKHE_0.2.md`  
**Archivo de candidatos:** `docs/REGLAS_CANDIDATAS_ARKHE_0.2.md`  
**Revisión adversarial:** `docs/REVISION_REGLAS_CANDIDATAS_ARKHE_0.2.md`  
**Prueba de interacción:** `docs/PRUEBA_INTERACCION_REGLAS_ARKHE_0.2.md`  
**Archivo Maestro:** `docs/ARCHIVO_MAESTRO_ARKHE_v0.2.md`  
**Memoria de Rumbo:** `docs/MEMORIA_RUMBO_ARKHE.md`

---

## 0. Naturaleza de estas reglas

Estas reglas no reemplazan las raíces ni el propósito de Arkhé.

Son una capa de **gobernanza y arquitectura** derivada de patrones repetidos durante la excavación de Arkhé 0.1 y sometida a revisión antes de su incorporación.

No son principios raíz.

No sustituyen la evidencia.

No convierten decisiones históricas en verdades permanentes.

Su función es ayudar a que Arkhé evolucione sin perder identidad, trazabilidad, libertad de investigación ni conducción humana.

---

# R1 — Diagnóstico por nivel

> **Ante un fallo importante, diagnosticar primero en qué nivel se origina o se manifiesta antes de modificar un principio de nivel superior. Un fallo puede pertenecer a más de un nivel.**

Los niveles posibles incluyen, entre otros:

- datos;
- contrato;
- implementación;
- proveedor;
- transporte/canal;
- arquitectura;
- metodología.

Un fallo técnico no debe convertirse automáticamente en evidencia contra la metodología.

La regla tampoco permite utilizar “diagnóstico” como excusa para retrasar indefinidamente una corrección o ignorar evidencia metodológica.

---

# R2 — Complejidad justificable y reversible

> **Toda nueva capa, herramienta o automatización debe tener una función identificable, un costo asumible y un criterio para evaluar posteriormente si su valor justifica mantenerla. Los experimentos reversibles pueden evaluarse después de su incorporación inicial.**

La exploración está permitida.

Lo que debe justificarse es la **permanencia** de la complejidad.

Por tanto:

> **Eliminar complejidad que dejó de justificar su costo también puede constituir una mejora.**

La reducción no se considera automáticamente progreso: antes de retirar una estructura debe identificarse qué función protege y qué podría perderse.

---

# R3 — Trazabilidad suficiente

> **Las decisiones y transformaciones relevantes deben conservar el contexto mínimo necesario para reconstruir su origen, motivo, cambio, resultado y decisión posterior cuando ese contexto sea necesario para comprenderlas o auditarlas.**

La regla exige trazabilidad suficiente, no documentación exhaustiva.

La profundidad del registro debe corresponder a la relevancia del elemento y a su necesidad futura de reconstrucción o auditoría.

La memoria operativa puede reducir ruido siempre que el contexto necesario siga recuperable mediante el archivo histórico o las fuentes originales.

---

# R4 — Modularidad de identidad

> **Los componentes técnicos pueden reemplazarse sin reemplazar automáticamente la identidad metodológica, siempre que las funciones que protegen puedan identificarse y verificarse nuevamente después del cambio.**

Se mantiene la distinción:

> **Investigador ≠ modelo ≠ canal.**

Un modelo, proveedor, aplicación, canal o componente puede cambiar.

Pero el reemplazo no garantiza equivalencia.

Cuando el cambio pueda afectar una función metodológica relevante, esa función debe volver a verificarse.

---

# R5 — Separación entre validación y experimento

> **Los experimentos posteriores deben distinguirse de la evidencia que estableció una línea base anterior; si nueva evidencia cuestiona esa línea base, debe revisarse la conclusión sin reescribir retrospectivamente qué fue lo que originalmente se probó.**

La historia de la validación debe conservarse tal como ocurrió.

Las conclusiones actuales siguen siendo revisables.

Por tanto, esta regla protege la **integridad histórica de la evidencia**, no la inmunidad de una conclusión frente a nueva evidencia.

El spawnpoint continúa siendo una línea base protegida y reversible, no un dogma.

---

# VI. Regla de interacción

Las cinco reglas deben aplicarse conjuntamente y no de forma aislada.

Ante un cambio relevante:

1. **R1:** diagnosticar dónde está el problema o necesidad.
2. **R2:** evaluar qué complejidad se añade o se retira y por qué.
3. **R3:** conservar el contexto necesario para reconstruir la decisión.
4. **R4:** si se sustituyen componentes, volver a verificar las funciones metodológicas afectadas.
5. **R5:** mantener separado el estado validado de los experimentos posteriores.

Ninguna de estas reglas autoriza a una IA a modificar unilateralmente el propósito o la metodología fundamental de Arkhé.

La conducción de decisiones fundamentales permanece bajo Ángel.

---

# VII. Qué NO forma parte de estas reglas

No se incorpora una regla independiente de “Simplificación como progreso”; su contenido queda integrado en R2.

Tampoco se consideran resueltas por estas reglas las preguntas abiertas sobre:

- contradicciones complejas;
- ruido;
- sesgo de consenso;
- escalabilidad;
- concurrencia;
- gobernanza de grafos y referencias;
- rollback;
- seguridad;
- sincronización entre canales;
- criterios formales de calidad investigativa.

Estas continúan como preguntas abiertas.

---

# VIII. Condición de revisión futura

Estas reglas son vigentes, pero revisables.

Una futura evidencia puede:

- fortalecerlas;
- precisar su alcance;
- dividir una regla;
- fusionar reglas;
- demostrar redundancia;
- demostrar efectos secundarios no previstos;
- o justificar su reemplazo.

Si una regla cambia, no debe reescribirse la historia para fingir que la versión anterior nunca existió.

La modificación debe quedar registrada como evolución explícita.

---

# IX. Fuentes de decisión

La incorporación fue precedida por:

1. `docs/REGLAS_CANDIDATAS_ARKHE_0.2.md` — candidatos iniciales.
2. `docs/REVISION_REGLAS_CANDIDATAS_ARKHE_0.2.md` — revisión adversarial individual.
3. `docs/PRUEBA_INTERACCION_REGLAS_ARKHE_0.2.md` — prueba conjunta de interacción.
4. `docs/PROPUESTA_INCORPORACION_REGLAS_ARKHE_0.2.md` — propuesta formal.
5. Excavaciones 3F, 3G y 3H — evidencia histórica y técnica que originó los patrones.

---

## Registro de incorporación

**2026-09-17 — Arkhé 0.2**

Se incorporan R1–R5 como reglas vigentes de gobernanza y arquitectura.

La incorporación no altera el propósito central, las raíces, la centralidad humana ni la línea base del spawnpoint.

El cambio representa una evolución de gobernanza derivada de la excavación, no un cambio de propósito.
