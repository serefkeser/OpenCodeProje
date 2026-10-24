const r = await fetch(`http://127.0.0.1:4100/proxy?url=${encodeURIComponent('https://www.nefes.com.tr/')}`, { signal: AbortSignal.timeout(40000) });
const home = await r.text();
const hrefs = [...home.matchAll(/href=["']([^"']+nefes\.com\.tr\/[^"']+)["']/gi)].map(m => m[1])
  .filter(s => /\/\d{4,}|-\d{4,}\.[a-z]+$/i.test(s) || /haber|sondakika|gundem/i.test(s))
  .filter((v, i, a) => a.indexOf(v) === i);
console.log('tum aday sayisi:', hrefs.length);
console.log(hrefs.slice(0, 8).join('\n'));
