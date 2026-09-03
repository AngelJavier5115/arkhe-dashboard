# Memoria de Rumbo — Proyecto Arkhé

**Fecha:** 2026-09-03
**Estado:** ACTIVA
**Spawnpoint de referencia:** `docs/SPAWNPOINT_METODOLOGIA_ARKE_0_X.md`

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

No estamos empezando de cero: tenemos una base funcional, un spawnpoint, una metodología probada y esta memoria de rumbo.

> **Arkhé no avanza por acumular funciones; avanza cuando cada nueva capacidad conserva el propósito, la memoria, la libertad de investigación y el control humano mientras aumenta nuestra capacidad para preguntar, contrastar, construir y comprender.**

**Regla final:** cuando no sepamos qué sigue, volvemos a esta memoria y al spawnpoint antes de decidir el siguiente paso.
