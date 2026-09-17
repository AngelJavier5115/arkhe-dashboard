# Memoria de Rumbo — Proyecto Arkhé

**Fecha:** 2026-09-17  
**Estado:** ACTIVA  
**Archivo Maestro operativo:** `docs/ARCHIVO_MAESTRO_ARKHE_v0.2.md`  
**Archivo Maestro histórico:** `Archivo_Maestro_Arkhé_v0.1.md`  
**Spawnpoint de referencia:** `docs/SPAWNPOINT_METODOLOGIA_ARKE_0_X.md`  
**Excavaciones históricas relevantes:** `docs/EXCAVACION_CRUCE_EXPORTACIONES_ARKHE_v0.1.md`, `docs/EXCAVACION_EXPERIMENTOS_Y_CAMBIOS_CRONOLOGICOS_ARKHE_v0.1.md`, `docs/EXCAVACION_DECISIONES_REEMPLAZADAS_ARKHE_v0.1.md`, `docs/EXCAVACION_ERRORES_IMPLEMENTACION_ARKHE_v0.1.md`, `docs/EXCAVACION_DECISIONES_TECNICAS_ARKHE_v0.1.md`

## Propósito
Esta memoria conserva el rumbo conceptual y operativo de Arkhé entre etapas. Antes de cambios importantes responde: **¿esto fortalece Arkhé o nos desvía?**

## Qué es Arkhé
Arkhé es un proyecto de investigación y de vida orientado a comprender la realidad mediante preguntas, aprendizaje, investigación, contraste de perspectivas y construcción progresiva de conocimiento. El ser humano permanece en el centro del proceso.

## Los cuatro investigadores
- **Ángel:** investigador humano, conductor del proyecto y responsable de las decisiones fundamentales.
- **Atlas:** investigación general, exploración, conexiones y reflexión.
- **Aletheia:** contrapeso crítico; cuestiona premisas, contradicciones, límites y posibles errores.
- **Tekton:** análisis estructural y arquitectónico; consistencia técnica, trazabilidad, infraestructura y viabilidad.

Los bots, modelos y canales son medios de operación. **Investigador ≠ modelo ≠ canal.** Cambiar de modelo o aplicación no cambia la identidad del investigador dentro de Arkhé.

## Principio humano de conducción
Los investigadores pueden aportar perspectivas, análisis, críticas, hipótesis y declarar insuficiencia de información. No deben iniciar debates infinitos, forzar consenso, decidir automáticamente la verdad, alterar por sí mismos el estado colectivo ni continuar rondas sin instrucción humana.

La conclusión final permanece bajo conducción humana.

## Metodología validada
1. Ángel plantea una pregunta o investigación.
2. Los investigadores seleccionados aportan perspectivas independientes.
3. Ángel analiza las perspectivas.
4. Ángel decide si acepta, cuestiona o abre otra ronda.
5. Puede dirigir una réplica a un investigador y a una intervención concreta.
6. La réplica queda vinculada a su ronda padre y conserva trazabilidad explícita.
7. No se genera automáticamente otra ronda.
8. Las posiciones pueden ser provisionales o declarar insuficiencia.
9. La conclusión permanece bajo conducción humana.

Las rondas muestran diferencias y argumentos; **no son una votación automática de la verdad**.

## Spawnpoint
`SPAWNPOINT_METODOLOGIA_ARKE_0_X.md` es nuestra línea base. La prueba final demostró funcionalmente:

**perspectiva → análisis humano → réplica dirigida → trazabilidad explícita → ausencia de continuación automática.**

Se verificó que el nodo ancla no cambió de estado, que la réplica tuvo padre explícito, que Tekton respondió a la intervención concreta de Aletheia, que la intervención quedó vinculada al nodo correcto, que no apareció una ronda automática adicional y que no hubo bucle automático.

El spawnpoint **no** afirma robustez epistemológica general, escalabilidad, concurrencia masiva, resiliencia ante contradicciones sistemáticas ni preparación para producción.

## Preguntas pendientes
1. Resolución de contradicciones.
2. Filtrado y clasificación de ruido.
3. Auditoría del sesgo de consenso.
4. Escalabilidad y concurrencia.
5. Gobernanza y versionado de grafos y `ref_id`.
6. Auditoría de trazabilidad y recuperación/rollback.
7. Fallos de motores y canales.
8. Sincronización entre canales de comunicación.
9. Seguridad antes de exposición pública.
10. Criterios formales para evaluar la calidad de una investigación.

## Regla de alineación
Antes de un cambio importante debemos responder:

**A. ¿Qué cambia?** Identificar exactamente el componente o comportamiento.

**B. ¿Por qué cambia?** Registrar la necesidad, problema o evidencia.

**C. ¿Qué principio de Arkhé protege o mejora?** Investigación, aprendizaje, contraste, control humano, identidad de los investigadores, memoria, trazabilidad, seguridad o capacidad técnica.

**D. ¿Cómo sabremos que no rompimos algo?** Definir pruebas e invariantes antes de implementarlo.

Si no podemos responder las cuatro, detenemos el cambio y lo discutimos.

## Señales de desviación
Revisar antes de avanzar si una propuesta:
- fusiona a los cuatro investigadores en una sola identidad;
- confunde investigador con modelo;
- quita a Ángel el control de decisiones fundamentales;
- crea ciclos automáticos de discusión;
- convierte consenso en sustituto de evidencia;
- oculta contradicciones;
- borra historial para simplificar;
- agrega automatización sin trazabilidad;
- añade complejidad sin necesidad demostrada.

Una señal de desviación no implica que la idea sea incorrecta; implica que requiere revisión consciente.

## Arquitectura documental
A partir de la versión 0.2 se separan tres niveles:

1. **Memoria maestra operativa:** `docs/ARCHIVO_MAESTRO_ARKHE_v0.2.md`.
2. **Archivo histórico:** `Archivo_Maestro_Arkhé_v0.1.md` y memorias anteriores.
3. **Fuentes originales:** conversaciones, exportaciones e informes que permiten reconstruir el origen de decisiones.

El objetivo es **reducir ruido sin perder memoria**.

### Nueva evidencia histórica — 2026-09-16
Se completó una primera excavación cruzada de las exportaciones de Atlas/ChatGPT y Aletheia/Gemini: `docs/EXCAVACION_CRUCE_EXPORTACIONES_ARKHE_v0.1.md`.

Hallazgos principales:
- 24 de julio de 2026 queda como el inicio más antiguo de Arkhé que podemos demostrar actualmente en la exportación conversacional de Atlas; no se afirma que sea el nacimiento absoluto.
- Árbol/poda están documentados el 26 de julio.
- Doble Rendija, Hipótesis Evolutiva, Error Productivo y Comprensión Profunda están documentados en la conversación de Atlas del 31 de julio; Error Productivo queda demostrado al menos desde esa fecha.
- La incorporación formal de Aletheia queda documentada en la actividad de Gemini del 4 de agosto.
- Tekton aparece nombrado en Atlas el 31 de julio, pero su incorporación formal como cuarto investigador queda documentada claramente en la actividad de Gemini del 23 de agosto.
- La necesidad de memoria externa se relaciona con problemas reales de continuidad y comprensión de archivos durante agosto.
- La distinción **Investigador ≠ modelo ≠ canal** debe entenderse como una regla evolucionada durante la implementación, no como una premisa necesariamente completa desde el inicio.

**Corrección de rigor documental:** `MiActividad.json` de Gemini registra principalmente las peticiones/actividad de Ángel y no constituye por sí mismo una transcripción completa de las respuestas de Gemini. Por ello, las conclusiones atribuidas a Aletheia deben apoyarse en contenido explícito conservado en las fuentes o tratarse como evidencia secundaria cuando Ángel reproduce una respuesta.

### Nueva excavación — experimentos y cambios cronológicos — 2026-09-16
Se incorporó `docs/EXCAVACION_EXPERIMENTOS_Y_CAMBIOS_CRONOLOGICOS_ARKHE_v0.1.md` como Capa 3D.

El hallazgo central es que los cambios metodológicos más sólidos aparecen cuando una idea encuentra una fricción concreta y esa fricción obliga a modificar la pregunta, el criterio, el método o la arquitectura.

Casos reconstruidos:
- aprendizaje: de páginas leídas a ideas comprendidas y aplicables;
- negocios: de “qué negocio” a “qué necesidad recurrente”;
- PEC: de filtro de herramientas a instrumento que también genera conocimiento metodológico;
- Photoshop: reapertura de una decisión al aparecer una variable relevante del investigador;
- independencia del método respecto de herramientas;
- evolución de perspectivas diferenciadas hasta la arquitectura de cuatro investigadores;
- memoria: sustitución de arquitecturas concretas sin perder la necesidad original de continuidad;
- metodología técnica: perspectivas → análisis humano → réplica dirigida → trazabilidad → ausencia de continuación automática.

Esta excavación refuerza una distinción importante: **no todo cambio de rumbo es un error**. Deben distinguirse error cometido, error evitado, cambio por evidencia, evolución de método y propuesta no validada.

### Nueva excavación — decisiones aceptadas y posteriormente reemplazadas — 2026-09-16
Se incorporó `docs/EXCAVACION_DECISIONES_REEMPLAZADAS_ARKHE_v0.1.md` como Capa 3E.

Hallazgo central: Arkhé ha reemplazado soluciones sin cambiar necesariamente su identidad. Se identificaron cuatro patrones: reemplazo por escala, cambio de categoría, nueva arquitectura y refinamiento sin reemplazo.

Casos destacados:
- chat/bitácora → memoria documental versionada;
- Archivo Maestro v0.1 → v0.2 operativo + v0.1 histórico;
- PEC central → instrumento secundario;
- tres llaves → protección compatible con cuatro investigadores;
- Ángel + Atlas → arquitectura ampliada, sin abandonar la relación original;
- Doble Rendija → refinamiento con falsabilidad explícita;
- dependencia de herramientas → independencia del método respecto de ellas.

La regla histórica derivada es: **separar lo que una decisión intentaba proteger de la forma concreta que utilizó para protegerlo.**

### Nueva excavación — errores de implementación y cambios de arquitectura técnica — 2026-09-17
Se incorporó `docs/EXCAVACION_ERRORES_IMPLEMENTACION_ARKHE_v0.1.md` como Capa 3F.

La capa distingue estrictamente entre error local de implementación, contrato de datos, limitación de proveedor, restricción de canal, redundancia arquitectónica y cambio metodológico.

Casos reconstruidos:
- nodo de memoria ≠ ronda;
- UUID ≠ identificador numérico inconsistente entre capas;
- DeepSeek → Groq como cambio de infraestructura, no de identidad de Tekton;
- `reasoning_effort` como supuesto de compatibilidad corregido;
- retiro de `tekton-evaluar` por redundancia;
- fragmentación de respuestas como adaptación de transporte;
- separación del adaptador Discord respecto del contrato metodológico;
- consolidación de la ronda como entidad persistente y trazable.

Regla técnica derivada: **cuando una implementación falla, primero debemos localizar el nivel del fallo antes de modificar el principio que la implementación pretendía realizar.**

### Nueva excavación — decisiones técnicas y arquitectura absorbida — 2026-09-17
Se incorporó `docs/EXCAVACION_DECISIONES_TECNICAS_ARKHE_v0.1.md` como Capa 3G.

Esta capa distingue entre decisión técnica explícita, experimento, solución provisional, código descartado, arquitectura absorbida, arquitectura vigente y decisión no demostrada.

Hallazgos principales:
- la separación nodo → ronda → intervención quedó absorbida como arquitectura de trazabilidad;
- la réplica padre → intervención → destinatario quedó consolidada como representación técnica de la metodología;
- el adaptador Discord quedó separado del núcleo metodológico;
- el proveedor de modelo pasó a ser un componente sustituible respecto de la identidad del investigador;
- parámetros específicos de proveedor fueron tratados como provisionales, no como reglas generales;
- `tekton-evaluar` fue descartado como ruta redundante mientras la capacidad de análisis de Tekton sobrevivió;
- las restricciones de Discord se resolvieron como problemas de transporte, no de epistemología;
- la consistencia de UUID quedó absorbida en el contrato de datos;
- el spawnpoint quedó entendido como referencia protegida y reversible, no como congelación de toda implementación.

También se registra una precaución documental: algunos SHA históricos mencionados en excavaciones anteriores ya no son recuperables directamente mediante el endpoint actual del repositorio. Esos casos se mantienen como evidencia histórica secundaria hasta disponer de una fuente primaria recuperable.

El patrón técnico general reconstruido es:

**experimento → fricción → diagnóstico → separación/simplificación → nueva prueba → absorción de lo útil.**

La siguiente capa ya no necesita descender indefinidamente por cada commit. El próximo frente queda definido como una **síntesis de la excavación 3**: identificar qué patrones repetidos de aprendizaje, error, reemplazo y construcción merecen convertirse en reglas explícitas de Arkhé 0.2 y cuáles deben permanecer como historia.

## Prioridades
1. Preservar propósito y metodología.
2. Preservar memoria y trazabilidad.
3. Robustez y confiabilidad.
4. Capacidades de investigación de los cuatro.
5. Comunicación entre investigadores y Ángel.
6. Dashboard e interfaz.
7. Automatización cuando exista una necesidad real.

## Estado actual
**Metodología central funcionalmente validada en escenario controlado; robustez todavía en investigación.**

No estamos empezando de cero: tenemos una base funcional, un spawnpoint, una metodología probada, cuatro investigadores y una memoria maestra operativa.

> **Arkhé no avanza por acumular funciones; avanza cuando cada nueva capacidad conserva el propósito, la memoria, la libertad de investigación y el control humano mientras aumenta nuestra capacidad para preguntar, contrastar, construir y comprender.**

**Regla final:** cuando no sepamos qué sigue, volvemos al Archivo Maestro operativo, esta memoria y el spawnpoint antes de decidir el siguiente paso.
