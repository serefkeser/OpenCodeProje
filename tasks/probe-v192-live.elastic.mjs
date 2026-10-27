import { execFileSync } from 'node:child_process';
const probe = async (label, url, timeoutMs = 45000) => {
  try {
    const out = execFileSync('curl.exe', ['-sS', '-m', String(Math.ceil(timeoutMs / 1000)), '-w', '\n__HTTP %{http_code}', `http://127.0.0.1:4100/proxy?url=${encodeURIComponent(url)}`], { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
    const code = (/__HTTP (\d+)/.exec(out) || [])[1] || '?';
    const body = out.replace(/\n__HTTP \d+\s*$/, '');
    console.log(`${label} -> HTTP ${code} boyut=${body.length}`);
    return { code, body };
  } catch (e) { console.log(`${label} HATA:`, String(e?.message || e).slice(0, 140)); return null; }
};
const mark = (label, body) => {
  if (!body) return console.log(`${label} gövde yok`);
  const name = (body.match(/class=["']publication-name["'][^>]*>\s*([^<]{1,60})</i) || [])[1] || null;
  const date = (body.match(/class=["']publication-date["'][^>]*>\s*([^<]{1,40})</i) || [])[1] || null;
  const iso = (body.match(/20\d\d-\d\d-\d\d/) || [])[0] || null;
  const trDate = (body.match(/\d{1,2}\s+Ekim\s+2026/i) || [])[0] || null;
  const fig = body.match(/first_pages\/YYN-\d+/gi)?.length || 0;
  console.log(`${label}: publication-name="${name}" date="${date}"; TR-tarih="${trDate}"; YYN-kart=${fig}`);
};
const targets = [
  ['BIK-gateway', 'https://gazete.bik.gov.tr/Uygulamalar/GazeteIlkSayfalar?kapsam=yaygin'],
  ['DB-Evrensel-gateway', 'https://www.dijitalbasin.com/Read/331/istanbul-bahcelievler-evrensel'],
  ['DB-Pencere-gateway', 'https://www.dijitalbasin.com/Read/504/istanbul-besiktas-gazete-pencere'],
  ['DB-Dirilis-gateway', 'https://www.dijitalbasin.com/Read/321/dirilis-postasi']
];
for (const [label, url] of targets) {
  const r = await probe(label, url);
  if (r) mark(label, r.body);
}
