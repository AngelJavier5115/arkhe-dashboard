# Registro de Fuentes Arkhé — propuesta arquitectónica

## Estado

**PROPUESTA FUTURA — NO IMPLEMENTAR COMO FEATURE DURANTE A2.**

## Origen de la idea

El repositorio comunitario `public-apis/public-apis` funciona como un catálogo de APIs y exige una estructura uniforme para describir autenticación, HTTPS, CORS y otros datos. También mantiene validadores de formato y enlaces para revisar cambios.

Arkhé puede tomar esa idea, pero con un objetivo epistemológico distinto: **descubrir fuentes no equivale a declararlas confiables**.

## Principio

Public APIs puede servir como capa de **descubrimiento**.

Arkhé necesita su propia capa de **evaluación, verificación y activación**.

Flujo propuesto:

`descubierta → evaluada → verificada → activa → revisada periódicamente`

## Registro propuesto

Campos mínimos:

- `fuente_id`
- `nombre`
- `tipo`
- `dominio`
- `url_documentacion`
- `url_api`
- `auth`
- `gratuita_o_free_tier`
- `licencia`
- `limites`
- `version`
- `ultimo_chequeo`
- `estado`
- `especialidad`
- `nivel_evidencia`
- `notas`

## Papel de los investigadores

**Ángel — gobierno:** decide qué fuentes entran y qué riesgos acepta.

**Atlas — descubrimiento y análisis:** encuentra fuentes candidatas y propone cuáles parecen adecuadas para una pregunta.

**Aletheia — contraste:** busca contradicciones, cambios, calidad, dependencia, sesgos, licencias y debilidades de la fuente.

**Tekton — integración:** convierte fuentes aprobadas en adaptadores técnicos, manteniendo desacoplada la lógica del Core.

## Futuro con IA local

Cuando cada investigador disponga de un motor local propio, el registro podrá exponer los metadatos de las fuentes como herramientas de selección.

La IA no debería recibir la regla:

> “elige la mejor API”.

Debería recibir un conjunto de criterios y restricciones:

- objetivo de la investigación;
- tipo de evidencia buscada;
- cobertura;
- actualidad;
- coste;
- privacidad;
- estabilidad;
- licencia;
- reproducibilidad;
- compatibilidad técnica.

Entonces puede producir:

`candidata + razones + incertidumbres`

y la selección final puede permanecer bajo el gobierno de Arkhé.

Esto evita convertir un ranking automático en una autoridad oculta.

## Regla epistemológica

**Fuente disponible ≠ fuente confiable.**

**Fuente confiable ≠ fuente apropiada para toda pregunta.**

La elección debe conservar el motivo y las limitaciones que llevaron a utilizar una fuente.

## Relación con A2

Este registro no debe bloquear ni retrasar el cierre de A2.

Se conserva como rama arquitectónica futura porque la selección de herramientas y fuentes será especialmente valiosa cuando existan motores locales por investigador.

## Próxima etapa futura

Construir una tabla `fuentes` en Arkhé Core y un sistema de adaptadores con contratos uniformes:

`SourceAdapter.search()`

`SourceAdapter.fetch()`

`SourceAdapter.metadata()`

`SourceAdapter.health()`

La salud de una fuente y su nivel de evidencia deben ser independientes de la autorización criptográfica del investigador.
