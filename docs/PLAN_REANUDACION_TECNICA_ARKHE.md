# ARKHÉ — PLAN DE REANUDACIÓN TÉCNICA

**Fecha:** 2026-10-06
**Estado:** VIGENTE
**Punto de referencia:** Spawnpoint + estado actual posterior al spawnpoint

## 1. Principio de gobierno de rondas

Ángel es el conductor y autoridad operativa de las rondas.

Los investigadores IA no gobiernan una ronda entre sí ni la continúan por iniciativa propia.

Ángel decide:
- cuándo inicia una ronda;
- qué investigadores participan;
- cuándo comienza un debate;
- qué investigador es el punto de partida del debate;
- qué investigador responde a qué intervención;
- cuándo continúa el debate;
- cuándo termina una ronda;
- cuándo se registra una conclusión o decisión humana.

La autonomía de los investigadores significa independencia de razonamiento, no autonomía para prolongar el ciclo epistemológico.

## 2. Flujo objetivo de rondas

### Fase A — Consulta inicial

Ángel plantea una pregunta y puede solicitarla a uno, varios o los tres investigadores.

Ejemplo conceptual:

Ángel -> Atlas
Ángel -> Aletheia
Ángel -> Tekton

Las respuestas son independientes.
No se responden entre ellos automáticamente.

### Fase B — Debate dirigido

Ángel puede elegir cualquier intervención como punto de partida del debate.

Ejemplo:

1. Los tres aportan perspectivas.
2. Ángel selecciona la intervención de Atlas.
3. Ángel abre un debate sobre esa intervención.
4. Ángel indica que Aletheia y Tekton respondan.
5. Se registran sus intervenciones como respuestas dirigidas.
6. Ángel decide si abrir otra ronda/debate, cambiar de investigador o cerrar.

El mismo patrón debe poder iniciarse desde una intervención de Aletheia o Tekton.

### Fase C — Continuación

Ángel puede ordenar:
- continuar debate;
- solicitar nueva réplica;
- incorporar otro investigador;
- cambiar el foco;
- pedir aclaración;
- terminar.

No existe continuación automática.

### Fase D — Cierre

Ángel puede cerrar la ronda.

El cierre humano puede registrar:
- conclusión provisional;
- decisión;
- evidencia pendiente;
- preguntas abiertas.

El sistema no convierte el consenso de las IA en verdad.

## 3. Arquitectura objetivo

Arkhé Core debe separar:

- identidad del investigador;
- motor/modelo;
- cuerpo/canal;
- memoria;
- gobierno de rondas.

Regla:

> Investigador ≠ modelo ≠ canal ≠ ronda.

Los bots de Discord son cuerpos/canales operativos de los investigadores.

El motor puede cambiar sin alterar automáticamente la identidad.

## 4. Prioridades técnicas

### Etapa 1 — Auditoría post-spawnpoint
Comparar el spawnpoint con el estado actual y separar:
- validado;
- experimental;
- implementado posteriormente;
- superado;
- pendiente.

No modificar retrospectivamente el spawnpoint.

### Etapa 2 — Auditoría de Supabase
Revisar:
- investigadores;
- participaciones;
- investigaciones;
- rondas;
- intervenciones;
- evaluaciones;
- relaciones;
- RLS;
- integridad de referencias;
- numeración y concurrencia.

### Etapa 3 — Auditoría de bots
Revisar Atlas, Aletheia y Tekton para detectar:
- lógica duplicada;
- dependencia del canal;
- dependencia del proveedor;
- permisos implícitos;
- falta de validaciones;
- incompatibilidades con el flujo objetivo.

### Etapa 4 — Arkhé Core de rondas
Diseñar una capa central que permita:
- iniciar ronda;
- seleccionar participantes;
- registrar perspectivas;
- abrir debate desde cualquier intervención;
- dirigir respuestas a uno o varios investigadores;
- continuar;
- pausar;
- cerrar;
- mantener trazabilidad;
- impedir continuación automática.

Los bots deben actuar como adaptadores/cuerpos, no como dueños de la metodología.

### Etapa 5 — Reintegración de bots
Adaptar Atlas, Aletheia y Tekton al Core sin eliminar sus identidades ni especialidades.

Objetivo:
- mismo contrato de transporte;
- independencia de razonamiento;
- herramientas propias;
- memoria compartida controlada;
- gobierno humano único.

### Etapa 6 — Prueba controlada
Repetir una prueba comparable al spawnpoint y después ampliar:

perspectivas independientes
-> debate desde Atlas
-> respuestas de Aletheia/Tekton
-> continuación humana
-> cierre humano

Y repetir iniciando desde Aletheia y desde Tekton.

### Etapa 7 — Dashboard
Evolucionar el Dashboard para que Ángel pueda visualizar y dirigir:
- rondas;
- participantes;
- intervenciones;
- relaciones;
- estado;
- apertura/cierre;
- foco del debate.

### Etapa 8 — Sentry
Evaluar Sentry como sistema de diagnóstico.

Primera etapa de observabilidad:
- errores;
- excepciones;
- latencia;
- proveedor/modelo;
- investigador;
- ronda;
- intervención;
- herramienta;
- estado de ejecución.

No registrar automáticamente el contenido privado completo de las conversaciones sin necesidad explícita.

### Etapa 9 — n8n
Adoptar n8n como capa de automatización cotidiana de Ángel/Arkhé.

Prioridad:
- tareas;
- recordatorios;
- correo;
- seguimiento;
- flujos diarios;
- conexión con Discord;
- futuras conexiones con WhatsApp y otras entradas.

La automatización cotidiana no debe asumir control sobre el ciclo epistemológico de las rondas.

## 5. Infraestructura conocida

- GitHub: memoria documental y código.
- Supabase arkhe-core: memoria estructurada y datos compartidos.
- Discord: cuerpos/canales de los investigadores.
- Vercel: Dashboard.
- Render My Workspace: servicios de Arkhé.
- Sentry: candidato para diagnóstico/observabilidad.
- n8n: futura capa de automatización cotidiana.

## 6. Reglas de seguridad para la reanudación

1. No modificar el spawnpoint retrospectivamente.
2. No hacer cambios estructurales sin saber qué archivo/servicio afecta.
3. Antes de un cambio importante responder: qué cambia; por qué cambia; qué principio protege; cómo se comprobará que no rompimos lo anterior.
4. No generar bucles automáticos entre investigadores.
5. No convertir consenso en verdad.
6. No mezclar memoria de proyecto con conversación incidental.
7. No asumir que un proveedor o modelo define una identidad.
8. Preservar rollback/traceabilidad en cambios importantes.

## 7. Orden de reanudación

**Ahora -> Auditoría post-spawnpoint -> Supabase -> Bots -> Core de rondas -> Prueba -> Dashboard -> Sentry -> n8n**

Este documento es un plan de trabajo y puede evolucionar. No reemplaza el Archivo Maestro, la Memoria de Rumbo ni el Spawnpoint.