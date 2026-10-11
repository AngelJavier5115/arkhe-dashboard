# A.4.1 — Human authentication implementation contract

## Identity invariant

Every privileged Core action must derive the human principal on the server from a valid WebAuthn-authenticated session. The request body must never establish or override the human investigator identity.

Canonical human investigator: ANGEL_ID 2a003935-f248-442c-96fc-dcee29c4d41a.

## Authentication flow

1. The server creates a short-lived, single-use challenge.
2. The browser completes a WebAuthn ceremony with user verification required.
3. The server validates challenge, origin, RP ID, credential registration and signature.
4. The server marks the challenge consumed.
5. The server creates an opaque session token and stores only a hash of it.
6. Privileged Core endpoints resolve the session to ANGEL_ID.
7. Logout revokes the session.

## Session boundary

Cookie: __Host-arkhe-session

Required properties: Secure, HttpOnly, SameSite=Strict, Path=/, bounded Max-Age.

The session record must contain expiry and revocation state. A revoked or expired session is not authenticated.

## WebAuthn boundary

Production configuration must explicitly bind the expected RP ID and origin. Authentication and registration challenges are stored server-side with a short TTL and one-use semantics.

Credential records store credential ID, public key bytes, counter, transports, creation/use timestamps and revocation state.

At least two human credentials should exist before relying on passkey-only governance: a primary credential and a recovery credential.

## Core authorization

The following actions must require an authenticated human session and must use the server-derived ANGEL_ID:

- iniciar_ronda
- convocar_investigadores
- abrir_debate
- pausar_ronda
- cerrar_ronda
- cancelar_ronda

The legacy actor_id field may remain in payloads for compatibility during migration, but it is non-authoritative. A mismatching actor_id must not change or bypass the server-derived principal.

## Required adversarial evidence

The A.4 closure test must demonstrate rejection of:
- privileged request without a session
- forged actor_id
- expired session
- revoked session
- expired challenge
- reused challenge
- unregistered credential
- revoked credential
- wrong origin
- mutated WebAuthn assertion
- unauthorized passkey registration

It must demonstrate acceptance of a valid passkey authentication and that the resulting Core action records the canonical human principal.

## Scope

No RLS policy change is required for A.4. Authentication and human governance identity are enforced at the application/API boundary.

