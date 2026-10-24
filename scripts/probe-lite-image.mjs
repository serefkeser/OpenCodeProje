// Son sıfır maliyet kanayı: Nano Banana 2 Lite + GPU keşfi
const env = process.env;
const trim = (s, n = 300) => String(s || '').replace(/\s+/g, ' ').slice(0, n);

const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-image:generateContent', {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
  body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: 'küçük kırmızı daire çiz' }] }], generationConfig: { responseModalities: ['IMAGE'] } }),
  signal: AbortSignal.timeout(90000),
});
console.log('GL gemini-3.1-flash-lite-image ->', r.status);
if (!r.ok) console.log(trim(await r.text()));
else { const d = await r.json(); console.log((d?.candidates?.[0]?.content?.parts || []).some(x => x.inlineData) ? 'GÖRSEL üretildi ✅' : trim(JSON.stringify(d))); }
