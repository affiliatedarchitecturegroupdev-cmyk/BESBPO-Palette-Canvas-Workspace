# Runbook 01 — service won't start

## Symptoms
- `npm run dev:api` or `npm run dev:web` exits immediately, or the port never opens.
- The web app shows "api unreachable".

## Checks (in order)
1. **Postgres up?** `pg_isready -h localhost -p 5432`. If not, start it (e.g. `docker compose up -d db`).
2. **Migrations applied?** The API migrates on boot; a failing migration aborts startup.
   Run manually to see the error: `npm run migrate -w apps/api`.
3. **Port in use?** `lsof -i :3001` / `lsof -i :3000`; stop the stale process (find its PID first, then `kill <pid>`).
4. **Dependencies installed?** `npm ci` at the repo root after pulling.
5. **Env vars?** `DATABASE_URL` must point at the pilot database; `PORT` defaults to 3001.

## Recover
- Fix the first failing check, then restart the API (`npm run dev:api`) and confirm
  `curl -s localhost:3001/` returns 200 before starting the web.

## Escalate
- If a migration is destructive or the schema is inconsistent, restore from the last
  good backup (Runbook 02) and page the platform owner.
