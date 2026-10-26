// evrensel ?date=2026-10-26 sayfasındaki manşet kartları: img + tarih + başlık eşleşmesi
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
const dir = `${process.env.TEMP}/gazete-diag`;
const DATE = '2026-10-26';
const target = `https://www.evrensel.net/gazete?date=${DATE}`;
const body = execFileSync('curl.exe', ['-sS', '-m', '40', `http://127.0.0.1:4100/proxy?url=${encodeURIComponent(target)}`], { encoding: 'utf8', maxBuffer: 6 * 1024 * 1024 });
fs.writeFileSync(`${dir}/evrensel-dated.html`, body, 'utf8');

// manşet görselleri: favicons hariç
const imgs = [...new Set([...body.matchAll(/(?:data-src|src)="(https?:\/\/[^"]+\.(?:jpe?g|png|webp)[^"]*)"/gi)].map(m => m[1]).filter(u => !/favicon|icon|avatar/i.test(u)))];
console.log(`manset aday img: ${imgs.length}`);
console.log(imgs.slice(0, 8).join('\n'));

// img veya yakın bağlamında tarih geçen adet
const ctxHits = [];
for (const m of body.matchAll(/<img[^>]+(?:data-src|src)="([^"]+)"/gi)) {
  const ctx = body.slice(Math.max(0, m.index - 500), m.index + 700);
  if (/evrensel.*\.net\/(?:dosya|storage|media)\/[^"]*(?:gazete|paper)/i.test(m[1]) || /Gazete|manşet|MANŞET/i.test(ctx) && /2026-10-26|26.10.2026|26 Ekim/i.test(ctx)) {
    ctxHits.push(m[1]);
  }
}
console.log(`\ntarih-baglamsal manşet img: ${ctxHits.length}`);
console.log([...new Set(ctxHits)].slice(0, 6).join('\n'));

// tarih nedneyi geçiyor
const dateForms = [...new Set([...body.matchAll(/26[./-]10[./-]2026|2026-10-26|26 Ekim\s*2026/gi)].map(m => m[0]))];
console.log('\ntarih formları:', dateForms.join(' | '));
