// FlareSolverr tabs_till_verify denemesi: Tab sayısını arttırarak Turnstile doğrulama
const FS = 'http://127.0.0.1:8191';
const call = async (payload, timeoutMs = 150000) => {
  const res = await fetch(`${FS}/v1`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload), signal: AbortSignal.timeout(timeoutMs) });
  return res.json();
};
const check = (label, data) => {
  const sol = data.solution || {};
  const html = String(sol.response || '');
  const title = (/<title>([^<]*)<\/title>/i.exec(html) || [])[1] || '';
  const cards = [...new Set([...html.matchAll(/gazeteler\/([a-z0-9-]+)/gi)].map(m => m[1]))];
  console.log(`${label}: status=${data.status} mesaj=${data.message || '-'} HTTP=${sol.status ?? '-'} boyut=${html.length} kart=${cards.length} tt=${sol.turnstile_token ? 'VAR' : 'yok'} cf-cookie=${(sol.cookies || []).map(c => c.name).filter(n => /clearance/i.test(n)).join(',') || '-'}`);
  return { html, cards, title };
};

for (const tabs of [1, 2, 3]) {
  try {
    const d = await call({ cmd: 'request.get', url: 'https://www.gazeteoku.com/gazeteler', session: 'gazete', maxTimeout: 120000, tabs_till_verify: tabs });
    const r = check(`GazeteOku tabs=${tabs}`, d);
    if (r.cards.length > 3) {
      const fs = await import('node:fs');
      fs.writeFileSync(`${process.env.TEMP}/gazete-diag/oku-flare-tv${tabs}.html`, r.html, 'utf8');
      console.log(`GOVDE site listesi alindi; sayfa kaydedildi (tab=${tabs})`);
      break;
    }
  } catch (e) { console.log(`tabs=${tabs} istisna:`, String(e.message || e).slice(0, 160)); }
}
