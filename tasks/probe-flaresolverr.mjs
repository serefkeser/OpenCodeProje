// FlareSolverr Turnstile çözüm denemesi: GazeteOku + Aydınlık
const FS = 'http://127.0.0.1:8191';
const call = async (payload, timeoutMs = 110000) => {
  const res = await fetch(`${FS}/v1`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload), signal: AbortSignal.timeout(timeoutMs) });
  return res.json();
};
const check = (label, data) => {
  const sol = data.solution || {};
  const html = String(sol.response || '');
  const title = (/<title>([^<]*)<\/title>/i.exec(html) || [])[1] || '';
  const cards = [...new Set([...html.matchAll(/gazeteler\/([a-z0-9-]+)/gi)].map(m => m[1]))];
  console.log(`${label}: status=${data.status} mesaj=${data.message || '-'} HTTP=${sol.status ?? '-'} boyut=${html.length} kart=${cards.length} turnstileToken=${sol.turnstile_token ? 'VAR' : 'yok'} cookie=${(sol.cookies || []).map(c => c.name).filter(n => /cf|clearance/i.test(n)).join(',') || '-'}`);
  return { html, cards, title };
};

try {
  // Görev 0: kalıcı session
  const s = await call({ cmd: 'sessions.create', session: 'gazete' });
  console.log('session:', s.status, s.message || '');
} catch (e) { console.log('session hata:', String(e.message || e).slice(0, 140)); }

// Deneme 1: session ile GazeteOku (turnstile doğrulama denemesi: tabs_till_verify)
try {
  const d = await call({ cmd: 'request.get', url: 'https://www.gazeteoku.com/gazeteler', session: 'gazete', maxTimeout: 90000 });
  check('DENE1 GazeteOku session', d);
} catch (e) { console.log('DENE1 istisna:', String(e.message || e).slice(0, 140)); }

// Deneme 2: ikinci çağrı — clearance cookie tutulduysa gerçek sayfa gelir mi?
try {
  const d2 = await call({ cmd: 'request.get', url: 'https://www.gazeteoku.com/gazeteler', session: 'gazete', maxTimeout: 90000 });
  const r = check('DENE2 GazeteOku tekrar', d2);
  if (r.cards.length) { const fs = await import('node:fs'); fs.writeFileSync(`${process.env.TEMP}/gazete-diag/oku-flare2.html`, r.html, 'utf8'); console.log('DENE2 govde kaydedildi'); }
} catch (e) { console.log('DENE2 istisna:', String(e.message || e).slice(0, 140)); }

// Deneme 3: Aydınlık
try {
  const d3 = await call({ cmd: 'request.get', url: 'https://www.aydinlik.com.tr/gazete-mansetleri', session: 'gazete', maxTimeout: 90000 });
  const r = check('DENE3 Aydinlik', d3);
  if (r.cards.length > 3) { const fs = await import('node:fs'); fs.writeFileSync(`${process.env.TEMP}/gazete-diag/ayd-flare.html`, r.html, 'utf8'); console.log('DENE3 govde kaydedildi'); }
} catch (e) { console.log('DENE3 istisna:', String(e.message || e).slice(0, 140)); }
