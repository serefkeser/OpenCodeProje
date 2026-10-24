// v1.185 probe: gateway /api/music uçuş öncesi test (geçici port, üretimi etkilemez)
import { spawn } from 'node:child_process';
import { rmSync } from 'node:fs';

const PORT = 4199;
const BASE = `http://127.0.0.1:${PORT}`;
const results = [];
const check = (name, condition, detail = '') => {
  results.push({ name, ok: !!condition, detail });
  console.log(`${condition ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
};

const child = spawn(process.execPath, ['services/gateway/index.mjs'], {
  env: { ...process.env, GATEWAY_PORT: String(PORT), ANALYSIS_PORT: '4291', MEDIA_PORT: '4292' },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let stderr = '';
child.stderr.on('data', d => { stderr += d; });
await new Promise(r => setTimeout(r, 1200));

const list = async () => (await fetch(`${BASE}/api/music`)).json();
try {
  rmSync(new URL('./muzik/', import.meta.url), { recursive: true, force: true });

  // 1) boş liste
  let j = await list();
  check('boş katalog listelenir', j.ok === true && Array.isArray(j.tracks) && j.tracks.length === 0, JSON.stringify(j.tracks?.length));

  // 2) geçerli kayıt
  const b64 = Buffer.from('RIFF_DATA-test-muzik-bytes-0123456789'.repeat(3)).toString('base64');
  const put = await fetch(`${BASE}/api/music`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ track: { id: 'fm_probe_test_1111', name: 'probe.mp3', data: `data:audio/mpeg;base64,${b64}` } }) });
  j = await put.json();
  check('parça kaydedilir', put.ok && j.ok && j.track?.id === 'fm_probe_test_1111' && j.track?.bytes > 0, JSON.stringify(j.track || j));

  // 3) liste aynı parçayı döndürür
  j = await list();
  check('katalogta mutamet bir parça', j.ok && j.count === 1 && j.tracks?.[0]?.name === 'probe.mp3', JSON.stringify(j.tracks?.[0]));

  // 4) okuma data-URL döner
  const get = await fetch(`${BASE}/api/music?id=fm_probe_test_1111`);
  j = await get.json();
  check('parça veri URL ile okunur', get.ok && j.ok && /^data:audio\/mpeg;base64,/.test(j.track?.data || '') && j.track.data.length > 40, `uzunluk=${(j.track?.data || '').length}`);

  // 5) geçersiz id reddi
  const bad = await fetch(`${BASE}/api/music?id=../etc/passwd`);
  check('geçersiz id reddedilir', bad.status === 400, `status=${bad.status}`);

  // 6) yanlış mime reddi
  const badMime = await fetch(`${BASE}/api/music`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ track: { id: 'fm_bad_1', name: 'x.png', data: `data:image/png;base64,${b64}` } }) });
  check('resim mime reddedilir', badMime.status === 415, `status=${badMime.status}`);

  // 7) düşürme
  const del = await fetch(`${BASE}/api/music?id=fm_probe_test_1111`, { method: 'DELETE' });
  j = await del.json();
  check('parça silinir', del.ok && j.ok && j.deleted === 'fm_probe_test_1111', JSON.stringify(j));
  j = await list();
  check('katalog yeniden boş', j.ok && j.count === 0, `count=${j.count}`);
} catch (e) {
  check('probe beklenmeyen hata', false, String(e?.message || e));
} finally {
  child.kill();
}
const failed = results.filter(r => !r.ok).length;
console.log(`\nÖzet: ${results.length - failed}/${results.length} geçti${stderr ? '\n[stderr] ' + stderr.slice(0, 400) : ''}`);
process.exit(failed ? 1 : 0);
