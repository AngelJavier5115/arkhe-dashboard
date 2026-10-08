# Procedencia de modelos y proveedores — A2

## Objetivo

Distinguir tres niveles de evidencia para evitar llamar "proveniencia independiente" a una simple declaración del servicio.

### Nivel A — provider-response-attested

El investigador ejecutor recibe una respuesta del proveedor y registra:

- modelo/versión observada;
- identificador de respuesta;
- datos adicionales de routing cuando existan.

El investigador firma estos datos al enviarlos al Core.

Esto prueba que **el propio ejecutor reportó datos observados en la respuesta del proveedor y que esos datos no fueron alterados durante el transporte**.

No prueba que el ejecutor no haya falsificado esos datos antes de firmarlos.

### Nivel B — provider-side independently inspectable

Existe un registro del proveedor que un segundo proceso/operador puede consultar y comparar con la intervención persistida.

Esto ya no depende únicamente de lo que el ejecutor afirma.

### Nivel C — cryptographic provider attestation

El proveedor entrega una evidencia criptográficamente verificable que liga respuesta, modelo/proveedor y petición de forma verificable fuera del ejecutor.

Este nivel sería el más fuerte, pero no es requisito de A2 para declarar la implementación básica de la frontera.

## Estado actual por proveedor

| Ruta | Evidencia capturada en el bot | Fuente externa disponible | Estado |
|---|---|---|---|
| Atlas → OpenRouter | `respuesta.model`, `respuesta.id`, `openrouter_metadata` cuando se solicita | OpenRouter ofrece routing metadata y una capa de observabilidad que puede exponer modelo y proveedor usados | A + candidato a B |
| Atlas → OpenAI directo | `respuesta.model`, `respuesta.id` y `_request_id` cuando el SDK lo expone | OpenAI documenta `x-request-id` y permite `X-Client-Request-Id`; este último queda registrado por OpenAI para endpoints compatibles | A + evidencia provider-side consultable por soporte |
| Aletheia → Google Gemini | `modelVersion` y `responseId` | Google AI Studio puede registrar las llamadas de GenerateContent y mostrar la petición/respuesta; actualmente requiere el nivel pagado para estos logs | A + candidato a B |
| Tekton → Groq | `respuesta.model` y `respuesta.id` | Groq documenta estos campos; sus logs de inferencia normales no constituyen por sí mismos una consulta histórica pública comparable a un log independiente de Arkhé | A |

## Consecuencia metodológica

En esta fase Arkhé debe registrar como:

`provider-response-attested`

lo que el proveedor devolvió al ejecutor.

No debe registrarse como:

`provider-verified`

hasta que exista una fuente provider-side independiente que pueda correlacionarse con la intervención concreta.

Tampoco debe registrarse como:

`cryptographically-provider-attested`

salvo que aparezca una firma o mecanismo equivalente del proveedor.

## Próxima mejora racional

La mejor mejora inmediata es añadir una identidad de correlación de Arkhé a cada llamada al proveedor y conservarla junto al ID que devuelve el proveedor.

Para OpenRouter, además, puede activarse `X-OpenRouter-Metadata: enabled` para conservar datos de routing. Atlas ahora envía `trace.trace_id = convocatoriaId`, además de `trace_name` y `generation_name`, de forma que una futura plataforma de observabilidad externa pueda correlacionar la generación con una convocatoria concreta. OpenRouter documenta que `trace_id` sirve para agrupar solicitudes en los destinos de observabilidad.

Para OpenAI directo conviene conservar el `x-request-id` entregado por OpenAI; para Gemini, `responseId`; para Groq, `id`.

## Fuentes técnicas consultadas

- OpenAI API Reference — request IDs: https://platform.openai.com/docs/api-reference/backward-compatibility
- OpenAI Webhooks — response.completed: https://platform.openai.com/docs/api-reference/webhook-events
- OpenRouter — Chat Completions y routing metadata: https://openrouter.ai/docs/api/api-reference/chat/send-chat-completion-request
- OpenRouter — observabilidad/broadcast: https://openrouter.ai/docs/guides/features/broadcast/overview
- Google Gemini — Generate Content: https://ai.google.dev/api/generate-content
- Google AI Studio — Logs and datasets: https://ai.google.dev/gemini-api/docs/logs-datasets
- Groq — API Reference: https://console.groq.com/docs/api-reference
- Groq — Responses API: https://console.groq.com/docs/responses-api
