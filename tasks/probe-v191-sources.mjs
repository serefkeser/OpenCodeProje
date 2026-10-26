// v1.191 kaynak adayları: dijitalbasin (Evrensel/Pencere/Diriliş) + BİK İlk Sayfalar (Korkusuz/Milli/Yeni Asya)
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

const dir = `${process.env.TEMP}/gazete-diag`;
fs.mkdirSync(dir, { recursive: true });
const viaProxy = (label, url) => {
  try {
    const out = execFileSync('curl.exe', ['-sS', '-m', '45', '-w', '\n__HTTP %{http_code}', `http://127.0.0.1:4100/proxy?url=${encodeURIComponent(url)}`], { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
    const code = (/__HTTP (\d+)/.exec(out) || [])[1] || '?';
    const body = out.replace(/\n__HTTP \d+\s*$/, '');
    return { code, body };
  } catch (e) {
    const r = e && e.response ? null : null;
    return { code: 'ERR', body: String(e?.message || e) };
  }
};
const analyze = (label, body) => {
  const title = (/<title>([^<]*)<\/title>/i.exec(body) || [])[1] || '';
  const isoDates = [...new Set([...body.matchAll(/20\d\d[-/.]\d{1,2}[-/.]\d{1,2}/g)].map(m => m[0]))];
  const trDates = [...new Set([...body.matchAll(/\b\d{1,2}[. ]+(?:Ocak|Şubat|Mart|Nisan|Mayıs|Haziran|Temmuz|Ağustos|Eylül|Ekim|Kasım|Aralık)[. ]+20\d\d|\b\d{2}\.\d{2}\.\d{4}\b/gi)].map(m => m[0]))];
  const imgs = [...new Set([...body.matchAll(/(?:src|data-src|href)=["']([^"']+\.(?:jpe?g|png|webp|pdf)[^"']*)["']/gi)].map(m => m[1]))];
  console.log(`=== ${label} ===`);
  console.log('title:', title.slice(0, 130).replace(/\s+/g, ' '));
  console.log('ISO:', isoDates.slice(0, 6).join(' | ') || 'yok', '|| TR:', trDates.slice(0, 5).join(' | ') || 'yok');
  console.log('img/pdf:', imgs.length);
  console.log(imgs.slice(0, 6).join('\n') || 'yok');
  console.log('');
};

const targets = [
  ['dijitalbasin-EVRENSEL', 'https://www.dijitalbasin.com/Read/331/istanbul-bahcelievler-evrensel'],
  ['dijitalbasin-PENCERE', 'https://www.dijitalbasin.com/Read/504/istanbul-besiktas-gazete-pencere'],
  ['dijitalbasin-DIRILIS', 'https://www.dijitalbasin.com/Read/321/dirilis-postasi'],
  ['BIK-ILKSAYFALAR', 'https://gazete.bik.gov.tr/Uygulamalar/GazeteIlkSayfalar?kapsam=yaygin'],
];
for (const [label, url] of targets) {
  const r = viaProxy(label, url);
  console.log(`### ${label} -> HTTP ${r.code} boyut=${r.body.length}`);
  fs.writeFileSync(`${dir}/${label}.html`, r.body, 'utf8');
  if (r.code === '200') analyze(label, r.body);
  else console.log('govde ilk 200:', r.body.slice(0, 200));
}
