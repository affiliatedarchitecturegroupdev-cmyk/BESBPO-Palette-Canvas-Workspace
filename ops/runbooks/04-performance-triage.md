# Runbook 04 — performance triage

## Quick read
```
scripts/load-test.sh
```
- Hammers the API and prints per-route counts + latency percentiles; exits non-zero
  if the API is down.
- P5-02 baseline: 320/320 ok, p95 14 ms (report in `ops/load/`). Regard p95 > 1000 ms
  as a regression.

## If slow
1. **Which route?** The load test report breaks latency down per route — start with the worst.
2. **N+1 / missing index?** Run the slow query with `EXPLAIN ANALYZE`; add an index in a new
   `apps/api/migrations/NNN_*.sql` (never edit an applied migration).
3. **Connection pool exhausted?** Default `pg` pool is small; check for long-held connections.
4. **Web vs API?** The web is server-rendered per request — confirm the API is the bottleneck
   (`curl -o /dev/null -s -w '%{time_total}\n' -H "x-user-email: ops@besbpo.example" localhost:3001/workload`).

## Capacity context
- The Capacity page (`/capacity`) shows whether the load is a staffing problem
  (people over threshold) rather than a software problem.
