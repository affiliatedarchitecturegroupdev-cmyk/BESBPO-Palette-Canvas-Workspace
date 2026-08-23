# Runbook 03 — pilot user onboarding

## Add a pilot user
1. Identify the role key (`account_manager`, `creative_contributor`, … — see `packages/shared/src/index.ts`).
2. Insert the person and a role binding (org-scoped for internal roles):
   ```sql
   INSERT INTO person (id, org_id, email, name) VALUES (gen_random_uuid()::text, '<org>', 'user@client.com', 'User Name');
   INSERT INTO role_binding (person_id, role, scope_type, scope_id)
     SELECT id, 'creative_contributor', 'organisation', org_id FROM person WHERE email = 'user@client.com';
   ```
3. (Pilot shortcut) Or re-run `npm run seed -w apps/api` if the user is part of the demo set.

## Add an agency + brand
- Via the UI: Directory → add agency → add brand (account manager+).
- Via API: `POST /directory/agencies`, `POST /directory/agencies/:id/brands`.

## Verify
- `curl -H "x-user-email: user@client.com" localhost:3001/identity/me` returns their roles.
- They appear in the user switcher on the web app.

## SCIM (P6-06, once an IdP is connected)
- Provision via `POST /identity/sso/scim/users` with the org's SCIM bearer token.
