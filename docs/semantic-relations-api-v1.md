# Semantic Relations API v1

## Endpoint

POST /api/semantic-relations is the only write route. It accepts JSON and the actions create and review. All responses set Cache-Control: no-store; payloads above 24 KiB are rejected.

## Authentication and actor identity

The endpoint accepts exactly one of two trusted identity channels:

- **Signed investigator service:** Ed25519 headers from A.2 (x-arkhe-service-id, x-arkhe-timestamp, x-arkhe-nonce, x-arkhe-signature). The signature covers the canonical JSON body. The timestamp window is ±5 minutes and the nonce is inserted once into core_request_nonces. A signature header, even an incomplete one, prevents fallback to cookie authentication.
- **Human governor:** exact configured Origin, active __Host-arkhe-session cookie, and WebAuthn reauthentication within the last 10 minutes. The server derives the actor as Ángel. Human review actions are not accepted from a signed AI service.

Identity/origin claims (actor_id, investigador_id, created_by_investigator_id, origin_kind, and related fields) are rejected in the body. The server constructs these values after authentication.

## Create a semantic relation

Example for a signed investigator (the provider, model, and run_ref fields are optional and are taken only from the authenticated service's signed body):

    {
      "action": "create",
      "source_node_id": 21,
      "target_node_id": 22,
      "relation_type": "supports",
      "assertion": "El aporte de origen respalda la hipótesis de destino bajo estas condiciones.",
      "evidence_text": "El contenido citado contiene la premisa pertinente y su alcance.",
      "evidence_node_id": 21,
      "evidence_uri": "https://example.org/paper",
      "provider": "Proveedor declarado por el servicio",
      "model": "Modelo declarado por el servicio",
      "run_ref": "round-8-invocation-12"
    }

Allowed relation types: supports, contradicts, derives_from, extends, questions, duplicates, and describes. Source and target must be distinct existing nodes. Assertion and evidence text are both required. Evidence URLs must be HTTP(S). Only the human governor may supersede an existing relation, and the superseded relation must have the same source, target, and type.

A successful request returns HTTP 201 and a relation_id. A proposal remains a proposal; creating it does not itself approve it.

## Human review

Only Ángel, through a recent WebAuthn session, may append review events:

    {
      "action": "review",
      "relation_id": "c6bbd0aa-4721-42a7-91e7-06a4d8f56d6c",
      "event_type": "relation_disputed",
      "note": "La evidencia registrada no respalda todavía la afirmación en el alcance indicado."
    }

Allowed review event types: relation_reviewed, relation_disputed, relation_rejected, evidence_added, and note_added. Every event requires an explanatory note. evidence_added also requires evidence text and may include an HTTP(S) source URI. Review events are append-only. A review or a dispute is not itself scientific proof.

## Guardrails

- Hard limit: 30 write attempts per actor per fixed 10-minute window, stored server-side.
- The API never accepts an actor identity from the client.
- AI services can propose new relations, but cannot review, reject, or supersede them.
- Writes go through arkhe_register_semantic_relation or arkhe_append_semantic_relation_event RPCs. The browser and service_role have no direct table DML privileges on semantic relations/events.
- Service authentication proves which Arkhé service submitted the assertion. Provider/model fields are still self-reported by that signed service; independent provider attestation remains A.5.
- Requests fail closed if branch-specific server environment variables are absent. SUPABASE_SERVICE_ROLE_KEY must be a sensitive Preview-only variable for the design branch, never a VITE_ variable and never exposed to the browser.
- The A.4 login/WebAuthn UI and routes remain on their separate audit branch. Until that same-origin flow is incorporated into this design Preview, the human endpoint path cannot be exercised end-to-end there. Signed-service requests can be tested independently using the A.2 public keys.

## Status

Endpoint and migrations are implemented on design/tree-network-dashboard. The server-side tests cover identity derivation, signature tampering, stale signatures, replayed nonces, human reauthentication, forged actor fields, event policy, and fixed-window rate limiting. Preview environment setup and a live signed-request smoke test remain operational gates. No PR is merged and production is not activated.
