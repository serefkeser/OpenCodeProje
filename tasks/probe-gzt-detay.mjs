// GZT: gri gazeteler için istenen tarihin detay sayfası var mı?
import { execFileSync } from 'node:child_process';
const DATE = '25-10-2026';
const targets = [
  ['Dünya', 'dunya-gazetesi'],
  ['Nasıl Bir Ekonomi', 'nasilbirekonomi-gazetesi'],
  ['Analiz', 'analiz-gazetesi'],
  ['Gazete Pencere', 'gazetepencere-gazetesi'],
  ['Tavır', 'tavir-gazetesi'],
  ['Evrensel', 'evrensel-gazetesi'],
  ['Günboyu', 'gunboyu-gazetesi'],
  ['BirGün (kontrol)', 'birgun-gazetesi'],
];
const fetchPage = (url) => {
  try {
    return execFileSync('curl.exe', ['-sS', '-m', '30', `http://127.0.0.1:4100/proxy?url=${encodeURIComponent(url)}`], { encoding: 'utf8', maxBuffer: 6 * 1024 * 1024 });
  } catch (e) { return `HERRA ${String(e?.message || e).slice(0, 100)}`; }
};
for (const [name, slug] of targets) {
  const body = fetchPage(`https://gazetemanset.gzt.com/${slug}/${DATE}`);
  const ok = !/HERRA/.test(body);
  const len = ok ? body.length : 0;
  const hasDate = ok && body.includes(`/${DATE}`);
  const rsc = ok && /selectedDate/.test(body);
  const imgs = ok ? [...body.matchAll(/<img[^>]+src="(https?:[^"]+gzt[^"]*)"/gi)].length : 0;
  const title404 = /404|bulunamad|not[- ]found/i.test(body);
  console.log(`${name.padEnd(18)} detay: ${(ok && !title404) ? 'AÇIK' : 'yok/404'} boyut=${len} tarihgeçiş=${hasDate ? 'VAR' : 'yok'} RSC=${rsc ? 'VAR' : 'yok'} img=${imgs}`);
}
