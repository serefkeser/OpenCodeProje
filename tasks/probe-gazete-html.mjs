// v1.186 tanı: GAZETE_MANIFEST_VERIFY neden eşik altı? HTML analizi.
import fs from 'node:fs';

const dir = `${process.env.TEMP}/gazete-diag`;
const files = ['gzt.html', 'gazeteoku.html', 'aydinlik.html'];
const SELECTED = '2026-10-25';

const norm = s => String(s || '').toLocaleLowerCase('tr-TR').replace(/[ıİ]/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c').replace(/[^\S\r\n]+/g, ' ').replace(/[\r\n]+/g, ' ');

// gazeteValueMatchesDate benzeri: tarih varyantları
const variants = [SELECTED, '25.10.2026', '25/10/2026', '25-10-2026', '25 ekim 2026', '25.10.2026'].map(norm);

for (const f of files) {
  const html = fs.readFileSync(`${dir}/${f}`, 'utf8');
  console.log(`\n===== ${f} (${html.length} bayt) =====`);
  for (const v of variants) {
    const c = norm(html).split(v).length - 1;
    if (c) console.log(`  tarih varyant '${v}': ${c} geçiş`);
  }
  // href analizi
  const hrefs = [...html.matchAll(/href=["']([^"']+)["']/gi)].map(m => m[1]);
  const withDate = hrefs.filter(h => variants.some(v => norm(decode(h)).includes(v)));
  const gazeteler = hrefs.filter(h => /gazeteler/i.test(h));
  console.log(`  href toplam: ${hrefs.length}; tarih-proven href: ${withDate.length} (kanka örnekler: ${withDate.slice(0, 3).join(' | ')})`);
  console.log(`  'gazeteler' geçen href: ${gazeteler.length} (örnekler: ${[...new Set(gazeteler.slice(0, 4))].join(' | ')})`);
  // img alt/title analizi
  const imgs = [...html.matchAll(/<img\b[^>]*(?:alt|title)=["']([^"']+)["'][^>]*>/gi)].map(m => m[1]);
  const imgWithDate = imgs.filter(t => variants.some(v => norm(decode(t)).includes(v)));
  console.log(`  img alt/title toplam: ${imgs.length}; tarih-proven: ${imgWithDate.length} (örnekler: ${[...new Set(imgWithDate)].slice(0, 5).join(' | ')})`);
  // storage/newspapers/date (Aydınlık yapısı)
  const stg = html.split(`/storage/newspapers/${SELECTED}/`).length - 1;
  if (stg) console.log(`  /storage/newspapers/${SELECTED}/ geçiş: ${stg}`);
  // aydinlik newspaper-item a[title]
  if (f === 'aydinlik.html') {
    const items = [...html.matchAll(/newspaper-item/gi)].length;
    const tAnchor = [...html.matchAll(/<a\b[^>]*title=["'][^"']+["'][^>]*>/gi)].length;
    console.log(`  .newspaper-item görünümleri: ${items}; a[title] anchor: ${tAnchor}`);
  }
  // GZT tüm anchor card örneği: tarih-proven href'lerdeki kart metninden isim çıkarımı
  if (f === 'gzt.html' && withDate.length) {
    console.log('  --- GZT tarih-proven kartları (ilk 8) ---');
    for (const h of withDate.slice(0, 8)) {
      const pos = html.indexOf(decode(h));
      const around = html.slice(Math.max(0, pos - 300), pos + 500).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      console.log(`   ${decode(h).slice(0, 90)} → ~metin: ${around.slice(0, 180)}`);
    }
  }
}

function decode(s) { return String(s || '').replace(/\\u0026/gi, '&').replace(/&amp;/gi, '&').replace(/\\\//g, '/'); }
