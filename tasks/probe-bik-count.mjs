import fs from 'node:fs';
const b = fs.readFileSync(`${process.env.TEMP}/gazete-diag/BIK-ILKSAYFALAR.html`, 'utf8');
const re = /<a href="(https:\/\/gazete\.bik\.gov\.tr\/first_pages\/(YYN-\d+)\.jpg)"[^>]*>([\s\S]{0,600}?)<\/a>\s*<div class="figcaption"[^>]*>\s*<span>([^<]{1,80})<\/span>/gi;
let m, c = 0, dated = 0; const names = [];
while ((m = re.exec(b))) {
  c++;
  const alt = (/alt="([^"]{0,160})"/.exec(m[3]) || [])[1] || '';
  if (/tarihli/i.test(alt)) { dated++; names.push(m[4].trim()); }
}
console.log('kart:', c, '| alt-tarihli:', dated);
console.log(names.join(' | '));
