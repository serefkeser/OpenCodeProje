// v1.175 son doğrulama: _stripJsonConfigForSearch SONRASI istek şekli (analiz akışı dengi):
// tools: [{google_search:{}}] + JSON şeması METİN talimatı olarak gömülü, responseMimeType YOK.
// Beklenti: 200 + parse edilebilir {…} JSON döndürmek.
import { readFileSync } from 'node:fs';

const env = {};
for (const line of readFileSync('.env', 'utf8').split('\n')) {
  const m = /^([A-Z_0-9]+)=(.*)$/.exec(line.trim());
  if (m) env[m[1]] = m[2];
}

// Analiz fonksiyonundaki gerçek şema (kısaltılmış ama aynı yapı)
const schema = {
  type: 'OBJECT',
  properties: {
    isContentUnreadable: { type: 'BOOLEAN' },
    videoSlides: { type: 'ARRAY', items: { type: 'OBJECT', properties: { topText: { type: 'STRING' }, spokenText: { type: 'STRING' }, imagePrompts: { type: 'ARRAY', items: { type: 'STRING' } } } } },
    thumbnailText: { type: 'STRING' },
    sonSoz: { type: 'STRING' },
    gazeteBasliklari: { type: 'ARRAY', items: { type: 'OBJECT', properties: { baslik: { type: 'STRING' } } } },
  },
  required: ['isContentUnreadable', 'videoSlides', 'thumbnailText', 'thumbnailImagePrompt', 'gazeteBasliklari'],
};
const schemaText = JSON.stringify(schema);
const jsonRule = `STRICT JSON OUTPUT: Dönüşün TAMAMI şu şemaya uyan TEK geçerli JSON olsun (markdown çiti, açıklama, ek metin YASAK). Şema: ${schemaText}`;

const payload = {
  contents: [{ role: 'user', parts: [{ text: 'Bugünün Türkiye gündeminden tek bir teknik haber seç; gazete başlığı örneği olarak 2 sahnelik haber videosu taslağı üret (kısa tut).' }] }],
  systemInstruction: { parts: [{ text: `Sen tarafsız bir haber editörüsün.\n\n${jsonRule}` }] },
  tools: [{ google_search: {} }],
};

const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent', {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
  body: JSON.stringify(payload),
  signal: AbortSignal.timeout(120000),
});
console.log('HTTP', r.status);
if (!r.ok) { console.log(String(await r.text()).slice(0, 260)); process.exit(1); }
const d = await r.json();
let text = (d?.candidates?.[0]?.content?.parts || []).map(p => p.text).filter(Boolean).join(' ');
console.log('grounding sorguları:', JSON.stringify(d?.candidates?.[0]?.groundingMetadata?.webSearchQueries || []).slice(0, 140));
// _callGeminiAndParse dengi gevşek parse:
text = text.replace(/`json/gi, '').replace(/`/g, '').trim();
const s = text.indexOf('{'); const e = text.lastIndexOf('}');
const parsed = JSON.parse(text.substring(s, e + 1));
console.log('PARSE OK — videoSlides:', parsed.videoSlides?.length, '| thumbnailText:', String(parsed.thumbnailText || '').slice(0, 60), '| gazeteBasliklari:', parsed.gazeteBasliklari?.length ?? 'yok');
