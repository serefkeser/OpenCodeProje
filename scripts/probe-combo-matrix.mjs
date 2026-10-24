// Kombinasyon matrisi: tools-bare / schema-bare / flash-latest 429 detayı
const env = process.env;
const call = async (url, body) => {
  const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY }, body: JSON.stringify(body), signal: AbortSignal.timeout(90000) });
  let detail;
  if (!r.ok) detail = String(await r.text()).slice(0, 220).replace(/\s+/g, ' ');
  else { const d = await r.json(); detail = 'OK ' + (d?.candidates?.[0]?.content?.parts?.map(p => p.text).filter(Boolean).join(' ') || '').slice(0, 80); }
  return `${r.status} ${detail}`;
};
const base = 'https://generativelanguage.googleapis.com/v1beta/models';

console.log('A) 2.5-flash + SADECE tools (schema yok):');
console.log('  ', await call(`${base}/gemini-2.5-flash:generateContent`, {
  contents: [{ role: 'user', parts: [{ text: 'Bugün gündemde tek bir teknik olay araştır ve tek satır yaz.' }] }],
  tools: [{ google_search: {} }],
}));

console.log('B) 2.5-flash + SADECE schema (tools yok):');
console.log('  ', await call(`${base}/gemini-2.5-flash:generateContent`, {
  contents: [{ role: 'user', parts: [{ text: 'Tek satırlık teknik haber başlığı yaz.' }] }],
  generationConfig: { responseMimeType: 'application/json', responseSchema: { type: 'OBJECT', properties: { baslik: { type: 'STRING' } }, required: ['baslik'] } },
}));

console.log('C) flash-latest 429 gövde detayı:');
const r = await fetch(`${base}/gemini-flash-latest:generateContent`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY }, body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: 'hi' }] }] }), signal: AbortSignal.timeout(60000) });
console.log('  ', r.status, String(r.ok ? 'OK' : await r.text()).slice(0, 400).replace(/\s+/g, ' '));
