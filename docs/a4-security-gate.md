# A.4 security gate

## Baseline and scope

- Branch: audit/a4-human-auth; main remains unchanged.
- Baseline CI passed on commit 9938f76b53c78e5a8614aee6777f905826a54c89, with build and 35/35 tests.
- The workflow must remain green for the current revision; this document is not itself evidence that a later run has passed.
- The human principal is derived from a verified server-side WebAuthn session. Client-supplied actor_id is never the source of authority.
- Governance mutations require same-origin and recent human reauthentication. Service-investigator operations remain behind the A.2 signed-request boundary.
- A.4 Supabase auth tables, challenge attempt limiting, recent reauthentication state, and the corrected investigator principal columns have been provisioned.
- SUPABASE_SERVICE_ROLE_KEY is configured as a secret only for Preview on audit/a4-human-auth; it must never be added to Production or exposed to client code.

## Current implementation gates

- The UI can bootstrap the first passkey and authenticate a session.
- An authenticated operator can register an additional passkey after recent reauthentication.
- Credential listing exposes metadata only, not credential public keys or private authenticator material.
- Credential revocation requires a valid human session, same-origin request, and recent WebAuthn reauthentication.
- The database revocation function serializes concurrent changes and refuses to revoke the final active credential.

## Required before A.4 closure

1. Verify the current GitHub Actions build and complete test suite are green.
2. Obtain a READY Vercel Preview for the current branch head and verify runtime configuration without displaying secrets.
3. Perform the first real WebAuthn enrollment in the controlled Preview.
4. Authenticate, then enroll and verify a second recovery passkey.
5. Exercise revocation with two active credentials; confirm the revoked credential cannot authenticate and that the final active credential cannot be revoked.
6. Run the controlled adversarial runtime suite against the Preview: no session, forged actor_id, cross-origin mutation, expired/replayed challenge, wrong origin/RP ID, unregistered or revoked credential, and stale reauthentication.
7. Remove the temporary bootstrap secret and expiry variable immediately after initial enrollment; do not reuse the expired bootstrap window.
8. Review logs and database state for unexpected sessions, challenges, or credentials, then perform a final human review.

## Hard boundary

No merge to main, no production activation of human-auth secrets, and no production WebAuthn enrollment are authorized by this gate. Passing CI alone does not close A.4.
