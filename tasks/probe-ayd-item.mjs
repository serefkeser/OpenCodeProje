// Aydınlık (dün anlık görüntüsü) newspaper-item başlıklarını çıkar + gri gazete Sarıdalılık
import fs from 'node:fs';
const a = fs.readFileSync(`${process.env.TEMP}/gazete-diag/aydinlik.html`, 'utf8');

const items = [...a.matchAll(/<a[^>]*title="([^"]{3,90})"[^>]*>[^<]*(?:<img[^>]*)?/gi)]
  .map(m => m[1])
  .filter(t => /gazete|manset|sayfa/i.test(t));
const uniq = [...new Set(items)];
console.log('title aday sayısı:', uniq.length);
for (const w of ['analiz', 'pencere', 'ekonomi', 'gunboyu', 'dunya', 'evrensel', 'tavir', 'birgun', 'sok']) {
  const hit = uniq.filter(t => t.toLowerCase().includes(w));
  console.log(w.padEnd(10), hit.length ? hit.slice(0, 2).join(' | ') : 'yok');
}
const storage = [...a.matchAll(/storage\/newspapers\/(2026-\d\d-\d\d)/g)].map(m => m[1]);
console.log('storage tarihleri:', [...new Set(storage)].join(', '));
console.log('\\n-- Örnek ilk 30 başlık --');
console.log(uniq.slice(0, 30).join(' | '));
