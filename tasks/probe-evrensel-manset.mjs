// evrensel ?date: MANŞET bölümünü bulup yakın img/alt/link bağlamını dök
import fs from 'node:fs';
const dir = `${process.env.TEMP}/gazete-diag`;
const body = fs.readFileSync(`${dir}/evrensel-dated.html`, 'utf8');
const idxs = [...body.matchAll(/MANŞETİ/gi)].map(m => m.index);
console.log('MANŞETİ geçiş noktası:', idxs.length);
for (const i of idxs) {
  const ctx = body.slice(i - 200, i + 2200);
  const imgs = [...ctx.matchAll(/(?:data-src|src)="([^"]+\.jpe?g[^"]*)"/gi)].map(m => m[1]);
  const alts = [...ctx.matchAll(/alt="([^"]{3,90})"/gi)].map(m => m[1]);
  const links = [...ctx.matchAll(/href="([^"]+)"/gi)].map(m => m[1]).filter(u => /gazete|haber|arsiv|dosya|evrensel/i.test(u));
  console.log(`\n=== index ${i} ===`);
  console.log('img:', imgs.slice(0, 4).join('\n       ') || 'yok');
  console.log('alt:', alts.slice(0, 4).join(' | ') || 'yok');
  console.log('link:', [...new Set(links)].slice(0, 4).join(' | ') || 'yok');
}
// ARKA SAYFA bölümü de dene
const idxA = body.indexOf('ARKA SAYFA');
if (idxA >= 0) {
  const ctxA = body.slice(idxA - 300, idxA + 2600);
  const imgsA = [...ctxA.matchAll(/(?:data-src|src)="([^"]+\.jpe?g[^"]*)"/gi)].map(m => m[1]);
  console.log('\n=== ARKA SAYFA ===');
  console.log('img:', imgsA.slice(0, 6).join('\n       ') || 'yok');
}
