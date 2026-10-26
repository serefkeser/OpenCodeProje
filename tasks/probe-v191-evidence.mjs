// dijitalbasin sayfa/JSON izleri + BİK MİLLİ/YENİ ASYA kart kesitleri
import fs from 'node:fs';
const dir = `${process.env.TEMP}/gazete-diag`;

const dbe = fs.readFileSync(`${dir}/dijitalbasin-EVRENSEL.html`, 'utf8');
console.log('=== dijitalbasin GetPublication izleri ===');
const gp = [...new Set([...dbe.matchAll(/["']([^"']*(?:GetPublication|PublicationsDocument|PublicationSrc)[^"']*)["']/gi)].map(m => m[1]))];
console.log(gp.slice(0, 20).join('\n') || 'yok');
console.log('\n=== Read sayfasındaki img/date şablon izleri ===');
const tmpl = [...new Set([...dbe.matchAll(/\{\{\s*([^}]{1,60})\s*\}\}/gi)].map(m => m[1]))];
console.log(tmpl.slice(0, 20).join(' | ') || 'yok');
// publication-date tüm örneklmler
const pdates = [...dbe.matchAll(/class=["']publication-date["'][^>]*>\s*([^<]{1,40})</gi)].map(m => m[1].trim());
console.log('publication-date örnekleri:', pdates.join(' | ') || 'yok');
const pnames = [...dbe.matchAll(/class=["']publication-name["'][^>]*>\s*([^<]{1,60})</gi)].map(m => m[1].trim());
console.log('publication-name örnekleri:', pnames.join(' | ') || 'yok');

// dijitalbasin Read sayfasında ilk sayfa önizesi (thumb) var mı?
const thumb = [...new Set([...dbe.matchAll(/["']([^"']*(?:thumb|Thumb|preview|small|cover)[^"']*\.(?:jpe?g|png|webp)[^"']*)["']/gi)].map(m => m[1]))];
console.log('thumb izleri:', thumb.slice(0, 6).join('\n') || 'yok');

// --- BİK MİLLİ / YENİ ASYA kart kesitleri
const bik = fs.readFileSync(`${dir}/BIK-ILKSAYFALAR.html`, 'utf8');
for (const [name, at] of [['MİLLİ', 16843], ['YENİ ASYA', 22242]]) {
  const slice = bik.slice(at - 300, at + 500);
  console.log(`\n=== BİK "${name}" bağlamı ===`);
  console.log(slice.replace(/\s+/g, ' ').slice(0, 760));
}
// kart geçişi: tüm figcaption <span> adları + tarihli alt
const cards = (function () {
  const out = [];
  const re = /<a href="(https:\/\/gazete\.bik\.gov\.tr\/first_pages\/(YYN-\d+)\.jpg)"[^>]*>([\s\S]{0,600}?)<\/a>\s*<div class="figcaption"[^>]*>\s*<span>([^<]{1,80})<\/span>/gi;
  let m; while ((m = re.exec(bik))) out.push({ jpg: m[1], code: m[2], name: m[4] });
  return out;
})();
console.log(`\nBİK kart adedi (jpg+figcaption eşleşme): ${cards.length}`);
const wanted = cards.filter(c => /KORKUSUZ|MİLLİ|YENİ ASYA|EVRENSEL|PENCERE|DİRİLİ/i.test(c.name));
console.log('istediğimiz kartlar:');
for (const c of wanted) console.log(`${c.name} -> ${c.jpg}`);
