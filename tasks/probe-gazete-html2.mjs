import fs from 'node:fs';
const dir = `${process.env.TEMP}/gazete-diag`;
const html = (f) => fs.readFileSync(`${dir}/${f}`, 'utf8');
const strip = (s) => s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

// GZT: '25 ekim 2026' ve '2026-10-25' çevresi
const gzt = html('gzt.html');
for (const needle of ['25 Ekim 2026', '2026-10-25']) {
  let i = -1, n = 0;
  while ((i = gzt.indexOf(needle, i + 1)) >= 0 && n < 4) {
    n++;
    console.log(`\n[GZT '${needle}' @${i}]`);
    console.log('  ÖNCE: ' + strip(gzt.slice(Math.max(0, i - 500), i)).slice(-160));
    console.log('  İMGE/KAPAK SONRA: ' + strip(gzt.slice(i - 500, i + 700)).match(/<img\b[^>]*>/gi)?.map(m => m.slice(0, 260)).join(' || ').slice(0, 600) || 'img yakınında yok');
  }
  void i;
}

// GZT img alts
const gztImgs = [...gzt.matchAll(/<img\b[^>]*alt=["']([^"']*)["'][^>]*>/gi)].map(m => m[1]);
console.log(`\nGZT img altlar (${gztImgs.length}):`, gztImgs.slice(0, 10).join(' | '));

// GazeteOku: bir gazete kartının tam yapısı
const go = html('gazeteoku.html');
const hurriyetPos = go.indexOf('hurriyet-gazetesi-manseti');
console.log('\n[GazeteOku hurriyet kart bölgesi]');
console.log(strip(go.slice(Math.max(0, hurriyetPos - 700), hurriyetPos + 900)).slice(0, 900));

// Aydınlık: newspaper-item bloğu
const ayd = html('aydinlik.html');
const itemPos = ayd.indexOf('newspaper-item');
console.log('\n[Aydınlık newspaper-item ilk blok]');
console.log(strip(ayd.slice(itemPos - 100, itemPos + 1500)).slice(0, 1200));
// storage/newspapers hangi tarihlerde geçiyor?
const stgAll = [...ayd.matchAll(/\/storage\/newspapers\/(20\d{2}-\d{2}-\d{2})\//g)].map(m => m[1]);
console.log(`Aydınlık storage tarih kümeleri: ${[...new Set(stgAll)].join(', ')}`);
