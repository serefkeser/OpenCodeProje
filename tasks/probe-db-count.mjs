import fs from 'node:fs';
for (const label of ['EVRENSEL', 'PENCERE', 'DIRILIS']) {
  const h = fs.readFileSync(`${process.env.TEMP}/gazete-diag/dijitalbasin-${label}.html`, 'utf8');
  const names = [...h.matchAll(/class=["']publication-name["'][^>]*>\s*([^<]{1,60})</gi)].map(m => m[1].trim());
  const dates = [...h.matchAll(/class=["']publication-date["'][^>]*>\s*([^<]{1,40})</gi)].map(m => m[1].trim());
  console.log(`${label}: name-aded=${names.length} ilk="${names[0] || 'yok'}" | date-aded=${dates.length} ilk="${dates[0] || 'yok'}"`);
}
