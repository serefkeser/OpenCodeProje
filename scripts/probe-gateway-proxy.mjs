// v1.176 kanıt: gateway /proxy gerçek haber sitesini server-side çeker mi?
// Simülasyon: NewsPhotoService._fetchHtml'in lokal adayı artık bu route'a vurur.
const TEST_URL = process.argv[2] || 'https://www.nefes.com.tr/';

const r = await fetch(`http://127.0.0.1:4100/proxy?url=${encodeURIComponent(TEST_URL)}`, { signal: AbortSignal.timeout(40000) });
console.log('HTTP', r.status, '| content-type:', r.headers.get('content-type'));
if (!r.ok) { console.log(String(await r.text()).slice(0, 300)); process.exit(1); }
const html = await r.text();
console.log('uzunluk:', html.length);
console.log('HTML mi (<html|meta|head|article>):', /<(html|meta|head|article)/i.test(html));
const og = (html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)/i) || [])[1]
  || (html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)/i) || [])[1] || '';
console.log('og:image:', og ? og.slice(0, 120) : '(yok)');
// Bir makale linki kullan: og:image yoksa, ilk <article> içindeki ilk <img> al.
const img = (html.match(/<img[^>]+(?:data-src|src)=["'](https?:\/\/[^"']+\.(?:jpe?g|png|webp))/i) || [])[1];
console.log('sayfadan ilk img:', img ? img.slice(0, 120) : '(yok)');

// Görsel proxy sorun değilse: ilk görseli de gateway üzerinden çek.
if (og || img) {
  const target = og || img;
  const r2 = await fetch(`http://127.0.0.1:4100/proxy?url=${encodeURIComponent(target)}`, { signal: AbortSignal.timeout(40000) });
  const type2 = r2.headers.get('content-type');
  const buf = await r2.arrayBuffer();
  console.log('GÖRSEL: HTTP', r2.status, '| tip:', type2, '| boyut:', buf.byteLength);
}

// Güvenlik savunması: localhost hedefi reddedilmeli.
const bad = await fetch('http://127.0.0.1:4100/proxy?url=' + encodeURIComponent('http://127.0.0.1:4100/health'));
console.log('SSRF guard (127.0.0.1 hedefi):', bad.status, bad.status === 400 ? 'REDDEDILDI ✓' : 'HATA — kabul edildi!');
