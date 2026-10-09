import test from 'node:test';
import assert from 'node:assert/strict';
import { requireSameOrigin } from '../api/human-auth-config.js';

test('A4: cookie-authenticated mutation requires the configured origin', () => {
  const previousOrigin = process.env.ARKHE_AUTH_ORIGIN;
  const previousRpId = process.env.ARKHE_AUTH_RP_ID;
  process.env.ARKHE_AUTH_ORIGIN = 'https://arkhe.example';
  process.env.ARKHE_AUTH_RP_ID = 'arkhe.example';

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
    if (previousOrigin === undefined) delete process.env.ARKHE_AUTH_ORIGIN;
    else process.env.ARKHE_AUTH_ORIGIN = previousOrigin;

    if (previousRpId === undefined) delete process.env.ARKHE_AUTH_RP_ID;
    else process.env.ARKHE_AUTH_RP_ID = previousRpId;
  }
});
