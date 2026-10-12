# Política de Modelos de Arkhé v0.1

**Estado:** propuesta documental para revisión humana; no autoriza cambios de motores, secretos, despliegues ni convocatorias.  
**Fecha:** 2026-10-12  
**Rama:** `docs/model-policy-v0.1`  
**Responsable de aprobación:** Ángel.

## 1. Propósito

Definir cómo Arkhé selecciona, evalúa, cambia y registra los modelos de IA usados por Atlas, Aletheia y Tekton, manteniendo separadas la identidad de cada investigador, el motor de inferencia y la infraestructura que lo ejecuta.

Esta política es una base v0.1, no una arquitectura definitiva. Los modelos y proveedores cambian; las identidades, los principios epistemológicos y el gobierno humano no deben depender de un proveedor concreto.

## 2. Decisiones rectoras aprobadas

1. **Selección económica:** priorizar modelos gratuitos o de bajo costo, siempre que cumplan el mínimo de calidad y fiabilidad de la tarea. Los costos no autorizados quedan prohibidos.
2. **Migración local:** priorizar privacidad, control de datos, memoria y entorno de ejecución. La ejecución local no implica que herramientas, APIs o repositorios conectados sean locales; cada salida remota se evalúa por separado.
3. **Gobierno de cambios:** los investigadores pueden comparar modelos y proponer cambios con evidencia. Ángel aprueba los cambios de modelo/configuración autorizada. Ningún agente puede autoaprobarse un motor, proveedor, gasto o permiso.
4. **Sin convocatorias reales durante pruebas:** pruebas de configuración y benchmarks deben usar casos sintéticos/offline. No crear rondas, convocatorias ni despachos reales; no reintentar el dispatch revocado ni alterar la convocatoria que permanece en estado `error`.

## 3. Separación de conceptos

- **Identidad del investigador:** nombre identitario, ID, propósito, especialidad, principios, prompt de identidad, memoria propia e historial de intervenciones.
- **Modelo:** proveedor, identificador exacto del modelo, versión/alias, capacidades, límites, costo y parámetros de inferencia.
- **Infraestructura:** entorno donde se ejecuta el motor, runtime, servicio, región, almacenamiento, conectividad y herramientas disponibles.
- **Canal:** Discord, HTTP u otro transporte. Un canal no define la identidad ni el modelo.
- **Gobierno y permisos:** autorización de Ángel y políticas del Core. No se derivan de la capacidad del modelo.

Cambiar el modelo o el lugar de ejecución no crea un investigador nuevo, no borra su historia y no amplía sus permisos. Las migraciones de memoria requieren su propio plan de compatibilidad y auditoría.

## 4. Funciones epistemológicas

- **Atlas:** síntesis, integración de perspectivas, continuidad contextual y formulación de conclusiones provisionales.
- **Aletheia:** crítica, falsación, búsqueda de contraejemplos, detección de supuestos y límites de la evidencia.
- **Tekton:** arquitectura de sistemas, revisión de código, depuración y viabilidad técnica.

La elección se hace por desempeño en la función concreta, no por una clasificación universal de modelos. La metodología Doble Rendija requiere que los investigadores preserven análisis independientes antes del contraste. Compartir proveedor no invalida automáticamente la independencia, pero debe registrarse como posible limitación de diversidad.

## 5. Selección de modelos y presupuesto

Evaluar en este orden:

1. Compatibilidad técnica con el adaptador y el formato requerido.
2. Calidad específica del rol, precisión, razonamiento y capacidad para reconocer incertidumbre.
3. Cumplimiento de instrucciones y estructura de salida.
4. Costo real, límites gratuitos, cuotas y probabilidad de disponibilidad.
5. Latencia, estabilidad, contexto y límites de salida.
6. Tratamiento de datos, retención, ubicación y condiciones del proveedor.
7. Capacidad de producir perspectivas suficientemente distintas de las de los otros investigadores.

Un modelo gratuito no se considera automáticamente elegible: se valida la cuota vigente, sus condiciones y el resultado de las pruebas. Si un caso exige un modelo de pago, el investigador documenta la necesidad y el costo estimado; Ángel debe aprobarlo antes de habilitar gasto.

Los límites de costo, claves y cuotas se configuran fuera del código y nunca se escriben en prompts, logs públicos, commits o documentación.

## 6. Registro normalizado por investigador

La arquitectura objetivo debe poder describir cada configuración con estos campos conceptuales:

- `researcher_id`: identidad estable del investigador.
- `provider_id`: proveedor o runtime local.
- `model_id`: identificador exacto aceptado por el proveedor.
- `model_version`: versión fijada, cuando esté disponible.
- `adapter_id` y `adapter_version`: integración que invoca el modelo.
- `capabilities`: funciones probadas, no supuestas.
- `cost_class` y `budget_limit`: nivel de costo y límite autorizado.
- `data_classification` y `egress_policy`: tipos de datos permitidos y destinos remotos.
- `config_version`, `approved_by`, `approved_at` y estado de aprobación.
- `fallback_policy`: lista explícita de alternativas autorizadas, si las hay.

Este esquema es una propuesta conceptual, no una instrucción para crear tablas inmediatamente. Antes de persistirlo en Supabase se revisarán el esquema existente, las políticas de acceso, las migraciones abiertas y los límites de gobierno humano.

Cada intervención deberá registrar, cuando el proveedor lo permita, el modelo realmente utilizado, proveedor, versión de configuración, adaptador y metadatos necesarios para auditar el resultado. No basta con registrar el modelo solicitado si hubo fallback. Nunca registrar secretos ni contenido privado innecesario.

## 7. Cambios, fallbacks y aprobación

- Los investigadores presentan una propuesta con motivo, evidencia, costo, implicaciones de privacidad, resultados de benchmark y plan de reversión.
- Ángel aprueba o rechaza el cambio antes de modificar la configuración activa.
- Las pruebas se ejecutan en rama/entorno aislado con datos sintéticos y sin publicar en Discord.
- Los fallbacks sólo pueden usar modelos previamente aprobados. Debe registrarse el modelo final realmente usado.
- Un fallback no debe convertir un fallo ambiguo en un reintento de una operación de Core. La inferencia y la persistencia de intervenciones son fases distintas.
- Si el resultado de una escritura es incierto, se detiene el flujo y se reconcilia con evidencia; no se reintenta automáticamente.
- Los cambios de identidad, permisos, memoria, proveedor de datos o infraestructura no se consideran un simple cambio de modelo y requieren una revisión separada.

La documentación de OpenRouter indica que su enrutamiento de fallbacks puede probar modelos alternativos cuando falla el principal y que el campo `model` de la respuesta identifica el modelo finalmente usado. Esa funcionalidad no sustituye el registro de procedencia ni la aprobación de Arkhé. Véase [documentación de fallbacks](https://openrouter.ai/docs/guides/routing/model-fallbacks).

## 8. Inventario técnico observado en repositorios (sólo lectura)

Revisión de `main` realizada el 2026-10-12. Los hallazgos describen el código inspeccionado; no certifican que los secretos estén presentes, que las cuotas estén disponibles ni que el proveedor responda en runtime.

| Investigador | Integración observada | Configuración/modelo observado | Riesgo o tarea pendiente |
|---|---|---|---|
| Atlas | SDK `openai`; usa OpenRouter cuando está configurada `OPENROUTER_API_KEY`, con compatibilidad `OPENAI_API_KEY` | En `arkhe-round.js`, la ruta de convocatoria usa `OPENROUTER_MODEL || OPENAI_MODEL || openai/gpt-oss-20b` y añade alternativas `openai/gpt-oss-20b`, `openai/gpt-oss-120b:free`. Hay otras rutas con resolución de modelo distinta. | Normalizar la resolución de modelo; verificar disponibilidad, costo y compatibilidad de formato de cada ID. Atlas Preview tuvo un fallo por ausencia de motor configurado en ese entorno; no copiar credenciales de producción. |
| Aletheia | SDK `@google/genai` con `GEMINI_API_KEY` | `index.js` crea el cliente Gemini; la selección de modelo ocurre en módulos de ronda y debe inventariarse por ruta antes de editar. | Revisar todos los módulos y sus valores por defecto/fallbacks. La documentación oficial recomienda usar IDs de modelo admitidos por el endpoint de listado vigente: [Models API](https://ai.google.dev/api/models?hl=es-419). |
| Tekton | SDK `openai` apuntando al endpoint compatible de Groq | `GROQ_MODEL || openai/gpt-oss-20b` | Normalizar la configuración y verificar el identificador con el catálogo vigente de Groq antes de probarlo. |

Los tres repositorios de bots tienen `main` y ramas de trabajo/seguridad; esta revisión no fusionó ramas ni cambió código. El Dashboard también mantiene ramas de auditoría y seguridad abiertas. Antes de cualquier implementación se deben revisar los PRs y sus diferencias más recientes para evitar pisar trabajo en curso.

El repositorio `arkhe-tlacuilo-runner` registra que Atlas Preview carecía de motor configurado y que el dispatch anterior quedó `revoked), con cero intervenciones; la convocatoria correspondiente sigue en `error`. Ese estado es histórico de seguridad: no se debe reactivar ni repetir durante esta fase.

## 9. Adaptador común como objetivo de arquitectura

El objetivo es que cada investigador invoque una interfaz estable y que el adaptador traduzca la solicitud al proveedor o runtime seleccionado. La identidad y el prompt del investigador deben permanecer fuera del adaptador específico del proveedor.

La interfaz debe separar al menos:

- solicitud de inferencia;
- configuración de modelo aprobada;
- respuesta y metadatos de procedencia;
- error clasificado (cuota, indisponibilidad, formato, autenticación, límite de contexto);
- persistencia de intervención, que corresponde al Core y no al adaptador del modelo.

La primera entrega debe ser documental y de pruebas unitarias/sintéticas. No se refactorizan los tres bots en el mismo cambio. Cada adaptación futura tendrá su rama, CI, comparación de comportamiento y revisión humana independiente.

## 10. Privacidad y migración local

La migración debe avanzar por etapas:

1. **Inventario de datos:** identificar qué contenido se envía a cada proveedor y qué se conserva.
2. **Separación de secretos y configuración:** no exponer claves ni valores de entorno; comprobar únicamente presencia/ausencia y estado seguro.
3. **Pruebas sintéticas:** comparar resultados sin usar convocatorias reales ni datos sensibles.
4. **Runtime local experimental:** conectar un modelo local detrás de la misma interfaz, sin asumir que por ser local tiene calidad o capacidades equivalentes.
5. **Herramientas remotas:** documentar cada conexión externa, permisos, datos transmitidos y confirmaciones humanas. Un MCP remoto o una API externa sigue siendo una salida de datos.
6. **Migración controlada:** comparar resultados, conservar procedencia, planificar reversión y obtener aprobación de Ángel.

La ejecución local en un iPhone con recursos limitados se considera laboratorio de experimentación, no infraestructura de producción. La arquitectura debe poder trasladarse en el futuro a un servidor local sin cambiar la identidad de los investigadores.

## 11. Plan de evaluación sintética

Crear un conjunto pequeño, versionado y reproducible de casos sintéticos por rol. Cada candidato se evalúa con los mismos criterios, pero con rúbricas propias del rol:

- precisión y razonamiento;
- calidad de la crítica o síntesis;
- reconocimiento de incertidumbre;
- cumplimiento de esquema;
- alucinación/invención de fuentes;
- latencia, consumo y costo;
- robustez ante errores;
- privacidad y destinos de datos;
- diversidad de perspectiva frente a los otros investigadores.

Las pruebas no deben llamar a endpoints de convocatoria, no deben escribir en Supabase, no deben publicar en Discord y no deben reutilizar dispatches previos. Se permiten pruebas unitarias, mocks, fixtures y llamadas aisladas al proveedor sólo con contenido sintético y dentro de cuotas aprobadas.

## 12. Secuencia de implementación propuesta

1. Aprobar esta política documental.
2. Completar un inventario de todos los módulos que invocan modelos en Atlas, Aletheia y Tekton; localizar valores por defecto, fallbacks, límites y campos de procedencia.
3. Verificar de forma segura presencia de variables en entornos de prueba, sin leer ni imprimir sus valores.
4. Definir el contrato del adaptador común y un registro de configuración en formato documental, sin migrar base de datos todavía.
5. Añadir pruebas unitarias de resolución de modelo, fallback autorizado, procedencia y error; sin convocatorias reales.
6. Ejecutar benchmarks sintéticos y presentar resultados a Ángel.
7. Sólo después de aprobación explícita, implementar una primera integración aislada en una rama, comenzando por un investigador y sin tocar `main` ni producción.
8. Evaluar la ruta local como adaptador adicional, no como sustitución de identidad.

## 13. Criterios de aceptación de v0.1

- [ ] Identidad, modelo, infraestructura, canal y permisos están definidos por separado.
- [ ] Ángel es el aprobador de cambios de modelo/configuración.
- [ ] La prioridad de costo y las reglas para gasto están explícitas.
- [ ] Los datos transmitidos a proveedores y herramientas remotas se evalúan por separado.
- [ ] Cada intervención puede atribuirse al modelo real utilizado, incluyendo fallback cuando aplique.
- [ ] Hay una política de pruebas sintéticas que excluye convocatorias reales, escritura en Core y publicación en Discord.
- [ ] No se cambió código de los bots, variables de entorno, Supabase, RLS, servicios Render/Vercel ni estado de convocatorias al redactar esta política.

## Historial

- **v0.1 — 2026-10-12:** primera propuesta; refleja las tres decisiones aprobadas por Ángel. Pendiente de revisión/aprobación explícita.
