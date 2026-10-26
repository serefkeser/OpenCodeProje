// kaydedilmiş HTML'lerde gazete adı ↔ görsel eşleşme + dijitalbasin veri izi
import fs from 'node:fs';
const dir = `${process.env.TEMP}/gazete-diag`;

// --- BİK: adların görüldüğü bağlamı dök (img src + title/alt)
const bik = fs.readFileSync(`${dir}/BIK-ILKSAYFALAR.html`, 'utf8');
for (const name of ['Korkusuz', 'Milli Gazete', 'Yeni Asya', 'Evrensel', 'Pencere', 'Dirili']) {
  const idx = bik.indexOf(name);
  console.log(`BIK "${name}": ${idx >= 0 ? `VAR (index ${idx})` : 'YOK'}`);
  if (idx >= 0) console.log(bik.slice(Math.max(0, idx - 320), idx + 320).replace(/\s+/g, ' ').slice(0, 600));
  console.log('');
}
// img ↔ yakın ad bağlamı
const imgCtx = [];
for (const m of bik.matchAll(/<img[^>]*>/gi)) {
  const src = /src=["']([^"']+)["']/.exec(m[0])?.[1] || '';
  if (!/first_pages/.test(src)) continue;
  const ctx = bik.slice(Math.max(0, m.index - 240), m.index + 240);
  const alt = /alt=["']([^"']{2,60})["']/.exec(m[0])?.[1] || '';
  const titleAttr = /title=["']([^"']{2,60})["']/.exec(m[0])?.[1] || '';
  imgCtx.push({ src, alt, titleAttr, ctx: ctx.replace(/\s+/g, ' ').slice(0, 220) });
}
console.log(`BIK first_pages img adedi: ${imgCtx.length}`);
console.log(imgCtx.slice(0, 5).map(c => `src=${c.src}\nalt=${c.alt} | title=${c.titleAttr}\nctx=${c.ctx}`).join('\n---\n'));

// --- dijitalbasin: tarih + sayfa verisi izleri
const dbe = fs.readFileSync(`${dir}/dijitalbasin-EVRENSEL.html`, 'utf8');
console.log('\n=== dijitalbasin EVRENSEL veri izleri ===');
const idx6 = dbe.indexOf('26 Ekim 2026');
if (idx6 >= 0) console.log('tarih bağlamı:', dbe.slice(Math.max(0, idx6 - 300), idx6 + 300).replace(/\s+/g, ' ').slice(0, 500));
const pdfs = [...new Set([...dbe.matchAll(/["']([^"']*\.pdf[^"']*)["']/gi)].map(m => m[1]))];
console.log('pdf izleri:', pdfs.slice(0, 6).join('\n') || 'yok');
const scripHits = [...new Set([...dbe.matchAll(/(?:__NEXT_DATA__|__NUXT__|window\.__[A-Z_]+|application\/json)/gi)].map(m => m[0]))];
console.log('json izleri:', scripHits.join(' | ') || 'yok');
const apiHits = [...new Set([...dbe.matchAll(/["']((?:\/|https?:\/\/)[^"']*(?:read|Read|image|Image|page|Sayfa|sayfa|DijitalBasin)[^"']*)["']/gi)].map(m => m[1]))].filter(u => !/\.(png|jpg|css|js)$/.test(u));
console.log('api/rota izleri:', [...new Set(apiHits)].slice(0, 12).join('\n') || 'yok');
