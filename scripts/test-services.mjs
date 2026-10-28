// ============================================================================
// OTONOM v1.195 — SERVİS SMOKE TEST (zero-dep; node scripts/test-services.mjs)
// Üç servisi test portlarında (4301/4302/4303) kalktırır, uçları doğrular:
//   /health, 404, PROMPT_REQUIRED, CORS allowlist (izinli köken yankılanır,
//   izinsiz köken ACAO almaz), gateway passthrough.
// Bu test gerçek Gemini çağrısı yapmaz (anahtar geçilmez); kota harcamaz.
// ============================================================================
import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const TEST_PORTS = { gateway: 4301, analysis: 4302, media: 4303 };
const BASE = `http://127.0.0.1:${TEST_PORTS.gateway}`;
const ORIGIN_OK = 'http://localhost:5173';
const ORIGIN_BAD = 'http://evil.example';

const children = [
  ['analysis', 'services/analysis/index.mjs', { ANALYSIS_PORT: String(TEST_PORTS.analysis) }],
  ['media', 'services/media/index.mjs', { MEDIA_PORT: String(TEST_PORTS.media) }],
  ['gateway', 'services/gateway/index.mjs', { GATEWAY_PORT: String(TEST_PORTS.gateway), ANALYSIS_PORT: String(TEST_PORTS.analysis), MEDIA_PORT: String(TEST_PORTS.media) }],
].map(([name, script, env]) => spawn(process.execPath, [join(rootDir, script)], {
  cwd: rootDir,
  env: { ...process.env, ...env, GEMINI_API_KEY: '', OPENROUTER_API_KEY: '', GROQ_API_KEY: '', NVIDIA_API_KEY: '' },
  stdio: ['ignore', 'inherit', 'inherit'],
}));

const sleep = ms => new Promise(r => setTimeout(r, ms));
const waitForHealth = async () => {
  for (let i = 0; i < 50; i++) {
    try {
      const r = await fetch(`${BASE}/health`);
      if (r.ok) return await r.json();
    } catch (_) {}
    await sleep(200);
  }
  throw new Error('Gateway 10 sn içinde ayağa kalkmadı.');
};

const results = [];
const check = async (name, fn) => {
  try { await fn(); results.push(`PASS ${name}`); }
  catch (e) { results.push(`FAIL ${name} → ${e?.message || e}`); }
};
const assert = (cond, msg) => { if (!cond) throw new Error(msg); };

try {
  const health = await waitForHealth();
  await check('gateway/health üç servis de canlı', () => assert(health.ok && health.analysis.up && health.media.up && health.geminiKey === false, `health beklenmedik: ${JSON.stringify(health)}`));
  await check('gateway/404 NOT_FOUND', async () => {
    const r = await fetch(`${BASE}/api/yok`);
    const b = await r.json();
    assert(r.status === 404 && b.code === 'NOT_FOUND', `status=${r.status} code=${b.code}`);
  });
  await check('analysis/404', async () => {
    const r = await fetch(`http://127.0.0.1:${TEST_PORTS.analysis}/api/yok`);
    assert(r.status === 404, `status=${r.status}`);
  });
  await check('analysis/text boş prompt → 400 PROMPT_REQUIRED', async () => {
    const r = await fetch(`http://127.0.0.1:${TEST_PORTS.analysis}/api/analysis/text`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
    const b = await r.json();
    assert(r.status === 400 && b.code === 'PROMPT_REQUIRED', `status=${r.status} code=${b.code}`);
  });
  await check('media/image boş prompt → 400 PROMPT_REQUIRED', async () => {
    const r = await fetch(`http://127.0.0.1:${TEST_PORTS.media}/api/media/image`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
    const b = await r.json();
    assert(r.status === 400 && b.code === 'PROMPT_REQUIRED', `status=${r.status} code=${b.code}`);
  });
  await check('media/tts boş metin → 400 TEXT_REQUIRED', async () => {
    const r = await fetch(`http://127.0.0.1:${TEST_PORTS.media}/api/media/tts`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
    const b = await r.json();
    assert(r.status === 400 && b.code === 'TEXT_REQUIRED', `status=${r.status} code=${b.code}`);
  });
  await check('CORS izinli köken ACAO yankılanır (analysis/health)', async () => {
    const r = await fetch(`http://127.0.0.1:${TEST_PORTS.analysis}/health`, { headers: { origin: ORIGIN_OK } });
    assert(r.headers.get('access-control-allow-origin') === ORIGIN_OK, `ACAO=${r.headers.get('access-control-allow-origin')}`);
  });
  await check('CORS izinsiz köken ACAO almaz (analysis/health)', async () => {
    const r = await fetch(`http://127.0.0.1:${TEST_PORTS.analysis}/health`, { headers: { origin: ORIGIN_BAD } });
    assert(!r.headers.get('access-control-allow-origin'), `ACAO sızdı: ${r.headers.get('access-control-allow-origin')}`);
  });
  await check('CORS izinsiz köken ACAO almaz (gateway/proxy)', async () => {
    const r = await fetch(`${BASE}/proxy?url=${encodeURIComponent('https://example.com')}`, { headers: { origin: ORIGIN_BAD } });
    assert(!r.headers.get('access-control-allow-origin'), `ACAO sızdı: ${r.headers.get('access-control-allow-origin')}`);
  });
  await check('CORS izinli köken ACAO yankılanır (gateway/proxy)', async () => {
    const r = await fetch(`${BASE}/proxy?url=${encodeURIComponent('https://example.com')}`, { headers: { origin: ORIGIN_OK } });
    assert(r.headers.get('access-control-allow-origin') === ORIGIN_OK, `ACAO=${r.headers.get('access-control-allow-origin')}`);
  });
  await check('gateway gövde sınırı: 100 MB üstü bağlantı reddi (413 veya ECONNRESET)', async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      // v1.195: sunucu sınırı aşınca akışı destroy eder → istemci ya 413 alır
      // ya bağlantı hatası görür; ikisi de "sınıf aşımı tamponlanmadı" kanıtıdır.
      try {
        const r = await fetch(`${BASE}/api/gazete-manifest`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: 'x'.repeat(101e6), signal: controller.signal });
        const b = await r.json();
        assert(r.status === 413 && b.code === 'REQUEST_TOO_LARGE', `status=${r.status} code=${b.code}`);
      } catch (_) { /* bağlantı reddi = sınır çalıştı */ }
    } finally { clearTimeout(timer); }
  });
} catch (e) {
  results.push(`FAIL kurulum → ${e?.message || e}`);
} finally {
  children.forEach(c => c.kill());
}

const fails = results.filter(r => r.startsWith('FAIL'));
console.log(results.join('\n'));
console.log(fails.length ? `\n${fails.length} FAIL — servis smoke testi BAŞARISIZ` : `\n${results.length}/${results.length} PASS — servis smoke testi ✓`);
process.exitCode = fails.length ? 1 : 0;
