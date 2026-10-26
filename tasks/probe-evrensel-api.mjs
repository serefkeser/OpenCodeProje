// evrensel gazete sayfasındaki veri izi + tarih-desen denemeleri
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
const dir = `${process.env.TEMP}/gazete-diag`;
const h = fs.readFileSync(`${dir}/evrensel-net.html`, 'utf8');

const jsonDrops = [...new Set([...h.matchAll(/(?:__NEXT_DATA__|__NUXT__|window\.__|application\/json)/gi)].map(m => m[0]))];
console.log('json island izleri:', jsonDrops.join(' | ') || 'yok');
const apiHits = [...new Set([...h.matchAll(/"((?:\/|https?:\/\/)[^"]*api[^"]*)"/gi)].map(m => m[1]))].filter(u => /paper|gazete|makale|news|hurriyet|front/i.test(u));
console.log('api izleri:', apiHits.slice(0, 10).join('\n') || 'yok');
const imgHits = [...new Set([...h.matchAll(/https?:\/\/[\w.\-]*evrensel[\w.\-]*\/[^\s"'<>]+\.(?:jpe?g|png|webp)/gi)].map(m => m[0]))];
console.log('evrensel img ornekleri:', imgHits.slice(0, 5).join('\n') || 'yok');

const viaProxy = (url) => {
  try {
    const out = execFileSync('curl.exe', ['-sS', '-m', '30', '-w', '\n__HTTP %{http_code}', `http://127.0.0.1:4100/proxy?url=${encodeURIComponent(url)}`], { encoding: 'utf8', maxBuffer: 6 * 1024 * 1024 });
    const code = /__HTTP (\d+)/.exec(out)?.[1] || '?';
    const body = out.replace(/\n__HTTP \d+\s*$/, '');
    return { code, body };
  } catch (e) { return { code: 'ERR', body: String(e?.message || e) }; }
};
const DATE = '26-10-2026';
for (const candidate of [
  `https://www.evrensel.net/gazete/${DATE}`,
  `https://www.evrensel.net/gazete/2026-10-26`,
  `https://www.evrensel.net/gazete?date=2026-10-26`,
]) {
  const r = viaProxy(candidate);
  const cards = [...new Set([...r.body.matchAll(/20\d\d[-/.]\d\d[-/.]\d\d/g)].map(m => m[0]))];
  const imgs = [...new Set([...r.body.matchAll(/https?:\/\/[\w.\-]*\.evrensel[\w.\-]*[^\s"'<>]+\.(?:jpe?g|png|webp)/gi)].map(m => m[0]))];
  console.log(`\n${candidate} -> HTTP ${r.code} boyut=${r.body.length} tarih="${cards.slice(0, 4).join(',') || 'yok'}" img=${imgs.length}`);
  if (imgs.length) console.log('  ornek img:', imgs.slice(0, 2).join('\n  '));
}
