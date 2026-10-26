import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
const dir = `${process.env.TEMP}/gazete-diag`;
const g = fs.readFileSync(`${dir}/gazetemanset.gzt.com.html`, 'utf8');

// GZT: /{slug}/25-10-2026 biçimli adresler (tarih kanıtlı, DD-MM-YYYY)
const dated = [...g.matchAll(/\/([a-z0-9\\-]+)\/(2\d-\d\d-2\d{3})/g)]
  .filter(m => m[2] === '25-10-2026')
  .map(m => m[0]);
const uniqDated = [...new Set(dated)];
console.log(`GZT tarihli (25-10-2026) adres sayısı: ${uniqDated.length}`);
console.log(uniqDated.slice(0, 40).join('\n'));

// Canlı tekil çekiş: GazeteOku CF hâlâ sürüyor mu?
const viaProxy = (url) => {
  try {
    return execFileSync('curl.exe', ['-sS', '-m', '40', '-w', '\n__HTTP %{http_code}', `http://127.0.0.1:4100/proxy?url=${encodeURIComponent(url)}`], { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
  } catch (e) { return `HATA ${String(e?.message || e).slice(0, 120)}`; }
};
const r = viaProxy('https://www.gazeteoku.com/gazeteler');
const code = /__HTTP (\d+)/.exec(r)?.[1] || '?';
const cf = /Just a moment|challenges\.cloudflare/i.test(r);
console.log(`\nGazeteOku canlı çekiş: HTTP ${code}; CF challenge: ${cf ? 'EVET' : 'hayır'}`);
