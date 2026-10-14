# Arkhé UI Guard v0.1 — Playwright

**Estado:** propuesta técnica en rama de calidad; no autoriza cambios a `main` ni pruebas contra servicios reales.

## Objetivo

Detectar en CI errores de renderizado y navegación móvil en el Dashboard, empezando por el flujo sintético de Gobierno humano/preflight que recientemente mostró un `ReferenceError` al renderizar fechas de rondas.

## Diseño

- Playwright Test ejecuta Chromium con viewport móvil de 390×844.
- Las consultas Supabase REST se responden con arrays sintéticos vacíos.
- La API de autenticación y el preflight se simulan dentro del navegador.
- El mock devuelve una ronda sintética abierta para ejercitar el renderizado de fecha y la advertencia de ronda activa.
- El test verifica que no se invoque `/api/arkhe-core`; por tanto, no se crea ninguna ronda, convocatoria ni despacho.
- Una prueba de rechazo del preflight confirma que la UI muestra el error sin intentar operaciones mutables.
- Capturas/trazas se conservan sólo ante fallo y se publican como artefacto de CI por siete días. Los datos del test son sintéticos; no usar cookies, credenciales o bases de datos reales.

## Ejecutar localmente

Con Node.js 24, desde la raíz del repo:

```sh
npm install --no-audit --no-fund
npx playwright install chromium
VITE_SUPABASE_URL=https://arkhe-playwright-synthetic.supabase.co VITE_SUPABASE_KEY=synthetic-public-key-for-browser-tests-only npm run build
npm test
npx playwright test
```

El servidor de Vite Preview se inicia automáticamente por `playwright.config.js`. Los tests interceptan las llamadas de APIs; no hay necesidad de configurar Supabase real.

## Límites

Esta primera versión no certifica A.4/WebAuthn en navegador real ni la API desplegada; simula respuestas HTTP para comprobar el comportamiento del frontend. No debe intentar usar claves, hacer login real, invocar motores de IA, despachar investigadores o tocar producción.

El siguiente escalón, después de que estas pruebas pasen en CI, será añadir tests de regresión dirigidos a casos concretos del panel y a expiración/invalidez del preflight. Una prueba contra el Preview desplegado requerirá una compuerta separada, sin acciones de escritura ni secretos de producción.
