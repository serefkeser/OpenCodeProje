// BİK kart yapısı (figcaption/adlar) + dijitalbasin GetPublicationDisplay API dahlı
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
const dir = `${process.env.TEMP}/gazete-diag`;

// --- 1) BİK: ilk <figure> bloklarını dök
const bik = fs.readFileSync(`${dir}/BIK-ILKSAYFALAR.html`, 'utf8');
const figs = [...bik.matchAll(/<figure[\s\S]{0,1200}?<\/figure>/gi)].map(m => m[0]);
console.log(`BİK figure adedi: ${figs.length}`);
console.log((figs[0] || '<figure yok>').replace(/\s+/g, ' ').slice(0, 900));
// kartlarda AD VAR MI: itemprop name / text
const nameScopes = [...bik.matchAll(/itemprop=["']name["'][^>]*>([^<]{2,60})</gi)].map(m => m[1].trim());
console.log('\nBİK itemprop=name:', [...new Set(nameScopes)].slice(0, 25).join(' | ') || 'yok');
// sayfa içinde genel gazete adı aramaları (başka yerde mi?)
for (const name of ['KORKUSUZ', 'MİLLİ', 'YENİ ASYA', 'AS YA', 'KORKUS']) {
  const re = new RegExp(name.replace(' ', '[\\s\\u00a0]*'), 'i');
  const i = bik.search(re);
  console.log(`BİK "${name}": ${i >= 0 ? `VAR @${i}` : 'YOK'}`);
}

// --- 2) dijitalbasin GetPublicationDisplay (Evrensel=331, Pencere=504, Diriliş=321)
for (const [label, id] of [['EVRENSEL', 331], ['PENCERE', 504], ['DIRILIS', 321]]) {
  const url = `https://www.dijitalbasin.com/PublicationsDocument/GetPublicationDisplay?publicationId=${id}`;
  try {
    const out = execFileSync('curl.exe', ['-sS', '-m', '45', '-i', `http://127.0.0.1:4100/proxy?url=${encodeURIComponent(url)}`], { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024, input: Buffer.alloc(0) }).toString();
    const body = out.split('\r\n\r\n').slice(1).join('\r\n\r\n') || out.slice(out.indexOf('\n\n') + 2);
    console.log(`\n### dijitalbasin ${label} (${id}) boyut=${body.length}`);
    console.log('ilk 400:', body.replace(/\s+/g, ' ').slice(0, 400));
    const imgs = [...new Set([...body.matchAll(/["']([^"']*\.(?:jpe?g|png|webp|pdf)[^"']*)["']/gi)].map(m => m[1]))];
    console.log('medya adayları:', imgs.slice(0, 8).join('\n') || 'yok');
    fs.writeFileSync(`${dir}/db-${label}-${id}.txt`, out, 'utf8');
  } catch (e) { console.log(`### ${label} HATA:`, String(e?.message || e).slice(0, 160)); }
}
