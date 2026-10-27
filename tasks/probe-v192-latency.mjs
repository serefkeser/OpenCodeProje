// v1.192 teşhis: BİK + dijitalbasin gateway/proxy GECİKME ölçümü (browser fetch ile aynı yol)
import { execFileSync } from 'node:child_process';
const measure = (label, url) => {
  const t0 = Date.now();
  try {
    const out = execFileSync('curl.exe', ['-sS', '-o', 'NUL', '-m', '60', '-w', '%{http_code} %{time_total}', `http://127.0.0.1:4100/proxy?url=${encodeURIComponent(url)}`], { encoding: 'utf8' });
    console.log(`${label}: ${out.trim()} (toplam ${(Date.now() - t0)} ms wall)`);
  } catch (e) { console.log(`${label} HATA:`, String(e?.message || e).slice(0, 120), `(${Date.now() - t0} ms)`); }
};
measure('BIK', 'https://gazete.bik.gov.tr/Uygulamalar/GazeteIlkSayfalar?kapsam=yaygin');
measure('DB-Evrensel', 'https://www.dijitalbasin.com/Read/331/istanbul-bahcelievler-evrensel');
measure('DB-Pencere', 'https://www.dijitalbasin.com/Read/504/istanbul-besiktas-gazete-pencere');
measure('DB-Dirilis', 'https://www.dijitalbasin.com/Read/321/dirilis-postasi');
