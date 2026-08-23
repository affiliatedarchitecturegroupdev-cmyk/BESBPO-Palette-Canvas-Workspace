# Runbook 05 — security headers & error audit

## Headers (P5-04)
Every API response must carry:
```
curl -sI -H "x-user-email: ops@besbpo.example" localhost:3001/workload \
  | grep -Ei 'x-content-type-options|x-frame-options|referrer-policy|permissions-policy|content-security-policy'
```
Expect: `nosniff`, `DENY`, `no-referrer`, restrictive permissions-policy, and a CSP
of `default-src 'self'; frame-ancestors 'none'; base-uri 'self'`.

## Error wrapper (P5-04)
- **5xx** responses return `{"statusCode":500,"error":"internal_error","message":"Internal server error"}`
  — never a stack trace.
- **4xx** responses keep their Nest message but a uniform shape.
- Trigger a 4xx to confirm: `curl -s localhost:3001/workload` (no user header) → 401 JSON.

## Re-check after
- Any change to `apps/api/src/security/security.ts` or `main.ts`.
- Any dependency upgrade of Nest/Express.
- Before pilot go-live (see `ops/pilot-launch-checklist.md`).
