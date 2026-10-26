// v1.188 tanı: verifyNewsFromImage neden grounding döndürmüyor? A/B ölçümü.
// A: birebir canlı istek şekli (görsel+tools+systemInstruction+maxOutputTokens:2000)
// B: aynı istek, maxOutputTokens: 8000
// C: yalnız-metin (görsel yok) + tools — google_search boundingFirep çalışıyor mu?
// Kimligi değiştirmez: yalnız okuma; yanıt durumu/finishReason/promptFeedback/usage ölç.
import fs from 'node:fs';

const KEY = process.env.GEMINI_API_KEY;
if (!KEY) { console.error('GEMINI_API_KEY yok (.env)'); process.exit(1); }
const MODEL = 'gemini-2.5-flash';
const URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${KEY}`;

// Gerçek bir haber görseli: GZT anlık görüntüsünden BirGün tarihli ön sayfa görseli.
const dir = `${process.env.TEMP}/gazete-diag`;
const gzt = fs.readFileSync(`${dir}/gazetemanset.gzt.com.html`, 'utf8');
const imgUrls = [...new Set([...gzt.matchAll(/https?:\/\/[^\s"'<>]+\/birgun[^\s"'<>]*\.(?:jpe?g|png|webp)/gi)].map(m => m[0]))];
let b64 = null, mimeType = 'image/jpeg';
if (imgUrls.length) {
  const res = await fetch(`http://127.0.0.1:4100/proxy?url=${encodeURIComponent(imgUrls[0])}`);
  if (res.ok) {
    const buf = Buffer.from(await res.arrayBuffer());
    const type = (res.headers.get('content-type') || 'image/jpeg').split(';')[0];
    if (/^image\//.test(type) && buf.length > 2048) {
      b64 = buf.toString('base64');
      mimeType = type;
      console.log(`Test görseli: ${imgUrls[0]} (${buf.length} byte, ${type})`);
    }
  }
}
if (!b64) {
  // yedek: daha küçük herhangi bir manset görseli
  const any = [...new Set([...gzt.matchAll(/https?:\/\/[^\s"'<>]+\.(?:jpe?g|png|webp)/gi)].map(m => m[0]))].filter(u => /gzt/.test(u));
  if (any.length) {
    const res = await fetch(`http://127.0.0.1:4100/proxy?url=${encodeURIComponent(any[0])}`);
    if (res.ok) {
      const buf = Buffer.from(await res.arrayBuffer());
      b64 = buf.toString('base64');
      mimeType = (res.headers.get('content-type') || 'image/jpeg').split(';')[0];
      console.log(`Yedek görsel: ${any[0]} (${buf.length} byte)`);
    }
  }
}
if (!b64) { console.error('Test görseli indirilemedi'); process.exit(1); }

const SYSTEM = `Sen titiz bir haber doğrulama editörüsün. Bugünün tarihi: 25 Ekim 2026 Pazar. Görevin, görseldeki haberi internette arayıp doğrulamaktır. Arama yapmadan cevap vermek YASAKTIR.`;
const TASK = `Bu görsel bir haber paylaşımı/ekran görüntüsü.\nADIM 1: Görseldeki başlık, spot ve tüm yazıları AYNEN çıkar (yorum yapma).\nADIM 2: Hangi olaydan söz edildiğini belirle ve İNTERNETTE ARA (Google Search).\nADIM 3: Güvenilir kaynaklarda haberi doğrula.\nÇIKTI (düz metin):\nGÖRSELDEKİ YAZI: ...\nDOĞRULANMIŞ BİLGİLER: ...\nDURUM: DOĞRULANDI | KISMEN | DOĞRULANAMADI`;

const variants = [
  ['A_birebir-canli(num2000)', { image: true, maxTokens: 2000 }],
  ['B_num8000', { image: true, maxTokens: 8000 }],
  ['C_sadece-metin(num2000)', { image: false, maxTokens: 2000 }],
];

for (const [label, { image, maxTokens }] of variants) {
  const parts = [];
  if (image) parts.push({ inlineData: { mimeType, data: b64 } });
  parts.push({ text: image ? TASK : `Gündem: Türkiye'de bugün (25 Ekim 2026) güncel bir gerçek haber başlığı internette ARA ve 2 cümleyle kaynak adıyla yaz.` });
  const payload = {
    contents: [{ role: 'user', parts }],
    systemInstruction: { parts: [{ text: SYSTEM }] },
    generationConfig: { temperature: 0.1, maxOutputTokens: maxTokens },
    tools: [{ google_search: {} }],
  };
  const t0 = Date.now();
  try {
    const res = await fetch(URL, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload), signal: AbortSignal.timeout(120000) });
    const data = await res.json().catch(() => ({}));
    const cand = data.candidates?.[0];
    const text = (cand?.content?.parts || []).map(p => p?.text || '').join('').trim();
    const chunks = cand?.groundingMetadata?.groundingChunks || [];
    const queries = cand?.groundingMetadata?.webSearchQueries || [];
    console.log(`\n== ${label} ==`);
    console.log(`HTTP=${res.status} tenantsı=${Date.now() - t0}ms finishReason=${cand?.finishReason ?? '-'} promptFeedback=${JSON.stringify(data.promptFeedback ?? null)}`);
    console.log(`groundingChunks=${chunks.length} webSearchQueries=${queries.length} queries=${JSON.stringify(queries.slice(0, 3))}`);
    console.log(`usage=${JSON.stringify({ prompt: data.usageMetadata?.promptTokenCount, cand: data.usageMetadata?.candidatesTokenCount, total: data.usageMetadata?.totalTokenCount })}`);
    if (!res.ok) console.log(`hata-govde=${JSON.stringify(data.error?.message || data).slice(0, 300)}`);
    console.log(`text(${text.length})=${text.slice(0, 240).replace(/\n+/g, ' | ')}`);
    if (data?.usageMetadata?.totalTokenCount) {
      const thoughtBalance = cand?.usageMetadata?.thoughtsTokenCount ?? null;
      console.log(`thoughtsTokenCount=${thoughtBalance ?? '-'} finishReason(safety)=${JSON.stringify(data.candidates?.[0]?.safetyRatings ?? null)}`);
    }
  } catch (e) {
    console.log(`\n== ${label} == ISTISNA ${String(e?.message || e).slice(0, 200)}`);
  }
}
