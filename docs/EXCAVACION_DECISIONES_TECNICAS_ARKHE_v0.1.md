# Excavación de decisiones técnicas y arquitectura absorbida — Arkhé

**Fecha:** 2026-09-17  
**Capa:** 3G — decisiones técnicas explícitas, experimentos, soluciones provisionales y arquitectura realmente consolidada  
**Estado:** ACTIVA / primera reconstrucción  
**Criterio:** no tratar cada commit, comando o corrección como una decisión arquitectónica consolidada. Se distingue entre intención, experimento, solución provisional, descarte, absorción y estado vigente.

---

## 0. Pregunta de esta capa

La Capa 3F mostró que los errores de implementación obligaron a aclarar contratos, separar capas, sustituir proveedores, reducir redundancias y mejorar la trazabilidad. fileciteturn88file0L1-L3

Esta capa baja todavía un nivel:

> **¿Qué decisiones técnicas llegaron realmente a formar parte de la arquitectura de Arkhé y cuáles fueron solamente pasos intermedios para llegar hasta ella?**

La cadena buscada es:

**idea técnica → implementación/experimento → resultado → absorción, descarte o reemplazo → estado final.**

---

# 1. El error más importante que debemos evitar: confundir commits con arquitectura

Git conserva la historia de cambios mediante commits y permite rastrear cómo evolucionó un archivo o proyecto. citeturn0search3turn0search4

Pero un commit solamente demuestra que **algo cambió**. No demuestra por sí mismo que ese cambio haya sido:

- una decisión metodológica;
- una decisión arquitectónica definitiva;
- una práctica vigente;
- un experimento exitoso;
- una solución provisional;
- o simplemente una corrección local.

Por eso esta capa no construye la historia diciendo “commit = decisión”.

La pregunta correcta es:

> **¿Qué papel cumplió ese cambio dentro de la evolución posterior?**

Esta distinción es importante para que la memoria de Arkhé no convierta accidentalmente cada intento de construcción en una regla permanente.

---

# 2. Nodo de memoria → ronda persistente → intervención trazable

## Decisión/experimento inicial

La implementación de `/atlas-ronda` mostró que el sistema necesitaba diferenciar el nodo de memoria que se quería consultar de la ronda de investigación que debía generarse o reutilizarse. La Capa 3F documenta que el contrato inicial confundía ambas entidades y que la corrección separó el adaptador de Discord del núcleo metodológico. fileciteturn88file0L1-L3

## Resultado

La arquitectura terminó tratando la ronda como una entidad persistente con contexto propio y vínculo con el nodo consultado.

Posteriormente la arquitectura de rondas incorporó:

- investigación;
- número de ronda;
- estado;
- investigador/destinatario;
- ronda padre cuando corresponde;
- contexto;
- intervención.

La propia excavación técnica clasifica esto como **evolución del modelo de datos / arquitectura de trazabilidad**, no como simple arreglo de Discord. fileciteturn88file0L2-L3

## Estado

**ARQUITECTURA ABSORBIDA Y VIGENTE.**

No fue simplemente un experimento descartado: la separación entre nodo, ronda e intervención es parte de la forma actual de representar la investigación.

---

# 3. Réplica dirigida → relación explícita padre/intervención

## Intención

La metodología necesitaba permitir que Ángel pudiera pedir a un investigador una respuesta dirigida a una intervención concreta, sin iniciar una conversación automática indefinida.

## Evolución técnica

La arquitectura terminó conservando explícitamente:

**ronda padre → intervención concreta → investigador destinatario → réplica.**

Esto coincide con la metodología validada del Archivo Maestro: una réplica tiene investigador destinatario, intervención concreta, ronda padre identificable y trazabilidad explícita. fileciteturn84file0L2-L3

## Estado

**DECISIÓN ARQUITECTÓNICA CONSOLIDADA.**

No es solamente código de Discord. Es una representación técnica de una regla metodológica.

---

# 4. Adaptador de Discord → núcleo metodológico separado

## Antes

La interacción con Discord estaba estrechamente relacionada con la ejecución de la ronda.

## Fricción

Una interfaz no debería decidir silenciosamente qué significa una ronda, una intervención o una réplica.

## Cambio

La Capa 3F registra la separación explícita entre el adaptador Discord y el contrato metodológico. El adaptador recibe/transforma la entrada y el núcleo conserva la lógica de investigación. fileciteturn88file0L2-L3

## Estado

**ARQUITECTURA CONSOLIDADA.**

La lección absorbida es más profunda que “usar una capa de software”:

> **el canal debe transportar la investigación, no redefinirla.**

---

# 5. Proveedor del modelo → componente sustituible

## Caso

Tekton pasó de DeepSeek a Groq durante la integración. La excavación técnica aclara que esto no demuestra una incapacidad universal de DeepSeek; demuestra que el proveedor disponible no satisfacía las condiciones operativas del experimento en ese momento. fileciteturn88file0L2-L3

## Resultado arquitectónico

El motor dejó de considerarse parte de la identidad de Tekton.

La regla quedó expresada como:

**Tekton ≠ proveedor de modelo.**

## Estado

**DECISIÓN ARQUITECTÓNICA CONSOLIDADA.**

Esto es una arquitectura absorbida, no un simple cambio de configuración.

La misma lógica aparece en la memoria operativa: los modelos, proveedores, aplicaciones y canales son medios de operación; cambiar de ellos no cambia automáticamente la identidad del investigador. fileciteturn84file0L2-L3

---

# 6. `reasoning_effort` → configuración provisional dependiente del proveedor

## Antes

Durante la transición a Groq se intentó trasladar una configuración de razonamiento suponiendo compatibilidad suficiente entre proveedores.

## Resultado

La configuración tuvo que ajustarse porque la compatibilidad de una interfaz no implica equivalencia completa de capacidades.

La Capa 3F clasifica esto como **error de configuración / suposición de compatibilidad**, no como error metodológico. fileciteturn88file0L2-L3

## Estado

**SOLUCIÓN PROVISIONAL DESCARTADA COMO REGLA GENERAL.**

Lo que sí quedó absorbido es la regla técnica:

> **Cada proveedor debe validarse por separado antes de convertir sus parámetros particulares en parte de la arquitectura.**

---

# 7. `tekton-evaluar` → capacidad absorbida, ruta redundante descartada

## Antes

Tekton tenía una ruta separada de evaluación además de su capacidad de análisis.

## Fricción

La arquitectura empezó a duplicar responsabilidades.

## Resultado

`tekton-evaluar` fue retirado y se mantuvo la capacidad analítica de Tekton. La Capa 3F clasifica el caso como **redundancia de diseño / simplificación arquitectónica**. fileciteturn88file0L2-L3

## Estado

**CÓDIGO/RUTA DESCARTADA; CAPACIDAD ABSORBIDA.**

Este es un ejemplo especialmente útil: eliminar una ruta no significa eliminar la capacidad que esa ruta pretendía representar.

---

# 8. Respuestas largas → adaptación del transporte, no reducción del contenido

## Problema

Las respuestas de los investigadores podían superar las condiciones prácticas del canal Discord.

## Solución

La salida se adaptó para poder fragmentarse y transportarse correctamente.

## Estado

**SOLUCIÓN DE INTERFAZ / TRANSPORTE.**

No se convirtió en una regla epistemológica. El contenido investigativo permaneció separado de las limitaciones del canal. La Capa 3F clasifica este caso como restricción de interfaz/transporte. fileciteturn88file0L2-L3

---

# 9. Identificadores numéricos → UUID: corrección absorbida por el contrato de datos

## Problema

Durante la integración aparecieron inconsistencias entre identificadores numéricos y UUID en distintas capas. La Capa 3F documenta correcciones de `investigacion_id`, `atlas-producir` y campos obligatorios de autor. fileciteturn83file0L2-L3

## Resultado

La arquitectura de persistencia tuvo que respetar el esquema real de identificadores y mantener consistencia entre Discord, Supabase y los módulos de los investigadores.

## Estado

**CORRECCIÓN ABSORBIDA EN EL CONTRATO DE DATOS.**

El detalle importante no es “usar UUID porque sí”, sino que la identidad persistente debe ser coherente en todas las capas que participan en una misma operación.

---

# 10. Spawnpoint → referencia protegida, no arquitectura congelada

## Antes de esta excavación

Podría interpretarse que crear el spawnpoint significaba congelar toda la arquitectura.

## Evidencia posterior

La Capa 3F muestra que después del spawnpoint todavía pueden existir cambios de proveedor, correcciones de tipos, simplificaciones y ajustes de canal sin invalidarlo. La función del spawnpoint es conservar un estado seguro de referencia. fileciteturn88file0L2-L3

El Archivo Maestro también establece que los experimentos posteriores deben poder distinguir entre estado anterior, cambio experimental, resultado y decisión de conservar o descartar. fileciteturn84file0L2-L3

## Estado

**ARQUITECTURA DE CONTROL / REFERENCIA VIGENTE.**

El spawnpoint protege la capacidad de comparar y volver atrás; no impide experimentar.

---

# 11. Qué fue realmente arquitectura y qué no

La reconstrucción permite una clasificación provisional:

| Elemento | Estado reconstruido |
|---|---|
| Nodo separado de ronda | Arquitectura vigente |
| Ronda persistente con contexto | Arquitectura vigente |
| Padre explícito para réplicas | Arquitectura vigente |
| Intervención concreta como referencia | Arquitectura vigente |
| Adaptador Discord separado del núcleo | Arquitectura vigente |
| Proveedor intercambiable | Arquitectura vigente |
| `reasoning_effort` específico | Solución provisional descartada |
| `tekton-evaluar` | Ruta descartada / capacidad absorbida |
| Fragmentación de mensajes Discord | Solución de transporte |
| UUID coherente entre capas | Contrato de datos vigente |
| Spawnpoint | Referencia protegida, no congelación total |

La tabla es **provisional** porque la evidencia histórica disponible no permite afirmar que cada componente tenga una fecha exacta de “adopción formal”.

---

# 12. Lo que no debemos inventar

La excavación no permite afirmar todavía:

1. que cada arquitectura intermedia haya sido desplegada durante mucho tiempo;
2. que cada commit haya representado una decisión consciente de arquitectura;
3. que todas las rutas eliminadas hayan sido usadas en producción real;
4. que exista una cronología completa de cada refactor;
5. que las decisiones técnicas actuales sean definitivas;
6. que una implementación técnicamente funcional sea por ello epistemológicamente robusta.

Además, algunos SHA mencionados por las excavaciones anteriores ya no son recuperables directamente desde el endpoint actual del repositorio. Esto no invalida automáticamente la reconstrucción, pero reduce la fuerza de evidencia primaria de esos casos y obliga a tratarlos como **evidencia histórica secundaria documentada** hasta recuperar una fuente más directa.

---

# 13. Hallazgo central de la Capa 3G

La arquitectura actual no parece haber aparecido de una sola decisión maestra.

Se fue formando mediante:

**experimento → fricción → diagnóstico → simplificación/separación → nueva prueba → absorción de lo útil.**

Y aparece una diferencia importante entre la arquitectura metodológica y la arquitectura de software:

- la metodología define **qué debe preservarse**;
- la arquitectura técnica define **cómo hacerlo operable**;
- los proveedores y canales definen **con qué medios se ejecuta**.

Cuando un medio cambia, no necesariamente cambia la arquitectura.

Cuando la arquitectura cambia, no necesariamente cambia la metodología.

Cuando la metodología cambia, sí estamos ante una modificación de mayor nivel y necesitamos evidencia explícita.

---

# 14. Regla derivada

> **No debemos conservar una implementación por haber sido la primera, ni descartarla por haber sido reemplazada. Debemos conservarla como vigente, histórica o experimental según la evidencia de su función y de lo que ocurrió después.**

Esto convierte la historia técnica en conocimiento útil en lugar de convertirla en una lista de versiones.

---

# 15. Resultado provisional

La Capa 3G permite sostener que una parte importante de la arquitectura actual de Arkhé nació de la absorción de soluciones que sobrevivieron a pruebas y de la eliminación de soluciones que introducían confusión o redundancia.

Esto es coherente con el principio operativo ya conservado:

> **Arkhé no avanza por acumular funciones; avanza cuando cada nueva capacidad conserva el propósito, la memoria, la libertad de investigación y el control humano mientras aumenta nuestra capacidad para preguntar, contrastar, construir y comprender.**

---

# 16. Siguiente frente

La serie 3 ya ha recorrido:

- 3C — primer error recuperable;
- 3D — experimentos y cambios cronológicos;
- 3E — decisiones aceptadas y posteriormente reemplazadas;
- 3F — errores de implementación y cambios de arquitectura;
- 3G — decisiones técnicas, soluciones provisionales y arquitectura absorbida.

El siguiente frente ya no necesita bajar indefinidamente a cada commit. Puede pasar a una **síntesis de la excavación**: qué patrones de aprendizaje, error, reemplazo y construcción se repiten a lo largo de todas las capas y qué parte de ellos merece formar parte explícita de la metodología Arkhé 0.2.
