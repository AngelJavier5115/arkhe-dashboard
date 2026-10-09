import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app = fs.readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');

test('node inspector uses one bounded scroll container for mobile content', () => {
  assert.match(app, /max-h-\[92dvh\]/);
  assert.match(app, /overflow-y-auto overscroll-contain touch-pan-y/);
  assert.doesNotMatch(app, /max-h-\[52vh\] overflow-y-auto/);
});

test('opening the node inspector locks background page scrolling and restores position', () => {
  assert.match(app, /body\.style\.position = 'fixed'/);
  assert.match(app, /root\.style\.overflow = 'hidden'/);
  assert.match(app, /window\.scrollTo\(0, scrollY\)/);
  assert.match(app, /event\.key === 'Escape'/);
});
