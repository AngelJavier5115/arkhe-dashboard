# Excavación de errores de implementación y cambios de arquitectura técnica — Arkhé

**Fecha:** 2026-09-16  
**Capa:** 3F — errores técnicos, correcciones de implementación y cambios de arquitectura antes/después del spawnpoint  
**Estado:** ACTIVA / primera reconstrucción  
**Criterio:** separar estrictamente un error local de implementación, un problema de integración, un cambio de arquitectura y un cambio metodológico. No convertir un bug en evidencia de que la metodología era incorrecta.

---

## 0. Pregunta de esta capa

La Capa 3E mostró decisiones conceptuales que fueron reemplazadas, degradadas o refinadas. Esta capa baja un nivel:

> **¿Qué falló al intentar convertir la metodología y la arquitectura de Arkhé en software funcional, y qué cambios técnicos produjo cada fricción?**

La cadena buscada es:

**intención → implementación → fallo/fricción → diagnóstico → corrección → consecuencia arquitectónica → elemento metodológico conservado.**

Un fallo técnico no se interpreta automáticamente como fallo de la metodología.

---

# 1. ID de ronda vs. ID de nodo: una confusión de entidades

### Problema

La primera integración de `/atlas-ronda` trataba el parámetro recibido por Discord como si fuera directamente el identificador de una ronda. La implementación posterior documenta explícitamente la corrección: el comando debía recibir un **nodo de memoria entero** y, a partir de él, preparar o reutilizar una ronda de consulta abierta.

El commit `8b794dd4bd59d981324f6232f7eae597381d5398` cambia precisamente el contrato del comando: de “ID de la ronda de investigación” a “ID del nodo de memoria a consultar”. También añade la creación/reutilización de la ronda y conserva el vínculo con el nodo mediante `contexto.nodo_id`. fileciteturn65file0L3-L7

### Diagnóstico

No era un problema de la idea de las rondas. Era una **confusión entre dos entidades distintas del modelo de datos**:

- nodo de memoria;
- ronda de investigación.

### Corrección

El adaptador Discord dejó de decidir qué era una ronda. Recibe un nodo, reconstruye el contexto y genera/reutiliza la ronda correspondiente.

### Consecuencia arquitectónica

Se reforzó la separación entre:

**interfaz Discord → adaptador → modelo Arkhé → ronda → intervención.**

### Lo que sobrevivió

La metodología de ronda dirigida permaneció intacta.

### Clasificación

**ERROR DE IMPLEMENTACIÓN / CORRECCIÓN DE CONTRATO DE DATOS.**

---

# 2. UUID vs. identificador numérico: integración real reveló una inconsistencia de tipos

### Evidencia

Durante la integración aparecieron correcciones explícitas en Atlas para aceptar UUID en `investigacion_id` y en `atlas-producir`, además de una corrección posterior para registrar el autor requerido. Los commits documentan:

- `b3dfb87305f0f00e91f39e8c53ca946dae8ec387` — aceptar UUID en `investigacion_id` de producción;
- `20f0637c06c3d5b7ec9298e34a6979c76da65506` — aceptar UUID en `atlas-producir`;
- `8723de8e1acb2701ff7262902e41963c739daa22` — registrar el autor requerido en producciones de Atlas.

### Diagnóstico

La arquitectura conceptual ya trabajaba con investigaciones y relaciones trazables, pero la implementación inicial no mantenía de forma consistente el tipo de identificador entre capas.

### Corrección

Se ajustó la entrada y persistencia para trabajar con UUID donde el esquema lo requería y se completaron campos obligatorios de persistencia.

### Consecuencia arquitectónica

Se hizo visible una regla técnica importante: **los contratos entre Discord, Supabase y los módulos de los investigadores deben compartir un modelo de identificadores explícito**.

### Lo que sobrevivió

La identidad persistente de las investigaciones y la trazabilidad entre intervenciones.

### Clasificación

**ERROR DE INTEGRACIÓN / CONTRATO DE DATOS.**

---

# 3. Proveedor de motor: DeepSeek → Groq

### Problema

Tekton comenzó utilizando DeepSeek como motor. Durante la integración se produjo una limitación del proveedor que impidió continuar con ese camino en las condiciones disponibles.

### Corrección

El commit `e7d0643d55021763dfcc6375f1058a441aa24960` registra el cambio de DeepSeek a Groq y configura el cliente OpenAI-compatible de Groq, junto con `GROQ_MODEL`. fileciteturn66file0L3-L7

### Diagnóstico

Esto no demuestra que DeepSeek fuera técnicamente incapaz de servir para Tekton. Demuestra que **el proveedor disponible en ese momento no satisfacía las condiciones operativas del experimento**.

### Consecuencia arquitectónica

El motor pasó a ser explícitamente un componente sustituible:

**Tekton ≠ proveedor de modelo.**

La identidad del investigador y su contrato permanecen aunque cambie el motor.

### Lo que sobrevivió

- Tekton como investigador estructural;
- el contrato de análisis;
- Supabase como memoria compartida;
- Discord como canal operativo.

### Clasificación

**CAMBIO DE INFRAESTRUCTURA / PROVEEDOR, NO CAMBIO DE IDENTIDAD DEL INVESTIGADOR.**

---

# 4. `reasoning_effort` de Groq: una configuración asumida que produjo una fricción del proveedor

### Problema

En la transición a Groq se incorporó inicialmente una configuración `reasoning_effort`. El historial técnico muestra después una corrección específica del uso de la configuración de razonamiento de Groq.

### Diagnóstico

La implementación había supuesto compatibilidad de una opción del SDK/API entre proveedores OpenAI-compatible sin verificar completamente que la opción y su semántica fueran equivalentes.

### Corrección

Se retiró/ajustó la configuración incompatible hasta obtener una llamada funcional con el proveedor elegido.

### Consecuencia

Se refuerza una regla técnica:

> **“Compatible con la API” no significa “idéntico en todas las capacidades”.**

Cada proveedor debe validarse por separado antes de convertir sus parámetros en parte de la arquitectura.

### Clasificación

**ERROR DE CONFIGURACIÓN / SUPOSICIÓN DE COMPATIBILIDAD.**

No es un error metodológico de Tekton ni de Arkhé.

---

# 5. `tekton-evaluar`: una función redundante fue retirada

### Antes

Tekton tenía una ruta separada de evaluación (`tekton-evaluar`) además de su capacidad de análisis mediante IA.

### Fricción

La separación empezó a duplicar funciones: una ruta podía cambiar el estado de un nodo mientras otra ya producía la contribución epistemológica/estructural de Tekton.

### Corrección

El commit `83125999bf13b192b5f8b5b07c727874471a0c3f` registra explícitamente el retiro de `Tekton-evaluar`, manteniendo el análisis impulsado por IA como contribución de Tekton. fileciteturn64file0L3-L6

### Consecuencia arquitectónica

Se redujo la superficie de comandos y se evitó representar como dos capacidades independientes algo que conceptualmente podía mantenerse dentro de la contribución del investigador.

### Lo que sobrevivió

Tekton sigue pudiendo analizar, cuestionar y producir una posición provisional.

### Clasificación

**REDUNDANCIA DE DISEÑO / SIMPLIFICACIÓN ARQUITECTÓNICA.**

---

# 6. Salidas de Discord: el contenido de investigación chocó con una restricción del canal

### Problema

Las respuestas de Aletheia y Tekton podían ser demasiado largas para Discord. Esto no era un problema del contenido investigativo, sino del canal de transporte.

### Corrección

Los repositorios registran adaptaciones específicas para fragmentar respuestas largas de Tekton y soportar respuestas largas de Aletheia.

### Diagnóstico

El canal no puede dictar la forma epistemológica del resultado. La salida debe adaptarse al canal sin destruir el contenido.

### Clasificación

**RESTRICCIÓN DE INTERFAZ / TRANSPORTE.**

### Principio conservado

El canal es medio de operación; no define la identidad ni el método del investigador.

---

# 7. Adaptadores de Discord aislados del contrato metodológico

Durante la construcción de las rondas de Atlas se introdujo una separación explícita entre el adaptador Discord y el núcleo de la ronda. El propio commit de Atlas declara que el adaptador mantiene el manejo de Discord fuera del contrato metodológico y que prepara/reutiliza una ronda a partir de un nodo. fileciteturn65file0L7-L11

Esto es más que una cuestión de estilo: reduce el riesgo de que una decisión del canal termine modificando silenciosamente la metodología.

### Clasificación

**DECISIÓN ARQUITECTÓNICA CONSOLIDADA A PARTIR DE UNA FRICTION DE INTEGRACIÓN.**

---

# 8. Rondas independientes y numeración: el sistema tuvo que aclarar su unidad de continuidad

Aletheia registra un cambio específico para mantener el número de ronda global dentro de una investigación, y posteriormente Atlas/Tekton desarrollaron adaptadores para rondas independientes y réplicas dirigidas.

Esto muestra una fricción distinta: no era solo “guardar una respuesta”, sino decidir **qué entidad representa la continuidad de una conversación investigativa**.

### Resultado

La ronda dejó de ser un simple contador asociado a una interacción de Discord y pasó a ser una entidad persistente con:

- investigación;
- número;
- estado;
- investigador/destinatario;
- ronda padre cuando corresponde;
- contexto;
- intervención.

### Clasificación

**EVOLUCIÓN DEL MODELO DE DATOS / ARQUITECTURA DE TRAZABILIDAD.**

---

# 9. Lo que la capa técnica NO demuestra

La existencia de estos bugs y correcciones no demuestra que la metodología de Arkhé sea verdadera, completa o robusta.

Tampoco demuestra por sí misma:

- resolución correcta de contradicciones;
- ausencia de sesgo de consenso;
- escalabilidad;
- seguridad;
- concurrencia masiva;
- calidad epistemológica de las respuestas de los modelos;
- independencia perfecta entre investigadores.

La capa técnica solamente demuestra algo más modesto y útil: **la metodología fue suficientemente concreta como para producir fallos observables, diagnósticos y correcciones en una implementación real.**

---

# 10. Patrón histórico encontrado

Los problemas técnicos de Arkhé parecen agruparse en cinco clases:

### A. Contrato de datos
Ej.: nodo vs. ronda; UUID vs. entero; campos obligatorios.

### B. Proveedor
Ej.: cambio DeepSeek → Groq.

### C. Compatibilidad de capacidades
Ej.: parámetros de razonamiento asumidos como compatibles.

### D. Redundancia arquitectónica
Ej.: retiro de `tekton-evaluar`.

### E. Restricción de canal
Ej.: fragmentación de respuestas para Discord.

Esta clasificación ayuda a evitar un error conceptual: **no todo fallo que aparece durante la construcción pertenece al mismo nivel del proyecto.**

---

# 11. Regla técnica derivada

De esta excavación aparece una regla que complementa la regla histórica de 3E:

> **Cuando una implementación falla, primero debemos localizar el nivel del fallo antes de modificar el principio que la implementación pretendía realizar.**

Orden de diagnóstico:

1. ¿Es un dato o tipo incorrecto?
2. ¿Es un contrato entre módulos?
3. ¿Es una limitación del proveedor?
4. ¿Es una restricción del canal?
5. ¿Es una redundancia arquitectónica?
6. ¿O realmente existe evidencia de que el principio metodológico debe cambiar?

Solo el último caso justifica revisar el nivel metodológico.

---

# 12. Relación con el spawnpoint

La Capa 3F también permite entender mejor qué significa el spawnpoint.

El spawnpoint no congeló cada implementación concreta. Congeló un **estado seguro de referencia** desde el cual futuras modificaciones pueden compararse y revertirse si es necesario.

La existencia posterior de cambios de proveedor, correcciones de tipos, simplificaciones de comandos o ajustes de canal no invalida el spawnpoint. Al contrario: muestra por qué era necesario.

---

# 13. Resultado provisional de la Capa 3F

La evidencia disponible permite afirmar provisionalmente:

**Arkhé aprendió a través de la implementación sin confundir los errores de construcción con errores de propósito.**

Los bugs obligaron a aclarar contratos, separar capas, hacer sustituibles los proveedores, reducir redundancias y mejorar trazabilidad.

El elemento que permanece estable es la dirección metodológica:

**humano → pregunta → perspectivas → contraste → réplica dirigida → trazabilidad → decisión humana.**

---

# 14. Siguiente capa — 3G

La siguiente excavación debe centrarse en un punto todavía más fino:

> **¿Qué decisiones técnicas fueron tomadas explícitamente antes del spawnpoint y cuáles quedaron descartadas, simplificadas o absorbidas por la arquitectura final?**

La Capa 3G deberá distinguir:

- decisión técnica explícita;
- experimento técnico;
- solución provisional;
- código descartado;
- arquitectura absorbida;
- arquitectura realmente vigente;
- decisión que nunca llegó a probarse.

No debemos asumir que todo commit histórico representa una decisión arquitectónica consolidada.
