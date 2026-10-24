// Gerçek makale sayfası: /proxy ile çek, og:image'ı SQL escaperek değil düz match al.
const ARTICLE = 'https://www.nefes.com.tr/abdde-850-adet-f-35-icin-dev-anlasma-imzalandi-haberi-reuters-gecti-160250';
const rr = await fetch(`http://127.0.0.1:4100/proxy?url=${encodeURIComponent(ARTICLE)}`, { signal: AbortSignal.timeout(40000) });
const html = await rr.text();
const og = (html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)/i) || [])[1] || '';
const imgs = [...html.matchAll(/(?:data-src|data-original|src)=["'](https?:\/\/img\.nefes\.com\.tr\/[^"']+\.(?:jpe?g|png|webp)[^"']*)["']/gi)].map(m => m[1]);
const txt = html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
console.log('HTTP', rr.status, '| uzunluk:', html.length, '| metin uzunluğu:', txt.length);
console.log('og:image:', og || '(yok)');
console.log('img aday sayısı:', imgs.length, '| ilk 2:', imgs.slice(0, 2).map(s => s.slice(0, 100)));
// og:image gerçekten indirilebilir mi (gateway üzerinden)?
if (/^https?:/i.test(og)) {
  const r2 = await fetch(`http://127.0.0.1:4100/proxy?url=${encodeURIComponent(og)}`, { signal: AbortSignal.timeout(40000) });
  const buf = await r2.arrayBuffer();
  console.log('og:image indirme: HTTP', r2.status, '| tip:', r2.headers.get('content-type'), '| boyut:', buf.byteLength);
}
