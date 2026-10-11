import test from 'node:test';
import assert from 'node:assert/strict';
import { isBootstrapAllowed } from '../api/human-auth-config.js';

test('A4: bootstrap requires an unexpired explicit window', () => {
  const previousSecret = process.env.ARKHE_AUTH_BOOTSTRAP_SECRET;
  const previousExpiry = process.env.ARKHE_AUTH_BOOTSTRAP_EXPIRES_AT;

  try {
    process.env.ARKHE_AUTH_BOOTSTRAP_SECRET = 'test-bootstrap';
    process.env.ARKHE_AUTH_BOOTSTRAP_EXPIRES_AT = new Date(Date.now() + 60_000).toISOString();

    assert.equal(
      isBootstrapAllowed({ headers: { 'x-arkhe-bootstrap': 'test-bootstrap' } }),
      true
    );

    assert.equal(
      isBootstrapAllowed({ headers: { 'x-arkhe-bootstrap': 'test-bootstrap' } }, Date.now() + 120_000),
      false
    );

    assert.equal(
      isBootstrapAllowed({ headers: { 'x-arkhe-bootstrap': 'wrong' } }),
      false
    );
  } finally {
    if (previousSecret === undefined) delete process.env.ARKHE_AUTH_BOOTSTRAP_SECRET;
    else process.env.ARKHE_AUTH_BOOTSTRAP_SECRET = previousSecret;

    if (previousExpiry === undefined) delete process.env.ARKHE_AUTH_BOOTSTRAP_EXPIRES_AT;
    else process.env.ARKHE_AUTH_BOOTSTRAP_EXPIRES_AT = previousExpiry;
  }
});
