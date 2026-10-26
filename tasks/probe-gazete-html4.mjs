import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
const dir = `${process.env.TEMP}/gazete-diag`;
const gzt = fs.readFileSync(`${dir}/gzt.html`, 'utf8');

// 1) GZT 140000-156500 bölgesi: kart yapısı
{
  const region = gzt.slice(140000, 156500);
  const imgs = [...region.matchAll(/<img\b[^>]*(?:src|srcset|alt)=["']([^"']+)["'][^>]*>/gi)].map(m => m[1].slice(0, 160));
  const hrefs = [...region.matchAll(/href=["']([^"']+)["']/gi)].map(m => m[1].slice(0, 110));
  console.log(`GZT bölge img (${imgs.length}):`, [...new Set(imgs)].slice(0, 8).join(' | '));
  console.log(`GZT bölge href (${hrefs.length}):`, [...new Set(hrefs)].slice(0, 10).join(' | '));
  const rsc = gzt.slice(263000, 285000);
  const str = [...rsc.matchAll(/"([^"]{6,120})"/g)].map(m => m[1]).filter(s => /[A-Za-z-]{6,}/.test(s) && !/^_*\d*$/.test(s));
  console.log(`\nGZT RSC string örnekleri (ilk 25):`, str.slice(0, 25).join(' § '));
}

// 2) tekil alt sayfalar bugün veriyor mu
const fetchPage = (url) => {
  try { return execFileSync('curl.exe', ['-sS', '-m', '40', `http://127.0.0.1:4100/proxy?url=${encodeURIComponent(url)}`], { encoding: 'utf8', maxBuffer: 24 * 1024 * 1024 }); }
  catch (e) { return `HATA ${String(e?.message || e)}`; }
};
for (const u of [
  'https://www.gazeteoku.com/gazeteler/hurriyet-gazetesi-manseti',
  'https://www.aydinlik.com.tr/gazete-mansetleri/aydinlik-gazetesi',
  'https://gazetemanset.gzt.com/bugun'
]) {
  const body = fetchPage(u);
  const iso = [...body.matchAll(/\b(20\d{2}-\d{2}-\d{2})\b/g)].map(m => m[1]);
  const tr = [...body.matchAll(/\b(2\d|10|11|15|16|17|18|19|1|2|3|4|5|6|7|8|9)\s+(ekim|kas)\s+2026\b/gi)];
  const stg = [...body.matchAll(/\/storage\/newspapers\/(20\d{2}-\d{2}-\d{2})\//g)].map(m => m[1]);
  console.log(`\n== ${u} == boyut=${body.length}`);
  console.log(`  iso tarihler: ${[...new Set(iso)].slice(0, 8).join(', ') || 'yok'}`);
  console.log(`  '/storage/newspapers/<tarih>': ${[...new Set(stg)].join(', ') || 'yok'}`);
  void tr;
}
