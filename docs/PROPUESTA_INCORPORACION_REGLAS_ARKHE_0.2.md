# Propuesta de incorporación — Reglas Arkhé 0.2

**Fecha:** 2026-09-17  
**Estado:** PROPUESTA / NO VIGENTE TODAVÍA  
**Base de revisión:** `docs/REGLAS_CANDIDATAS_ARKHE_0.2.md`  
**Revisión adversarial:** `docs/REVISION_REGLAS_CANDIDATAS_ARKHE_0.2.md`  
**Prueba de interacción:** `docs/PRUEBA_INTERACCION_REGLAS_ARKHE_0.2.md`  
**Archivo maestro objetivo:** `docs/ARCHIVO_MAESTRO_ARKHE_v0.2.md`

---

## 0. Propósito de esta propuesta

La excavación de Arkhé 0.1 produjo patrones repetidos que no parecían pertenecer únicamente a la historia técnica, sino que podían mejorar la gobernanza de la etapa 0.2.

No obstante, convertir un patrón histórico en una regla vigente es un cambio metodológico. Por ello esta propuesta **no modifica todavía el Archivo Maestro**.

Su función es presentar el cambio de manera explícita, trazable y reversible para que pueda compararse con el estado actual antes de incorporarlo.

La propuesta surge después de tres filtros:

1. extracción de patrones repetidos;
2. revisión adversarial individual;
3. prueba de interacción entre las reglas supervivientes.

---

# I. Resultado de la selección

De los seis candidatos originales:

- A sobrevive reformulado.
- B sobrevive reformulado.
- C no se conserva como regla independiente; su contenido queda absorbido por B.
- D sobrevive reformulado.
- E sobrevive reformulado.
- F sobrevive reformulado.

Por tanto, se propone incorporar **cinco reglas nuevas**, sin crear una regla independiente para simplificación.

Esto no significa que las cinco sean principios raíz. Son reglas de gobernanza y arquitectura derivadas de la experiencia de Arkhé.

---

# II. Reglas propuestas

## R1 — Diagnóstico por nivel

> **Ante un fallo importante, diagnosticar primero en qué nivel se origina o se manifiesta antes de modificar un principio de nivel superior. Un fallo puede pertenecer a más de un nivel.**

### Función

Evitar que un error de datos, contrato, implementación, proveedor, transporte o arquitectura sea interpretado prematuramente como evidencia de que debe cambiar la metodología.

### Evidencia de origen

La excavación técnica documentó problemas de tipos, contratos entre entidades, parámetros de proveedores, redundancias de comandos y restricciones de Discord que pudieron resolverse sin alterar el propósito metodológico. fileciteturn119file0L1-L2

### Límite

Diagnosticar primero no significa retrasar indefinidamente una corrección ni asumir que todo problema es local. Un fallo puede cruzar varios niveles y finalmente revelar una debilidad metodológica.

### Categoría

**Gobernanza / diagnóstico.**

---

## R2 — Complejidad justificable y reversible

> **Toda nueva capa, herramienta o automatización debe tener una función identificable, un costo asumible y un criterio para evaluar posteriormente si su valor justifica mantenerla. Los experimentos reversibles pueden evaluarse después de su incorporación inicial.**

### Función

Evitar que la arquitectura crezca por acumulación sin impedir exploraciones legítimas.

### Consecuencia incorporada de C

Eliminar complejidad que dejó de justificar su costo también cuenta como mejora. Por ello la antigua regla C no se incorpora por separado.

### Evidencia de origen

La retirada de `tekton-evaluar`, la separación de adaptadores y otras simplificaciones muestran que reducir redundancia puede ser una evolución arquitectónica cuando existe una razón verificable. fileciteturn119file0L1-L2

### Límite

Una estructura no debe eliminarse solamente porque parezca compleja. Primero debe identificarse qué función protege y qué se perdería al retirarla.

### Categoría

**Gobernanza / arquitectura.**

---

## R3 — Trazabilidad suficiente

> **Las decisiones y transformaciones relevantes deben conservar el contexto mínimo necesario para reconstruir su origen, motivo, cambio, resultado y decisión posterior cuando ese contexto sea necesario para comprenderlas o auditarlas.**

### Función

Conservar continuidad sin convertir la memoria operativa en un registro exhaustivo de todo.

### Evidencia de origen

La arquitectura actual separa memoria maestra operativa, archivo histórico y fuentes originales, precisamente para reducir ruido sin perder capacidad de verificación. fileciteturn123file0L1-L2

### Límite

No toda acción requiere la misma profundidad documental. La suficiencia depende de la relevancia y del uso futuro del contexto.

### Categoría

**Gobernanza / documentación.**

---

## R4 — Modularidad de identidad

> **Los componentes técnicos pueden reemplazarse sin reemplazar automáticamente la identidad metodológica, siempre que las funciones que protegen puedan identificarse y verificarse nuevamente después del cambio.**

### Función

Permitir evolución de modelos, proveedores, canales y componentes sin confundir infraestructura con identidad metodológica.

### Evidencia de origen

La arquitectura ya distingue explícitamente investigador, modelo y canal. La sustitución de proveedores durante la integración mostró que el componente técnico puede cambiar sin que eso implique automáticamente cambiar al investigador. fileciteturn123file0L1-L2

### Límite

La sustitución no garantiza equivalencia. Si un cambio técnico altera una función metodológica relevante, esa función debe reevaluarse.

### Categoría

**Arquitectura / identidad metodológica.**

---

## R5 — Separación entre validación y experimento

> **Los experimentos posteriores deben distinguirse de la evidencia que estableció una línea base anterior; si nueva evidencia cuestiona esa línea base, debe revisarse la conclusión sin reescribir retrospectivamente qué fue lo que originalmente se probó.**

### Función

Proteger la integridad histórica sin convertir el conocimiento previo en dogma.

### Evidencia de origen

El spawnpoint ya establece una línea base protegida y distingue el estado validado de experimentos posteriores. fileciteturn123file0L1-L2

### Límite

La regla protege la historia de la evidencia, no la conclusión frente a nueva evidencia.

### Categoría

**Gobernanza histórica / epistemología.**

---

# III. Cómo quedarían respecto al núcleo actual

Estas reglas **no reemplazarían** los principios fundamentales existentes.

En particular, no modificarían:

- el propósito central de comprender la realidad;
- la prioridad de la evidencia;
- la provisionalidad de las conclusiones;
- la centralidad humana;
- la utilidad del desacuerdo razonado;
- la separación investigador/modelo/canal;
- la metodología de rondas y réplica dirigida;
- el papel del spawnpoint como línea base protegida.

Funcionan como una capa intermedia: **principios → reglas de gobernanza → metodología → arquitectura → implementación**.

---

# IV. Qué NO se incorpora

No se incorpora una regla independiente llamada “Simplificación como progreso”.

La razón no es rechazar la idea, sino evitar duplicación. Su contenido queda expresado dentro de R2: una complejidad debe justificar su permanencia, por lo que retirar complejidad injustificada puede ser una mejora.

Tampoco se incorporan como reglas nuevas los límites que todavía están abiertos:

- resolución de contradicciones complejas;
- filtrado de ruido;
- sesgo de consenso;
- escalabilidad;
- concurrencia;
- gobernanza definitiva de grafos y referencias;
- seguridad para exposición pública;
- criterios formales de calidad investigativa.

Siguen siendo preguntas abiertas, no capacidades demostradas.

---

# V. Riesgos de incorporar las cinco

La incorporación puede producir nuevos problemas si las reglas se interpretan de forma rígida:

1. R1 podría convertirse en parálisis diagnóstica.
2. R2 podría convertirse en rechazo de experimentos exploratorios.
3. R3 podría convertirse en burocracia documental.
4. R4 podría asumir equivalencia falsa entre componentes técnicos.
5. R5 podría convertir el spawnpoint en una autoridad incuestionable.

Por eso cada regla contiene explícitamente sus límites.

---

# VI. Prueba de incorporación propuesta

Antes de declarar las cinco reglas como **VIGENTES**, deberían pasar una prueba práctica en el siguiente cambio relevante de Arkhé.

Para cada cambio futuro se preguntará:

### R1
¿Estamos modificando la metodología porque existe evidencia metodológica o porque encontramos un problema técnico/local?

### R2
¿Qué función tiene la nueva complejidad y qué criterio permitirá decidir si permanece?

### R3
¿Qué contexto será necesario en el futuro para comprender o auditar este cambio?

### R4
Si sustituimos un componente, ¿qué función metodológica debemos volver a verificar?

### R5
¿Estamos introduciendo nueva evidencia sin reescribir retrospectivamente lo que se validó originalmente?

Si las reglas ayudan a responder estas preguntas sin introducir una carga desproporcionada, la evidencia práctica fortalecerá su incorporación.

---

# VII. Estado formal

**Estado actual:** PROPUESTA.

Las cinco reglas todavía no deben etiquetarse como VIGENTES en el Archivo Maestro.

La incorporación formal requerirá un commit posterior separado que:

1. modifique el Archivo Maestro;
2. actualice la Memoria de Rumbo;
3. registre este documento como fuente de decisión;
4. indique exactamente qué reglas fueron incorporadas;
5. conserve esta propuesta como evidencia del proceso de decisión.

Esto permite comparar claramente el estado anterior y posterior. GitHub conserva la historia de los archivos y los commits como snapshots identificables, lo que permite reconstruir qué cambió y comparar versiones. citeturn0search0turn0search4turn0search7

---

# VIII. Decisión pendiente

La pregunta final de esta etapa es:

> **¿La evidencia acumulada justifica convertir R1–R5 en reglas vigentes de Arkhé 0.2?**

Esta propuesta recomienda prepararlas para incorporación, pero mantiene la distinción entre **recomendación** y **estado vigente** hasta que se produzca el commit de incorporación.
