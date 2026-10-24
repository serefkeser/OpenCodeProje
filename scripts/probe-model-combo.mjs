// Analiz-istek şeklindeki (tools+schema KOMBİNASYONUNU) kabul eden Gemini modelini bul.
const env = process.env;
const payloadOf = model => JSON.stringify({
  contents: [{ role: 'user', parts: [{ text: 'Bugüne dair tek satırlık teknik haber başlığı üret (JSON içinde).' }] }],
  systemInstruction: { parts: [{ text: 'Kısa cevap ver.' }] },
  generationConfig: {
    responseMimeType: 'application/json',
    responseSchema: { type: 'OBJECT', properties: { baslik: { type: 'STRING' } }, required: ['baslik'] },
  },
  tools: [{ google_search: {} }],
});

const models = [
  'gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.5-pro',
  'gemini-3-flash', 'gemini-3.1-flash', 'gemini-flash-latest',
];
for (const model of models) {
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
      body: payloadOf(model),
      signal: AbortSignal.timeout(90000),
    });
    let verdict;
    if (!r.ok) verdict = String(await r.text()).slice(0, 130).replace(/\s+/g, ' ');
    else {
      const d = await r.json();
      const txt = d?.candidates?.[0]?.content?.parts?.map(p => p.text).filter(Boolean).join(' ') || '';
      verdict = `OK — ${txt.slice(0, 90)}`;
    }
    console.log(`${model.padEnd(28)} ${r.status}  ${verdict}`);
  } catch (e) { console.log(`${model.padEnd(28) } ERR ${String(e?.message || e).slice(0, 90)}`); }
}
