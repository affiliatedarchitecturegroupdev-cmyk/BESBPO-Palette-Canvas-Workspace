#!/usr/bin/env node
/* Phase 5: load test against the running API.
 * Exercises realistic pilot traffic: project home reads, board reads,
 * notification polls, approval reads. Concurrency is parameterized so the
 * drill stays honest but deterministic.
 *
 * Users are chosen so every request is *permitted*: the drill measures
 * latency of successful pilot traffic, not the permission system (a 403
 * would count as a failure and skew the report). `design@` is deliberately
 * absent from /workload — the capability matrix gates workload to
 * ops/finance/lead; finance is used instead.
 *
 * The JSON report is persisted to ops/load-test/load-test-<timestamp>.json
 * (override with REPORT_DIR). */
const fs = require('fs');
const path = require('path');

const url = process.env.API_URL || 'http://localhost:3001';
const users = [
  { email: 'lead@besbpo.example', path: '/projects' },
  { email: 'am@besbpo.example', path: '/projects' },
  { email: 'finance@besbpo.example', path: '/workload' },
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
  const report = {
    url, total, ok, failed: total - ok,
    p50_ms: p50, p95_ms: p95, p99_ms: p99, max_ms: max,
    rounds, concurrency, ran_at: new Date().toISOString(),
    pass: ok === total && p95 <= 1000,
  };
  console.log(JSON.stringify(report));
  const reportDir = process.env.REPORT_DIR || path.join(__dirname, '..', 'ops', 'load-test');
  fs.mkdirSync(reportDir, { recursive: true });
  const file = path.join(reportDir, `load-test-${report.ran_at.replace(/[:.]/g, '-')}.json`);
  fs.writeFileSync(file, JSON.stringify(report, null, 2) + '\n');
  console.log(`report: ${file}`);
  if (!report.pass) {
    process.exit(1);
  }
}

main().catch((e) => { console.error(e); process.exit(2); });
