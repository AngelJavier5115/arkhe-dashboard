# ARKHÉ — AUDITORÍA DE REANUDACIÓN TÉCNICA

**Fecha:** 2026-10-06
**Referencia:** Spawnpoint de Metodología Arkhé + estado actual de GitHub/Supabase/Vercel/Render
**Estado:** AUDITORÍA INICIAL COMPLETADA

## 1. Estado de infraestructura

### GitHub
- Repositorios disponibles: arkhe-dashboard, atlas-bot, Aletheia-bot y tekton-bot.
- arkhe-dashboard tiene un commit posterior al inicio de Semilla 01 y Vercel despliega actualmente ese estado.
- atlas-bot evolucionó después del checkpoint de rondas: el main actual está 5 commits por delante del checkpoint de 2026-09-01.

### Vercel
- Proyecto arkhe-dashboard existe y su último deployment de producción está READY.
- El Dashboard actual sigue siendo una interfaz principalmente de visualización del grafo y feed de nodos.
- App.jsx contiene una indicación fija de «Nodo Aletheia: Online», que debe auditarse porque ya no representa necesariamente el estado operativo real.

### Render
- El workspace confirmado es My Workspace.
- Existen tres servicios: atlas-bot, aletheia-bot y tekton-bot.
- Los tres están actualmente configurados como servicios Node y no están suspendidos.
- Los repositorios de los bots siguen preservados aunque sus aplicaciones de modelo originales puedan estar retiradas temporalmente.

### Supabase
- Proyecto arkhe-core está ACTIVE_HEALTHY.
- PostgreSQL 17.6.1.
- Migraciones registradas:
  - 20260830220422 create_investigacion_evaluaciones_v2
  - 20260831231940 add_arkhe_rounds_and_interventions
- Datos actuales: 4 investigadores, 1 investigación, 23 nodos, 4 participaciones, 3 rondas, 3 intervenciones y 2 evaluaciones.

## 2. Estado del experimento del spawnpoint

El spawnpoint conserva la prueba original y no debe modificarse retrospectivamente.

La evidencia actual mantiene:
- 3 rondas existentes;
- 3 intervenciones;
- réplica dirigida de Tekton vinculada a la intervención de Aletheia;
- ausencia de una ronda automática posterior.

Hallazgo: las tres rondas históricas consultadas aparecen todavía con estado ABIERTA. Esto no invalida la prueba original, pero muestra que falta una operación explícita de cierre humano en el estado persistido.

## 3. Hallazgo principal sobre rondas

La metodología conceptual ya está más centralizada en Ángel que la implementación actual.

Atlas y Aletheia poseen sus propios adaptadores de ronda.
Tekton conserva la lógica de réplica dirigida dentro de su index.js.

Esto produce una fragmentación:

Ángel -> bot específico -> lógica propia de ronda -> Supabase

pero el diseño objetivo debe ser:

Ángel -> Arkhé Core de rondas -> investigadores/cuerpos -> Supabase

### Consecuencia

No conviene seguir agregando comandos específicos de ronda a cada bot antes de diseñar el Core central.

## 4. Diferencia entre consulta y debate

El sistema actual puede representar una perspectiva individual y una réplica dirigida.

El flujo deseado necesita una abstracción más general:

Una ronda puede contener varios participantes.
Una intervención puede ser el foco de un debate.
Ángel puede seleccionar uno o varios investigadores como destinatarios de respuesta.
El debate puede continuar varias veces.
Ángel puede cambiar el foco.
Ángel puede terminar el debate.

Por tanto, «destinatario_id» por sí solo no debe convertirse en el modelo completo de gobierno de una ronda.

El Core deberá poder expresar participantes, foco, fase, intervención objetivo y convocatorias humanas.

## 5. Numeración y concurrencia

Atlas actualmente calcula el siguiente número consultando únicamente las rondas abiertas dirigidas a Atlas.

Aletheia usa una lógica diferente y consulta el máximo de todas las rondas de la investigación.

Tekton también consulta una numeración global, pero su lógica está integrada directamente en index.js.

Esto es una inconsistencia técnica.

El Core futuro debe tener una única política de numeración y una estrategia segura ante concurrencia.

## 6. Seguridad — RLS

Supabase reporta RLS DESHABILITADO en las 13 tablas públicas del sistema.

Esto significa que las tablas están expuestas mediante los roles usados por Supabase/PostgREST y pueden ser leídas o modificadas por quien disponga de la clave pública correspondiente, según los permisos efectivos.

No se debe activar RLS sin definir políticas porque eso puede bloquear el acceso legítimo del Dashboard y los bots.

Pendiente prioritario antes de considerar el sistema preparado para exposición pública.

## 7. Sentry

Sentry es adecuado como candidato de observabilidad/diagnóstico.

La documentación actual permite consultar trazas con spans y errores y dispone de capacidades específicas para observabilidad de conversaciones y agentes.

Para Arkhé se recomienda comenzar con metadatos operativos y errores, evitando registrar automáticamente contenido privado completo.

El acceso práctico de la skill instalada requiere SENTRY_AUTH_TOKEN configurado localmente y con permisos de lectura.

## 8. n8n

n8n permanece como futura capa de automatización cotidiana.

No debe gobernar las rondas epistemológicas.

Su espacio natural es automatizar operaciones de vida/proyecto como tareas, recordatorios, entradas, correo, seguimiento y conexiones con canales.

## 9. Decisión de arquitectura para la siguiente etapa

Antes de modificar masivamente los bots:

1. Diseñar Arkhé Core de rondas.
2. Definir contrato de entrada y salida de un investigador.
3. Definir máquina de estados de la ronda.
4. Definir convocatorias humanas.
5. Definir cómo una intervención se convierte en foco de debate.
6. Definir destinatarios múltiples.
7. Definir continuación y cierre.
8. Después adaptar los tres cuerpos.

## 10. Invariante nueva de gobierno

> La ronda pertenece a Arkhé y es gobernada por Ángel; ningún bot puede considerarse dueño de la ronda.

El investigador conserva independencia de razonamiento.
El bot conserva autonomía técnica de ejecución dentro del contrato.
Pero ningún investigador IA abre o prolonga unilateralmente el ciclo epistemológico.

## 11. Próximo experimento

Construir una ronda piloto nueva, separada de AR-001 si es conveniente, con este flujo:

Ángel convoca Atlas + Aletheia + Tekton
-> tres perspectivas independientes
-> Ángel selecciona una intervención como foco
-> Ángel convoca Aletheia + Tekton para responder al foco
-> Ángel decide continuar
-> Ángel puede volver a convocar Atlas, Aletheia o Tekton
-> Ángel cierra
-> se registra conclusión/decisión humana

Objetivo de la prueba: demostrar que el Core puede gobernar el debate sin que ningún investigador o bot tome control automático de la ronda.