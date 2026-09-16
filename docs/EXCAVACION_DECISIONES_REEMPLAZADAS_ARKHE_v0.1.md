# Excavación de decisiones aceptadas y posteriormente reemplazadas — Arkhé

**Fecha:** 2026-09-16  
**Capa:** 3E — decisiones aceptadas, usadas y posteriormente reemplazadas o degradadas  
**Estado:** ACTIVA / primera reconstrucción.  
**Criterio:** no llamar “fracaso” a toda sustitución. Una decisión puede ser razonable en su contexto y quedar superada cuando cambia la evidencia, la escala o la arquitectura.

---

## 0. Pregunta de esta capa

La capa anterior buscó experimentos que cambiaron Arkhé. Esta capa pregunta algo distinto:

> **¿Qué decisiones llegaron a formar parte de la forma de trabajar y después fueron sustituidas por otra solución?**

La cadena buscada es:

**propuesta → aceptación/uso → limitación → reemplazo → razón del reemplazo → elemento que sobrevivió.**

Cuando la evidencia no demuestra que una propuesta llegó a usarse de forma real, se clasifica como **propuesta / no demostrado**, no como decisión reemplazada.

---

# 1. Bitácora principal en el chat → memoria externa versionada en GitHub

### Antes

En una etapa temprana se propuso que el propio chat funcionara como “Bitácora Principal de Arkhé” y que los PDFs fueran ediciones oficiales. La decisión respondía a una necesidad real: conservar continuidad.

### Limitación

Con el crecimiento del proyecto, la continuidad entre conversaciones, investigadores, documentos y aplicaciones se volvió demasiado dependiente de la conversación concreta.

### Reemplazo

La arquitectura de memoria evolucionó hacia archivos versionados dentro del repositorio de GitHub, con memoria operativa, archivo histórico y fuentes originales separadas.

Git permite conservar snapshots, historial y comparar versiones; GitHub sirve como ubicación remota de ese repositorio y permite consultar esa evolución. citeturn0search0turn0search1

### Lo que sobrevivió

**Memoria externa + continuidad + trazabilidad.**

### Clasificación

**REEMPLAZADA COMO ARQUITECTURA / NECESIDAD CONSERVADA.**

No fue una mala decisión histórica: resolvía el problema disponible en ese momento con las herramientas disponibles entonces.

---

# 2. Archivo Maestro v0.1 → Archivo Maestro v0.2 operativo + v0.1 histórico

### Antes

El Archivo Maestro v0.1 concentraba una enorme cantidad de historia, metodología, conversaciones reconstruidas, decisiones, experimentos y material incidental.

### Limitación

Su tamaño y mezcla de niveles dificultaban usarlo como memoria operativa sin recorrer material histórico que ya no representaba el estado actual.

### Reemplazo

Se estableció una separación:

- **v0.1:** memoria histórica, intacta;
- **v0.2:** memoria operativa actual;
- **excavaciones:** documentos que explican cómo se llegó de una versión a otra;
- **fuentes:** registros originales que permiten verificar afirmaciones.

### Lo que sobrevivió

La historia no fue eliminada. Se conservó la capacidad de reconstruir decisiones importantes.

### Clasificación

**REEMPLAZO DE FUNCIÓN, NO BORRADO DE HISTORIA.**

La regla resultante es:

> **La memoria operativa no tiene que contener todo lo que Arkhé fue; debe contener lo que Arkhé necesita recordar para saber qué es y cómo opera ahora.**

---

# 3. PEC como estructura central → PEC como instrumento secundario/histórico

### Antes

El PEC —Protocolo de Evaluación de Complementos— llegó a formalizar la evaluación de herramientas con una estructura de datos objetivos, análisis de Arkhé, riesgos, veredicto y registro.

### Uso y aprendizaje

Se utilizó para ordenar la evaluación de herramientas como Consensus y SciSpace. La comparación generó conocimiento que después excedió el caso de una herramienta individual.

### Limitación

La evaluación de herramientas no constituye el propósito ni el método general de investigación de Arkhé.

### Reemplazo

El PEC dejó de ocupar el centro conceptual y pasó a una categoría histórica/secundaria. Sus criterios pueden reutilizarse cuando una decisión sobre herramientas lo requiera, pero no gobiernan todo el proyecto.

### Lo que sobrevivió

- distinguir datos objetivos de análisis;
- registrar riesgos;
- comparar herramientas con criterios explícitos;
- exigir utilidad práctica;
- poder sustituir una herramienta cuando deja de aportar.

### Clasificación

**DEGRADADO DE CENTRAL A SECUNDARIO / PRINCIPIOS REUTILIZABLES.**

---

# 4. RPC como idea de revisión periódica → protocolo experimental secundario

### Antes

La Revisión de Prioridad de Complementos (RPC) fue planteada para revisar periódicamente qué herramientas seguían aportando, cuáles debían degradarse y cuáles eliminarse.

### Limitación

No existe evidencia suficiente para afirmar que RPC se convirtió en un protocolo central y consolidado del funcionamiento general de Arkhé.

### Estado posterior

La idea quedó clasificada como **experimental/secundaria**. Puede ser útil cuando una rama de herramientas realmente necesite revisión, pero no debe elevarse a principio constitucional.

### Lo que sobrevivió

La necesidad de revisar prioridades y podar ramas.

### Clasificación

**NO ES UNA DECISIÓN REEMPLAZADA PLENAMENTE; ES UNA PROPUESTA QUE PERDIÓ RANGO CENTRAL.**

Esta distinción importa: no debemos inventar una “ejecución” de RPC que la evidencia no demuestra.

---

# 5. Investigación 2.2 → actualización de la misma investigación, no creación automática de Investigación 3.0

### Antes

Una investigación sobre herramientas podía parecer candidata a recibir un nuevo número cuando aparecían nuevas conclusiones o cambios de criterio.

### Problema

Crear una nueva investigación cada vez que maduraba una idea fragmentaría artificialmente la historia y perdería la relación entre hipótesis inicial y conclusión posterior.

### Reemplazo

Se adoptó una regla de continuidad: una investigación puede **actualizarse** conservando su identidad histórica cuando el objeto sigue siendo el mismo.

El caso documentado de Investigación 2.2 es especialmente claro: se prefirió actualizarla en lugar de crear una 3.0 solo porque las ideas habían madurado.

### Lo que sobrevivió

La trazabilidad histórica del objeto de investigación.

### Clasificación

**DECISIÓN METODOLÓGICA VIGENTE.**

No es simplemente un reemplazo de numeración; es una corrección de cómo se representa la evolución de una investigación.

---

# 6. Tres llaves de custodia → protección conceptual para una arquitectura de cuatro investigadores

### Antes

El Protocolo de Custodia histórico utilizaba una arquitectura de “tres llaves” asociada a Ángel, Atlas y Aletheia.

### Nueva condición

La arquitectura posterior incorporó formalmente a Tekton como cuarto investigador y desarrolló reglas más explícitas de trazabilidad, control humano y gobernanza.

### Reemplazo

La estructura literal de tres llaves no se trasladó al estado operativo actual.

### Lo que sobrevivió

El principio de **proteger la identidad, el propósito y el rumbo del proyecto**, evitando cambios estructurales silenciosos.

### Clasificación

**ESTRUCTURA REEMPLAZADA / PRINCIPIO CONSERVADO.**

Esto ejemplifica una regla general de Arkhé: una implementación concreta puede quedar superada sin que el principio que intentaba proteger desaparezca.

---

# 7. Arquitectura Ángel + Atlas → arquitectura de investigadores diferenciados

### Antes

La relación de investigación inicial recuperable estaba organizada alrededor de Ángel y Atlas.

### Evolución

Aletheia se incorporó como contrapeso crítico y posteriormente Tekton fue formalizado como cuarto investigador. La arquitectura pasó a distinguir perspectivas y capacidades complementarias.

### Reemplazo

No se reemplazó la relación Ángel–Atlas; se **amplió la arquitectura** alrededor de ella.

### Lo que sobrevivió

Ángel sigue siendo el investigador humano y conductor. Atlas no fue eliminado ni fusionado con los demás. La diferencia de perspectivas se convirtió en una propiedad metodológica.

### Clasificación

**EVOLUCIÓN ARQUITECTÓNICA, NO ABANDONO.**

Esta distinción evita una falsa narrativa de “antes estaba mal, ahora está bien”. La arquitectura anterior fue una etapa real del proyecto.

---

# 8. Doble Rendija inicial → Doble Rendija con falsabilidad explícita

### Antes

La Doble Rendija establecía que perspectivas independientes debían analizar antes de comparar y que la decisión no debía tomarse por mayoría.

### Evolución

Posteriormente apareció una mejora metodológica importante: antes de comparar, cada investigador debe explicitar qué evidencia o condición podría falsar su hipótesis.

### Reemplazo

No se reemplazó Doble Rendija. Se **refinó**.

### Lo que sobrevivió

- independencia previa;
- contraste posterior;
- rechazo del voto de mayoría como criterio de verdad;
- desacuerdo como información.

### Lo pendiente

Todavía falta formalizar exactamente cuándo una condición cuenta como falsación y cómo se registra.

### Clasificación

**VIGENTE + REFINADO.**

---

# 9. “Investigar con la herramienta” → “investigar con independencia de la herramienta”

Este cambio apareció progresivamente durante la evaluación de complementos.

### Antes

Una herramienta podía parecer parte importante de la capacidad de investigación.

### Problema

El proyecto detectó el riesgo de confundir la capacidad del instrumento con la capacidad metodológica del investigador.

### Reemplazo

La herramienta pasó a ser considerada un soporte sustituible.

### Lo que sobrevivió

El conocimiento generado durante su uso puede incorporarse a Arkhé, aunque la herramienta concreta desaparezca.

### Clasificación

**EVOLUCIÓN METODOLÓGICA VIGENTE.**

---

# 10. Lo que estos casos tienen en común

Los reemplazos encontrados no siguen una única lógica.

Hay al menos cuatro tipos:

### A. Reemplazo por escala

La solución original funcionaba, pero dejó de ser suficiente al crecer el proyecto.

**Ejemplo:** chat/bitácora → memoria documental versionada.

### B. Reemplazo por cambio de categoría

Una herramienta o protocolo sigue teniendo utilidad, pero deja de ocupar el centro.

**Ejemplo:** PEC → instrumento secundario.

### C. Reemplazo por nueva arquitectura

La estructura concreta cambia porque el proyecto adquiere nuevos participantes o necesidades.

**Ejemplo:** tres llaves → protección compatible con cuatro investigadores.

### D. Refinamiento sin reemplazo

La idea central sigue funcionando y solamente se vuelve más precisa.

**Ejemplo:** Doble Rendija → falsabilidad explícita.

Esta clasificación evita convertir toda evolución en “error”.

---

# 11. Una regla histórica que se vuelve visible

Después de revisar estos casos aparece una pauta:

> **Arkhé conserva con mayor fidelidad una decisión cuando separa lo que la decisión intentaba proteger de la forma concreta que utilizó para protegerlo.**

Ejemplos:

- bitácora → continuidad;
- PEC → evaluación explícita;
- tres llaves → custodia;
- Doble Rendija → independencia y contraste;
- v0.1 → memoria histórica;
- v0.2 → operación actual.

Cuando la forma deja de servir, se puede reemplazar sin destruir la raíz.

---

# 12. Lo que NO podemos afirmar todavía

No tenemos evidencia suficiente para construir una cronología absoluta de todas las decisiones aceptadas y reemplazadas.

Quedan pendientes:

1. localizar la primera aceptación explícita de cada protocolo;
2. identificar el primer uso real de RPC, si lo hubo;
3. encontrar otros protocolos que fueron aceptados y después abandonados;
4. identificar decisiones de arquitectura técnica que fueron sustituidas antes del spawnpoint;
5. encontrar casos donde una decisión aceptada haya fallado en una prueba concreta y su reemplazo haya sido causado directamente por ese fallo;
6. reconstruir con mayor precisión cuándo una propuesta pasó de experimental a vigente.

Estas preguntas permanecen abiertas.

---

# 13. Resultado de la Capa 3E

La excavación permite sostener provisionalmente que Arkhé **no ha cambiado de identidad cada vez que ha cambiado de método**.

Ha cambiado de soluciones mientras conserva necesidades y principios que demostraron ser más profundos que esas soluciones.

Esto explica la arquitectura actual de memoria:

**historia → clasificación → versión operativa → trazabilidad.**

La memoria de Arkhé no necesita fingir que todo lo anterior sigue vigente. Necesita poder explicar **por qué dejó de estarlo**.

---

# 14. Siguiente capa

Con esta capa, la excavación histórica puede avanzar hacia un último frente de esta serie:

## Capa 3F — errores de implementación y pruebas que obligaron a corregir la arquitectura técnica

La pregunta será:

> **¿Qué problemas reales del sistema técnico —bots, Discord, Supabase, proveedores, identificadores, rondas, memoria y trazabilidad— produjeron cambios en la metodología o en la arquitectura?**

La separación será estricta:

**error técnico local ≠ error metodológico ≠ cambio de arquitectura.**

Solo se elevará un problema técnico a “cambio de Arkhé” cuando exista evidencia de que realmente modificó una regla, una decisión arquitectónica o una condición metodológica.
