# A.4 staging RLS lockdown

Date: 2026-10-12
Branch: `security/a4-idempotent-completion`
Scope: isolated Supabase project `arkhe-a4-staging` (`axfqtovorxohkpkkgcul`) only.

## Applied change

Migration: `tests/staging/migrations/20261012012931_staging_rls_lockdown_readonly.sql`
Supabase migration history: `20261012012931_staging_rls_lockdown_readonly`.

The migration has a fail-closed guard that requires the synthetic `A4-STAGE-001` project row before making any changes. Do not remove that guard or run this staging-only migration against the shared/production database.

- Enabled RLS across all 21 application tables audited in staging.
- Revoked all direct table privileges from `anon` and `authenticated`, then restored `SELECT` only on the nine tables used by the Dashboard's read-only panels.
- Kept read policies on staging's synthetic Dashboard data and semantic relation/event tables. These rows remain publicly readable through the publishable/anon key; do not store confidential material in those tables.
- Left authentication credentials, WebAuthn challenges, sessions, convocations, interventions, investigator profiles/memories, participations, dispatch records, and semantic write windows without browser-role access or policies.
- Revoked browser-role privileges on public-schema sequences.
- Did not modify `service_role` grants. The server-side APIs use `SUPABASE_SERVICE_ROLE_KEY`; database role metadata confirms `service_role` has `BYPASSRLS`, while `anon` and `authenticated` do not.
- No production/shared Supabase project, production variables, Render production service, Discord bot, or production data was modified by this migration.

## Verification observed after migration

- All 21 audited tables show RLS enabled.
- Sensitive tables have no RLS policies and no table privileges for `anon` or `authenticated`.
- Dashboard tables grant `SELECT` only; browser roles have no `INSERT`, `UPDATE`, `DELETE` or `TRUNCATE` privilege.
- The synthetic project remains present, with one test round and one test invocation; the dispatch table and interventions table have zero rows at the time of verification.
- The migration is recorded in the staging project's migration history.

## Important boundary

This is staging hardening, not a complete production RLS policy set. Read-only Dashboard tables still have a broad `USING (true)` policy inside this synthetic-only staging project, so they are not appropriate for private data. Future production policies should be designed around authenticated application access and least privilege; do not copy these read policies to production.
