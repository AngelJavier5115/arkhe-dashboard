import test from 'node:test';
import assert from 'node:assert/strict';
import { requireSameOrigin } from '../api/human-auth-config.js';

test('A4: cookie-authenticated mutation requires the configured origin', () => {
  const previous = process.env.ARKHE_AUTH_ORIGIN;
  process.env.ARKHE_AUTH_ORIGIN = 'https://arkhe.example';

  try {
    assert.doesNotThrow(() =>
      requireSameOrigin({ headers: { origin: 'https://arkhe.example' } })
    );

    assert.throws(
      () => requireSameOrigin({ headers: { origin: undefined } }),
      error => error?.status === 403
    );

    assert.throws(
      () => requireSameOrigin({ headers: { origin: 'https://evil.example' } }),
      error => error?.status === 403
    );
  } finally {
    if (previous === undefined) delete process.env.ARKHE_AUTH_ORIGIN;
    else process.env.ARKHE_AUTH_ORIGIN = previous;
  }
});
