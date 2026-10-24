// v1.175 öncesi doğrula: gemini-2.5-flash tüm analiz-istek şeklini (google_search + schema) kabul ediyor mu?
const env = process.env;
const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent', {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
  body: JSON.stringify({
    contents: [{ role: 'user', parts: [{ text: 'Bugüne dair kısa bir teknik haber başlığı yaz (tek satır).' }] }],
    systemInstruction: { parts: [{ text: 'Kısa ve tarafsız cevap ver.' }] },
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: { type: 'OBJECT', properties: { baslik: { type: 'STRING' } }, required: ['baslik'] },
    },
    tools: [{ google_search: {} }],
  }),
  signal: AbortSignal.timeout(90000),
});
console.log('const model gemini-2.5-flash + google_search + schema ->', r.status);
if (!r.ok) console.log(String(await r.text()).slice(0, 300));
else {
  const d = await r.json();
  const txt = d?.candidates?.[0]?.content?.parts?.map(p => p.text).filter(Boolean).join(' ') || '';
  console.log('yanıt:', txt.slice(0, 140), '| grounding:', JSON.stringify(d?.candidates?.[0]?.groundingMetadata?.webSearchQueries || []).slice(0, 120));
}
