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
2. **Migración local como dirección futura, no como fase actual:** priorizar privacidad, control de datos, memoria y entorno de ejecución cuando exista infraestructura capaz de alojarla. Hoy no se dispone de una infraestructura local apropiada para producción, por lo que no se intentará forzar esta migración ni se tratará como requisito de la v0.1. La ejecución local futura tampoco implica que herramientas, APIs o repositorios conectados sean locales; cada salida remota se evalúa por separado.
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

### 8.1. Decisión operativa inmediata sobre motores

Durante la fase actual se mantienen las familias de proveedores existentes: Atlas conserva la integración OpenAI-compatible que ya tiene (el código prioriza OpenRouter cuando existe `OPENROUTER_API_KEY`, por lo que no debe asumirse que cada llamada va directamente a OpenAI); Aletheia conserva Google Gemini; Tekton conserva Groq hasta completar una comparación sintética. No se migrará ningún servicio ni se cambiarán credenciales como resultado de este borrador.

La evaluación de Tekton comparará como mínimo estos candidatos, sin declarar de antemano un ganador:

1. **Línea base:** Groq `openai/gpt-oss-20b`, el modelo configurado actualmente. El catálogo oficial muestra USD 0.075 por millón de tokens de entrada y USD 0.30 por millón de salida, contexto de 131,072 tokens y velocidad indicada de aproximadamente 1,000 tokens/segundo.
2. **Control dentro del mismo proveedor:** Groq `openai/gpt-oss-120b`. Permite explorar si un modelo mayor mejora tareas de arquitectura/código sin cambiar de proveedor; el catálogo consultado muestra USD 0.15 por millón de entrada y USD 0.60 por millón de salida, contexto de 131,072 tokens.
3. **Candidato de otro proveedor:** API directa de DeepSeek usando `deepseek-flash`, que la documentación identifica con la versión DeepSeek-V4.1-Flash. Publica contexto de 1 millón de tokens y tarifas pico de USD 0.30/M entrada y USD 1.20/M salida, con tarifas fuera de pico de USD 0.15/M y USD 0.60/M respectivamente. La API es compatible con el formato de OpenAI, pero requiere evaluación de calidad, precio final, latencia y contrato de datos antes de aprobarla.

Fuentes oficiales consultadas el 2026-10-12:
- [Modelos y precios de Groq](https://console.groq.com/docs/models)
- [Modelos y precios de DeepSeek API](https://api-docs.deepseek.com/quick_start/pricing/)
- [Política de privacidad de DeepSeek](https://cdn.deepseek.com/policies/en-US/deepseek-privacy-policy.html)

**Condición de privacidad para DeepSeek:** la política de privacidad consultada indica que los datos pueden procesarse y almacenarse en servidores en la República Popular China. Por tanto, cualquier prueba inicial con este proveedor queda limitada a prompts, código de ejemplo y fixtures sintéticos sin datos privados, memorias sensibles, claves ni contenido confidencial de Arkhé. Su candidatura no constituye aprobación para uso con información real.

La comparación debe permitir distinguir dos variables: efecto del tamaño/modelo manteniendo Groq, y efecto de cambiar de proveedor/modelo con DeepSeek. Una diferencia observada no se atribuirá únicamente al proveedor cuando el modelo también haya cambiado.

El repositorio `arkhe-tlacuilo-runner` registra que Atlas Preview carecía de motor configurado y que el dispatch anterior quedó `revoked`, con cero intervenciones; la convocatoria correspondiente sigue en `error`. Ese estado es histórico de seguridad: no se debe reactivar ni repetir durante esta fase.


### Candidatos iniciales para evaluar en Tekton (no aprobados)

El objetivo de la siguiente etapa es comprobar si existe una alternativa mejor para la función arquitectónica de Tekton sin asumir que el nombre del modelo o los benchmarks del proveedor prueban superioridad en Arkhé. Se compararán con el código/modelo Groq actual como línea base y sólo con entradas sintéticas.

| Candidato | Evidencia publicada relevante | Costo/acceso publicado | Consideraciones antes de elegir |
|---|---|---|---|
| **DeepSeek V4.1 Flash** (`deepseek-flash`) | Su API admite el formato Responses que ya invoca Tekton. Publica una ventana de contexto de 1M tokens y soporte para razonamiento, herramientas y salida estructurada según la documentación. | API de bajo costo pero no se debe asumir gratis: tarifa publicada por millón de tokens varía entre horas pico y valle. | La integración parece de menor fricción porque usa el mismo formato de API; todavía hay que validar parámetros, errores, privacidad y resultados reales en pruebas sintéticas. |
| **Mistral Small 4** (`mistral-small-2603`) | Modelo híbrido de instrucciones, razonamiento y código, con contexto publicado de 256K tokens. | Mistral ofrece modo Free con límites; su disponibilidad concreta y cuota para este modelo deben confirmarse en la cuenta antes de contar con él como opción gratuita. El precio publicado de pago por uso es bajo. | La ficha consultada destaca Chat Completions, no confirma compatibilidad completa con la ruta Responses utilizada por Tekton; puede necesitar un adaptador o ajuste específico que deberá probarse en una rama aislada. |
| **Groq actual como referencia** (`openai/gpt-oss-20b`) | El código de `tekton-bot/main` invoca Responses API con esfuerzo de razonamiento `medium`. Groq publica soporte del modelo para razonamiento, código, herramientas y salidas estructuradas. | Es la línea base de costo bajo; tarifa y cuotas pueden cambiar y deben verificarse antes de estimar gasto. | No se da por descartado hasta que un benchmark sintético demuestre una mejora suficiente de calidad, confiabilidad o costo total. |

Fuentes oficiales consultadas para preparar este shortlist: [DeepSeek Models & Pricing](https://api-docs.deepseek.com/quick_start/pricing/?push_animated=1&show_loading=0&theme=light&webview_progress_bar=1), [DeepSeek Responses API](https://api-docs.deepseek.com/guides/responses_api/), [Mistral Small 4](https://docs.mistral.ai/models/mistral-small-4-0-26-03), [Mistral Free mode y límites](https://docs.mistral.ai/getting-started/quickstarts/studio/activate-and-generate-api-key), [Groq modelos soportados](https://console.groq.com/docs/models).

Esta lista es una **hipótesis de evaluación, no una selección de modelo ni autorización de cambio**. Los precios, modelos disponibles y cuotas deberán revalidarse en el momento de la prueba.

## 9. Adaptador común como objetivo de arquitectura

El objetivo es que cada investigador invoque una interfaz estable y que el adaptador traduzca la solicitud al proveedor o runtime seleccionado. La identidad y el prompt del investigador deben permanecer fuera del adaptador específico del proveedor.

La interfaz debe separar al menos:

- solicitud de inferencia;
- configuración de modelo aprobada;
- respuesta y metadatos de procedencia;
- error clasificado (cuota, indisponibilidad, formato, autenticación, límite de contexto);
- persistencia de intervención, que corresponde al Core y no al adaptador del modelo.

La primera entrega debe ser documental y de pruebas unitarias/sintéticas. No se refactorizan los tres bots en el mismo cambio. Cada adaptación futura tendrá su rama, CI, comparación de comportamiento y revisión humana independiente.

## 10. Prioridad operativa actual y migración local futura

### Fase actual: servicios en la nube

Arkhé seguirá usando los servicios en la nube ya conectados: la integración OpenAI-compatible de Atlas y Google Gemini para Aletheia se mantienen; Tekton permanece en Groq mientras evaluamos alternativas. La selección futura de un modelo diferente para Tekton requiere benchmark sintético, revisión de privacidad y aprobación explícita de Ángel.

Antes de una aprobación:
- no cambiar variables, credenciales, servicios o configuración activa;
- no enviar contenido privado de Arkhé a un candidato no aprobado;
- no habilitar gasto sin límite definido y aprobación humana;
- no crear ni ejecutar convocatorias reales para probar modelos;
- verificar proveedor, almacenamiento, retención, uso para entrenamiento y región de procesamiento a partir de documentación vigente.

### Fase futura: infraestructura local

La ejecución local es una meta futura, no un requisito de la política v0.1 ni una tarea inmediata. Se abordará cuando exista hardware/infraestructura suficiente para el nivel de calidad y disponibilidad que requiera Arkhé.

Cuando llegue esa fase:
1. inventariar los datos y memoria que necesita cada investigador;
2. definir requisitos mínimos de privacidad, capacidad, fiabilidad y costo de operación;
3. colocar el runtime local detrás del mismo adaptador de inferencia;
4. evaluar un modelo local con casos sintéticos frente a la línea base en la nube;
5. documentar las herramientas que seguirán siendo remotas: un modelo local no vuelve locales GitHub, Discord, MCP remotos ni APIs;
6. obtener aprobación de Ángel antes de migrar, redirigir datos o cambiar servicios.

El objetivo es que la transición futura a un servidor local no cambie la identidad de los investigadores ni sus permisos. El teléfono con recursos limitados puede servir para experimentación, pero no se considera infraestructura de producción.
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
7. Presentar a Ángel el informe de benchmark y la propuesta de proveedor/modelo/costo antes de elegir el sustituto de Groq para Tekton.
8. Sólo después de aprobación explícita, implementar una primera integración aislada en una rama, comenzando por Tekton y sin tocar `main` ni producción.
9. Mantener el trabajo local fuera del alcance inmediato; reconsiderarlo cuando exista infraestructura apropiada.

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
