# ARKHÉ — ESPECIFICACIÓN INICIAL DEL CORE DE RONDAS

**Versión:** 0.1
**Fecha:** 2026-10-06
**Estado:** PROPUESTA TÉCNICA PARA IMPLEMENTACIÓN

## 1. Propósito

Arkhé Core de Rondas será la capa que gobierna el ciclo de una ronda de investigación.

Su objetivo es separar el gobierno metodológico de los cuerpos de los investigadores.

El Core no es Atlas.
El Core no es un bot de Discord.
El Core no es un modelo de IA.
El Core pertenece a Arkhé.

## 2. Gobierno humano

Ángel es el controlador de la ronda.

Solo Ángel puede:
- iniciar una ronda;
- seleccionar participantes;
- abrir un debate;
- seleccionar la intervención que será foco;
- seleccionar uno o varios investigadores destinatarios;
- solicitar una nueva intervención;
- cambiar el foco;
- continuar una discusión;
- pausar una ronda;
- cerrar o cancelar una ronda;
- registrar una conclusión o decisión humana.

Las IAs no pueden ejecutar por iniciativa propia ninguna de esas operaciones metodológicas.

## 3. Independencia de investigadores

Cada investigador recibe una convocatoria independiente.

El investigador puede:
- razonar;
- estar de acuerdo;
- discrepar;
- detectar inconsistencias;
- declarar incertidumbre;
- señalar información faltante;
- proponer hipótesis;
- cuestionar intervenciones anteriores;
- corregir una posición propia.

El investigador no puede:
- abrir otra ronda por su cuenta;
- convocar automáticamente a otro investigador;
- cerrar la ronda;
- convertir una respuesta en verdad consolidada;
- modificar directamente el estado colectivo.

## 4. Modelo de una ronda

Una ronda debe poder contener:
- identificador;
- investigación asociada;
- controlador humano;
- estado;
- tipo;
- número;
- participantes convocados;
- foco actual opcional;
- ronda padre opcional;
- intervención objetivo opcional;
- contexto;
- conclusión opcional;
- decisión opcional;
- timestamps.

Estados mínimos:
- abierta;
- pausada;
- cerrada;
- cancelada.

## 5. Fases funcionales

### Consulta
Ángel convoca a uno, varios o todos los investigadores.

Cada investigador responde independientemente.

### Debate
Ángel selecciona una intervención como foco.

Ángel puede convocar a uno o varios investigadores para responder a ese foco.

Una respuesta debe conservar:
- ronda en la que participa;
- investigador que la produce;
- intervención a la que responde, cuando exista;
- convocatoria humana que la originó.

### Continuación
Ángel decide si el debate continúa.

Puede mantener el foco, cambiarlo, incorporar investigadores o solicitar aclaraciones.

### Cierre
Ángel finaliza la ronda.

El cierre puede registrar una conclusión provisional, una decisión, preguntas abiertas y evidencia pendiente.

## 6. Foco de debate

Una intervención puede convertirse en foco de debate sin cambiar su autoría ni su contenido.

El foco debe ser identificable por UUID.

Los investigadores que respondan deben quedar vinculados mediante responde_a_intervencion_id.

Esto permite expresar:

Intervención Atlas
-> respuesta Aletheia
-> respuesta Tekton

o:

Intervención Aletheia
-> respuesta Atlas
-> respuesta Tekton

o cualquier otra combinación convocada por Ángel.

## 7. Participantes y destinatarios

La ronda debe distinguir:

- quién controla la ronda;
- quiénes están invitados a participar;
- quiénes ya intervinieron;
- quiénes son destinatarios de la convocatoria actual.

Una ronda no debe depender de un único destinatario permanente.

Por ello, destinatario_id puede conservarse como compatibilidad histórica, pero el Core debe soportar convocatorias múltiples.

## 8. No automatización epistemológica

El Core jamás debe crear automáticamente una nueva ronda por el simple hecho de recibir una intervención.

El siguiente paso metodológico siempre debe tener una causa humana explícita.

Eventos técnicos automáticos sí pueden existir para:
- registro;
- validación;
- observabilidad;
- reintentos técnicos seguros;
- almacenamiento;
- recuperación.

Estos eventos no deben convertirse en continuación epistemológica.

## 9. Contrato del cuerpo del investigador

El cuerpo del investigador recibe una convocatoria estructurada.

Entrada conceptual:

{
  ronda_id,
  investigador_id,
  pregunta,
  contexto,
  tipo_convocatoria,
  foco_intervencion_id,
  intervenciones_relevantes,
  instrucciones_humanas
}

Salida conceptual:

{
  investigador_id,
  ronda_id,
  tipo,
  posicion,
  contenido,
  incertidumbres,
  preguntas_abiertas,
  responde_a_intervencion_id,
  metadata_motor
}

El cuerpo no decide el siguiente estado de la ronda.

## 10. Identidad y motores

El Core debe tratar como capas diferentes:

IDENTIDAD
-> investigador_id + memoria + contrato + función

MOTOR
-> proveedor + modelo + configuración

CUERPO
-> Discord u otro canal

Las sustituciones del motor no deben cambiar automáticamente la identidad.

## 11. Compatibilidad con infraestructura actual

Supabase ya dispone de:
- rondas_investigacion;
- intervenciones_ronda;
- ronda_padre_id;
- responde_a_intervencion_id;
- investigador_id;
- iniciada_por;
- destinatario_id;
- contexto;
- conclusion;
- decision.

Estos campos permiten reutilizar gran parte de la estructura actual.

Antes de agregar nuevas columnas debemos verificar si una representación con la estructura existente + una nueva capa de convocatorias resulta suficiente.

## 12. Primera implementación propuesta

Crear un módulo central de dominio de rondas con operaciones conceptuales:

- iniciarRonda
- convocarInvestigadores
- registrarPerspectiva
- abrirDebate
- convocarRespuestas
- continuarRonda
- pausarRonda
- cerrarRonda
- cancelarRonda
- registrarCierreHumano

Los bots de Discord deberán convertirse progresivamente en adaptadores de transporte.

## 13. Primera prueba

Escenario:

1. Ángel inicia una ronda con Atlas, Aletheia y Tekton.
2. Los tres producen una perspectiva independiente.
3. Ángel selecciona la intervención de Atlas.
4. Ángel abre debate sobre esa intervención.
5. Ángel convoca a Aletheia y Tekton.
6. Ambos responden específicamente al foco.
7. Ángel decide continuar.
8. Ángel puede convocar también a Atlas o cambiar el foco.
9. Ángel vuelve a decidir.
10. Ángel cierra.
11. El sistema registra el cierre humano.

Después repetir iniciando el debate desde una intervención de Aletheia y desde una de Tekton.

## 14. Invariantes de la prueba

- Ángel continúa siendo el controlador.
- ningún bot inicia otra ronda automáticamente;
- ninguna IA modifica directamente el estado colectivo;
- cada intervención conserva autoría;
- cada respuesta conserva ronda;
- cada réplica dirigida conserva intervención objetivo;
- pueden existir múltiples destinatarios;
- el debate puede continuar explícitamente;
- Ángel puede finalizarlo;
- la conclusión humana queda separada de las perspectivas IA;
- la numeración es consistente.

## 15. Pendientes antes de implementar

- decidir si el Core vivirá en arkhe-dashboard, en un servicio independiente o en otro repositorio;
- definir autorización para asegurar que solo Ángel pueda gobernar rondas;
- resolver RLS de Supabase;
- resolver la política de numeración/concurrencia;
- decidir cómo registrar convocatorias múltiples sin sobrecargar el esquema;
- revisar compatibilidad con los adapters existentes;
- definir observabilidad segura con Sentry.

## 16. Regla de esta especificación

> Primero centralizar el contrato; después adaptar los cuerpos.

Esta especificación no modifica todavía el esquema ni los bots. Es la base para la siguiente implementación técnica.