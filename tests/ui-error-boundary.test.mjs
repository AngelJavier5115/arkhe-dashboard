import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const entry = fs.readFileSync(new URL('../src/main.jsx', import.meta.url), 'utf8');

test('React render failures show a diagnostic recovery surface instead of a blank screen', () => {
  assert.match(entry, /class AppRenderErrorBoundary extends React\.Component/);
  assert.match(entry, /static getDerivedStateFromError\(error\)/);
  assert.match(entry, /componentDidCatch\(error\)/);
  assert.match(entry, /role="alert"/);
  assert.match(entry, /No se pudo mostrar esta pantalla/);
  assert.match(entry, /No repitas operaciones de Gobierno humano/);
  assert.match(entry, /window\.location\.reload\(\)/);
  assert.doesNotMatch(entry, /document\.cookie|localStorage|sessionStorage/);
});
