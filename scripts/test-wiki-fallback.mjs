// v3 doğrulama: proper-isim başlık (± ilk kelime) → puanlı arama → Commons (App.tsx findFreeRealImage dengi)
const STOP = new Set('the and for with from this that into over under about after before more most very can will just also than then when while because through during between against without within along across behind beyond plus versus cinematic editorial illustrative illustration drawing painting artwork style detailed detail resolution quality scene scenes lighting atmosphere composition shot lens wide golden dramatic soft subtle neon accents network neural elements symbolic represent representing strong premium factual anchored art direction bespoke design news context article background foreground subject visual clearly talks including claims reported'.split(' ').filter(w => w.length > 2));

const extract = prompt => {
  const content = String(prompt || '').replace(/^[^:\n]{0,90}:\s*/, '');
  const words = content.replace(/[^A-Za-z0-9çğıöşüÇĞIİÖŞÜ\s-]/g, ' ').split(/\s+/).filter(w => w.length > 2 && !STOP.has(w.toLowerCase()));
  const capsRuns = (content.match(/(?:[A-ZÇĞİÖŞÜ][a-zçğıöşüâîöü]{2,})(?:\s+[A-ZÇĞİÖŞÜ][a-zçğıöşüâîöü]{2,}){0,3}/g) || []).map(s => s.trim()).filter(Boolean);
  capsRuns.sort((a, b) => b.length - a.length);
  const candidateTitle = capsRuns[0] || null;
  const query = [...new Set([...(candidateTitle ? candidateTitle.split(/\s+/) : []), ...words])].slice(0, 4).join(' ').trim();
  return { candidateTitle, query };
};

const pageImageUrl = d => d?.query?.pages ? Object.values(d.query.pages).map(x => x?.thumbnail?.source).filter(Boolean)[0] || null : null;

const testPrompts = [
  'Cumhurbaşkanı Recep Tayyip Erdoğan with ministers, dramatic lighting',
  'Cumhurbaşkanı Recep Tayyip Erdoğan with ministers, dramatic lighting',
  'İstanbul hava durumu kar yağışı metro',
  'Turkish lira abstract financial stress scene',
];

for (const p of testPrompts) {
  const { candidateTitle, query } = extract(p);
  console.log(`title="${candidateTitle}" | sorgu="${query}"`);
  let found = null;
  const tryUrl = async (name, url) => {
    if (found) return;
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(20000) });
      const u = r.ok ? pageImageUrl(await r.json()) : null;
      console.log(`  ${name}: ${u ? 'OK ' + u.slice(0, 88) : '(yok)'}`);
      if (u) found = u;
    } catch (e) { console.log(`  ${name} ERR`, String(e?.message || e).slice(0, 50)); }
  };
  const titles = [...new Set([candidateTitle, candidateTitle && candidateTitle.split(/\s+/).length > 2 ? candidateTitle.split(/\s+/).slice(1).join(' ') : null].filter(Boolean))];
  for (const t of titles) await tryUrl(`başlık="${t}"`, `https://tr.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(t)}&redirects=1&prop=pageimages&piprop=thumbnail&pithumbsize=1280&format=json`);
  if (!found) await tryUrl('arama', `https://tr.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrnamespace=0&gsrlimit=1&prop=pageimages&piprop=thumbnail&pithumbsize=1280&format=json`);
  if (!found) {
    try {
      const r = await fetch(`https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=filetype:bitmap+${encodeURIComponent(query)}&gsrnamespace=6&gsrlimit=2&prop=imageinfo&iiprop=url|size|mime&iiurlwidth=1280&format=json`, { signal: AbortSignal.timeout(20000) });
      const d = r.ok ? await r.json() : null;
      const ii = Object.values(d?.query?.pages || {}).map(x => x?.imageinfo?.[0]).filter(z => z?.mime?.startsWith('image/'))[0];
      const u = ii ? (ii.thumburl || ii.url) : null;
      console.log(`  commons: ${u ? 'OK ' + u.slice(0, 88) : '(yok)'}`);
      if (u) found = u;
    } catch (e) { console.log('  commons ERR', String(e?.message || e).slice(0, 50)); }
  }
  if (found) {
    const img = await fetch(found, { signal: AbortSignal.timeout(30000) });
    const buf = await img.arrayBuffer();
    console.log(`  indirme check: HTTP ${img.status}, ${Math.round(buf.byteLength / 1024)} KB, ${img.headers.get('content-type')}`);
  } else console.log('  SONUÇ: null → prosedürel yedek');
  console.log('—');
}
