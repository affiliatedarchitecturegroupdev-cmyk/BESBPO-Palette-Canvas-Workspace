#!/usr/bin/env node
/* Phase 5: load test against the running API.
 * Exercises realistic pilot traffic: project home reads, board reads,
 * notification polls, approval reads. Concurrency is parameterized so the
 * drill stays honest but deterministic. */
const url = process.env.API_URL || 'http://localhost:3001';
const users = [
  { email: 'lead@besbpo.example', path: '/projects' },
  { email: 'am@besbpo.example', path: '/projects' },
  { email: 'design@besbpo.example', path: '/workload' },
  { email: 'ops@besbpo.example', path: '/audit' },
  { email: 'client-a@nimbus.example', path: '/projects' },
];
const rounds = Number(process.env.ROUNDS || 40);
const concurrency = Number(process.env.CONCURRENCY || 8);

async function fetchOne(u) {
  const started = Date.now();
  const res = await fetch(`${url}${u.path}`, { headers: { 'x-user-email': u.email } });
  return { ok: res.ok, ms: Date.now() - started, status: res.status };
}

async function main() {
  const all = [];
  for (let r = 0; r < rounds; r += 1) {
    const batch = [];
    for (let i = 0; i < concurrency; i += 1) {
      batch.push(fetchOne(users[i % users.length]));
    }
    all.push(...(await Promise.all(batch)));
  }
  const total = all.length;
  const ok = all.filter((x) => x.ok).length;
  const latencies = all.map((x) => x.ms).sort((a, b) => a - b);
  const p50 = latencies[Math.floor(latencies.length * 0.5)];
  const p95 = latencies[Math.floor(latencies.length * 0.95)];
  const p99 = latencies[Math.floor(latencies.length * 0.99)];
  const max = latencies[latencies.length - 1];
  console.log(JSON.stringify({ url, total, ok, failed: total - ok, p50_ms: p50, p95_ms: p95, p99_ms: p99, max_ms: max }));
  if (ok !== total || p95 > 1000) {
    process.exit(1);
  }
}

main().catch((e) => { console.error(e); process.exit(2); });
