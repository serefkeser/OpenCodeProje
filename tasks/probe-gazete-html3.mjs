import fs from 'node:fs';
const dir = `${process.env.TEMP}/gazete-diag`;
const gzt = fs.readFileSync(`${dir}/gzt.html`, 'utf8');
const go = fs.readFileSync(`${dir}/gazeteoku.html`, 'utf8');
const ayd = fs.readFileSync(`${dir}/aydinlik.html`, 'utf8');
const strip = (s) => s.replace(/<script\b[\s\S]*?<\/script>/gi, ' ');

// 1) GZT HTML içinde gazete isimleri geçiyor mu (json/RSC)?
const names = ['hurriyet', 'sabah', 'sozcu', 'sok', 'tahsin', 'cilveta', 'milliyet', 'yeni mesaj', 'aksu', 'evrensel', 'karşı', 'africa', 'aydinlik'];
console.log('== GZT — gazete isim adları (ham+kaçış hızlı) ==');
for (const n of names) {
  const pos = [gzt.indexOf(n), gzt.indexOf(n.replace(/i/g, '\\u0130')), gzt.replace(/\\u00fc|\\u0131/g, v => v === '\\u00fc' ? 'ü' : 'ı').indexOf(n)];
  const found = pos.filter(p => p >= 0);
  if (found.length) console.log(`  ${n} @ ${found.slice(0,2).join(',' )}`);
  const c = (gzt.toLowerCase().match(new RegExp(n.replace(/[^a-z0-9]/g, m => '\\' + m), 'g')) || []).length;
  if (c) console.log(`  ${n}: ${c} geçiş`);
}

// 2) Next.js/RSC JSON bölgesinde tarih kanıtı
const zi = gzt.indexOf('selectedDate');
console.log(`\nGZT selectedDate konumu: ${zi}`);
if (zi >= 0) {
  const region = gzt.slice(Math.max(0, zi - 500), zi + 5000);
  console.log(region.slice(0, 3000).replace(/\\u00fc/g, 'ü').replace(/\\u0131/g, 'ı').replace(/\\u00e7/g, 'ç').replace(/\\u015f/g, 'ş').replace(/\\u00f6/g, 'ö').replace(/\\u0130/g, 'İ').replace(/\\u011f/g, 'ğ'));
}

// 3) GazeteOku: hurriyet kartı tarihini ve solver URL'leri sembolik kontrol
console.log('\n== GazeteOku: satırda tarih belirtilen kartlar ==');
const cardRe = /<a[^>]+href=["'](https:\/\/www\.gazeteoku\.com\/gazeteler\/[^"']+)["'][^>]*>([\s\S]{0,400}?)<\/a>/gi;
let m; let count = 0;
while ((m = cardRe.exec(go)) && count < 8) {
  const t = m[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  if (/\d{1,2}\s+\w+\s+\d{4}/.test(t)) { count++; console.log(`  ${m[1].slice(38, 110)} → ${t.slice(0, 70)}`); }
}
console.log(`  (tarihli metin içeren bağlantı: ${count} — toplam /gazeteler/ anchor coi: ${(go.match(/href=["'][^"']*\/gazeteler\/[^"']+["']/gi) || []).length})`);

// 4) Aydınlık: marker ları ve Listele '{date}' template
console.log('\n== Aydınlık: Listele hrefleri ==');
const listRe = /href=["']([^"']*\{date\}[^"']*)["']/gi;
const listHits = [...ayd.matchAll(listRe)].slice(0, 3);
console.log(listHits.map(h => h[1]).join(' | ') || 'template {date} href yok');
const todayHref = [...ayd.matchAll(/href=["']([^"']*gazete-mansetleri[^"']*)["']/gi)].map(m => m[1]);
console.log('  gazete-mansetleri hrefleri:', [...new Set(todayHref)].slice(0, 6).join(' | '));
