// Hangi google_search çağrı sitesi responseMimeType ile BİRLİKTE payload kullanıyor?
import { readFileSync } from 'node:fs';
const src = readFileSync('web/src/App.tsx', 'utf8').split('\n');
for (const ln of [3905, 3998, 4267, 4405, 4487, 4712]) {
  let verdict = '?';
  for (let j = ln - 1; j >= ln - 45; j--) {
    const l = src[j - 1] || '';
    if (/responseMimeType/.test(l)) { verdict = `tools+JSON MİME BİRLİKTE (mime satırı ${j})`; break; }
    if (/\bconst .*payload|body: JSON\.stringify/.test(l)) { verdict = 'yakın payload bloğu içinde mime yok (sadece tools)'; break; }
  }
  console.log(`satır ${ln}: ${verdict}`);
}
