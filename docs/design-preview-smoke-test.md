# Design Preview smoke test — semantic relations API

## Scope

- Project: `arkhe-dashboard`
- Branch: `design/tree-network-dashboard`
- Environment: **Preview only**
- Never promote this deployment to Production as part of this test.

## Required environment

The Preview requires:

- `VITE_SUPABASE_URL` and `VITE_SUPABASE_KEY` for the read-only Dashboard.
- `SUPABASE_SERVICE_ROLE_KEY` configured as a sensitive server-side variable, scoped to Preview and this branch. It must not use a `VITE_` prefix.
- The A.2 service public keys available as Preview server environment variables to verify signed investigator requests.
- The human review path additionally needs the A.4 WebAuthn routes/UI and branch-specific RP/origin setup. It is intentionally not considered end-to-end in this design branch yet.

After changing environment variables, create a fresh deployment of this branch. An existing READY deployment does not prove it includes the new configuration.

## Safe smoke checks

1. Confirm the deployment metadata says `githubCommitRef = design/tree-network-dashboard` and the target is Preview.
2. `GET /api/semantic-relations` should return 405 with `Allow: POST`. This confirms the route exists; it does not validate credentials.
3. Never use an unsigned request to create a relation. Do not place service private keys, the service-role key, or WebAuthn bootstrap secrets in browser JavaScript, query strings, logs, or chat.
4. Run the server unit/adversarial test suite in GitHub Actions before any authenticated live write.
5. For a real signed-request smoke test, use an approved test pair of existing node IDs and a known-good A.2 signing service. Confirm the created relation and exactly one `relation_created` event are present, then stop. Do not generate fake epistemic facts merely to exercise the database.
6. Verify `anon` cannot insert, update, or delete and `service_role` cannot perform direct table DML; only the restricted RPCs can write.
7. Reconfirm the tables contain no unintended relation/event rows after the safe checks.

## Current status

The endpoint is deployed and the CI tests pass. The branch-specific `SUPABASE_SERVICE_ROLE_KEY` entry now exists as a sensitive Preview variable. A fresh build is required to pick it up. A live authenticated write has not yet been executed.
