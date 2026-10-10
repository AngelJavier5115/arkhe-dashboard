# Design Preview smoke test — semantic relations API

## Scope

- Project: \`arkhe-dashboard\`
- Branch: \`design/tree-network-dashboard\`
- Environment: **Preview only**
- Never promote this deployment to Production as part of this test.

## Required environment

The Preview requires:

- \`VITE_SUPABASE_URL\` and \`VITE_SUPABASE_KEY\` for the read-only Dashboard.
- \`SUPABASE_SERVICE_ROLE_KEY\` as a sensitive server-side variable, scoped to Preview and this branch. It must not use a \`VITE_\` prefix.
- The A.2 service public keys in Preview server environment variables to verify signed investigator requests.
- The human review path additionally needs the A.4 WebAuthn routes/UI and branch-specific RP/origin setup. It is intentionally not end-to-end in this design Preview yet.

## Verified state — 2026-10-10

- Latest design deployment commit: \`0bc00f77f4c3dca7bc7fa10afa1bd14a8ad935f9\`, state \`READY\`, branch \`design/tree-network-dashboard\`.
- \`SUPABASE_SERVICE_ROLE_KEY\` is configured as sensitive, target Preview, branch \`design/tree-network-dashboard\`.
- The endpoint is reachable through the authenticated Preview inspection path. \`GET /api/semantic-relations\` returns HTTP 405 with \`Allow: POST\`, as intended.
- Unit/adversarial tests and build passed in the latest run before the optional live probe was attempted.
- The GitHub-hosted runner received HTTP 302 from Vercel's deployment-protection layer when it attempted to reach the branch alias. This is an access-control redirect, not evidence of an API error. The default CI does not disable or bypass Preview protection and therefore runs unit/adversarial tests plus build only.
- Current data state: 23 legacy knowledge nodes; 0 rows in \`arkhe_semantic_relations\`; 0 rows in \`arkhe_semantic_relation_events\`. No semantic test relation has been inserted.

## Safe verification sequence

1. Confirm deployment branch and commit metadata, and keep target as Preview.
2. Verify the endpoint contract: GET must return 405 and advertise POST. This check has been completed through the authenticated Preview path.
3. Run GitHub Actions unit/adversarial tests and build. These do not replace an authenticated live request.
4. For the live signed-request gate, use a real A.2 signing client (private key stays in its service; never copy it into the browser, repository, chat or logs). Use a pair of existing node IDs and a semantic assertion approved by the project owner. A failed/invalid signature must be rejected before nonce insertion; a valid proposal should create exactly one relation row and one \`relation_created\` event.
5. Before submitting the valid proposal, reconfirm the chosen source/target, relation type, assertion, and evidence with Ángel. Do not create a relation merely to make a deployment test pass.
6. After the live request, verify the exact row/event counts and identity/provenance fields, and verify no unrelated rows were written.
7. The human review path remains pending until the A.4 WebAuthn flow is incorporated into the design Preview. Do not substitute a browser-supplied actor ID.
8. Preserve Vercel Deployment Protection. If a live test runner needs authorized access, use an approved authenticated execution path; do not publish or commit temporary bypass links/secrets.

## Pending gate

A valid signed-service request has **not** yet been accepted in the live Preview. The existing API route is deployed, the required branch-scoped service-role variable exists, and the negative signature cases are covered by server-side tests, but these facts are not a substitute for a successful signed live request. The relation/event tables remain empty until the owner approves a meaningful node pair and a real signed client performs the operation.
