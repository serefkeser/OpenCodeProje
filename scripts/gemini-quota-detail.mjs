// Gemini ListModels + 429 detayı (hangi kota kovası, ne zaman sıfırlanır)
const env = process.env;
const trim = (s, n = 400) => String(s || '').replace(/\s+/g, ' ').slice(0, n);

const lm = await fetch('https://generativelanguage.googleapis.com/v1beta/models', {
  headers: { 'x-goog-api-key': env.GEMINI_API_KEY }, signal: AbortSignal.timeout(60000),
});
console.log('ListModels:', lm.status);
if (lm.ok) {
  const models = (await lm.json()).models || [];
  const img = models.filter(m => (m.supportedGenerationMethods || []).includes('generateContent') && /image|imagen|banana/i.test(m.name));
  console.log('görsel destekli modeller:');
  for (const m of img) console.log(`  ${m.name}  | ${m.displayName || ''}`);
} else { console.log('hata:', trim(await lm.text())); }

// 429 gövdesinin tamamı + Retry-After başlığı
const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent', {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
  body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: 'test' }] }], generationConfig: { responseModalities: ['IMAGE'] } }),
  signal: AbortSignal.timeout(60000),
});
console.log('\nIMG probe:', r.status, '| retry-after:', r.headers.get('retry-after'), '| ratelimit-reset:', r.headers.get('x-ratelimit-reset') || r.headers.get('x-quota-remaining'));
console.log(trim(await r.text(), 700));
