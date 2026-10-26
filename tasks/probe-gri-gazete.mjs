// v1.188 tanı: gri gazeteler hangi kaynakta var?
import fs from 'node:fs';
const dir = `${process.env.TEMP}/gazete-diag`;
const g = fs.readFileSync(`${dir}/gazetemanset.gzt.com.html`, 'utf8');

const clues = {
  'BirGün': ['birgun'],
  'Dünya': ['dunya'],
  'Evrensel': ['evrensel'],
  'Analiz Gazetesi': ['analiz'],
  'Gazete Pencere': ['pencere'],
  'Nasıl Bir Ekonomi': ['ekonomi', 'nasilbir'],
  'Tavır Gazetesi': ['tavir'],
  'Dokuz Sütun': ['dokuz'],
  'Güneş': ['gunes'],
  'Yeni Yüzyıl': ['yuzyil', 'yuzil'],
};

console.log('== GZT (bugün kaydedilen SSR) slug varlığı ==');
for (const [name, keys] of Object.entries(clues)) {
  const hits = [];
  for (const k of keys) {
    for (const m of g.matchAll(new RegExp(`[a-z0-9/\\-]*${k}[a-z0-9/\\-]*`, 'gi'))) hits.push(m[0]);
  }
  const uniq = [...new Set(hits)].filter(s => /[-/]/.test(s));
  console.log(`${name.padEnd(18)}: ${uniq.length ? uniq.slice(0, 4).join(' | ') : 'YOK'}`);
}

console.log('\n== GZT içinde API/uç adayları ==');
const apiHits = [...g.matchAll(/"(\/(?:api|_next\/data|services|tr\/api)[^"]{4,110})"/g)]
  .map(m => m[1])
  .filter(u => /json|gazete|news|paper|manse|date|category/i.test(u));
console.log([...new Set(apiHits)].slice(0, 20).join('\n') || 'aday bulunamadı');

// Next.js _next/data buildId da araması
const buildId = /"buildId":"([^"]+)"/.exec(g)?.[1] || /buildId\\":\\"([^\\]+)\\"/.exec(g)?.[1];
console.log(`\nbuildId: ${buildId || 'okunamadı'}`);
const rscDate = (g.match(/selectedDate[^"]{0,6}"[^"]*2026-\d\d-\d\d/) || [])[0];
console.log(`RSC selectedDate: ${rscDate || 'yok'}`);

// GazeteOku (dün anlık görüntüsü; CF öncesi) — kart adlarından gri gazete var mı
const go = fs.readFileSync(`${dir}/gazeteoku.html`, 'utf8');
console.log('\n== GazeteOku (dün anlık görüntüsü; CF öncesi) kart adlarından gri gazete var mı ==');
for (const [name, keys] of Object.entries(clues)) {
  const hit = keys.filter(k => new RegExp(`gazeteler\\/[a-z0-9\\-]*${k}`, 'i').test(go));
  console.log(`${name.padEnd(18)}: ${hit.length ? 'VAR (slug: /gazeteler/...' + hit.join('|') + ')' : 'yok'}`);
}
