// Sıfır maliyet görsel üretim kanayı taraması (anahtar değeri yazdırılmaz).
const env = process.env;
const trim = (s, n = 200) => String(s || '').replace(/\s+/g, ' ').slice(0, n);

// 1) OpenRouter: mimari modalite + fiyat alan yapısını doğru oku
const or = await fetch('https://openrouter.ai/api/v1/models', { headers: { authorization: `Bearer ${env.OPENROUTER_API_KEY}` }, signal: AbortSignal.timeout(60000) });
console.log('OR /models:', or.status);
const list = (await or.json()).data || [];
const sample = list.find(m => /image/i.test(m.id));
if (sample) console.log('örnek alanlar:', Object.keys(sample).join(','), '| arch:', JSON.stringify(sample.architecture || {}));

const imgModels = list.filter(m => (m.architecture?.output_modalities || []).includes('image'));
const free = (m) => {
  const p = m.pricing || {};
  const zero = v => String(v) === '0';
  return { id: m.id, promptZero: zero(p.prompt), imageZero: zero(p.image), reqZero: zero(p.request) };
};
console.log(`\n=== OR image-output modelleri (${imgModels.length}) ===`);
for (const m of imgModels) { const f = free(m); console.log(`${f.id}  freePrompt=${f.promptZero} freeImage=${f.imageZero} freeReq=${f.reqZero}`); }

// 2) NVIDIA: görüntü üretim modeli adları
const nv = await fetch('https://integrate.api.nvidia.com/v1/models', { headers: { authorization: `Bearer ${env.NVIDIA_API_KEY}` }, signal: AbortSignal.timeout(60000) });
console.log('\nNVIDIA /models:', nv.status);
if (nv.ok) {
  const ids = ((await nv.json()).data || []).map(m => m.id);
  const hits = ids.filter(id => /image|diffusion|sana|flux|sdxl|sdxl|imagen|photon|cosmos|photo/i.test(id));
  console.log('görüntü adayları:', hits.join(', ') || '(liste içinde görüntü adı görülmedi)');
}

// 3) Gemini eski ücretsiz görsel modelleri
const geminiProbes = [
  { model: 'gemini-2.0-flash-preview-image-generation', modalities: ['TEXT', 'IMAGE'] },
  { model: 'gemini-2.5-flash-image-lite', modalities: ['IMAGE'] },
];
for (const p of geminiProbes) {
  try {
    const t0 = Date.now();
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${p.model}:generateContent`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
      body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: 'küçük kırmızı daire çiz' }] }], generationConfig: { responseModalities: p.modalities } }),
      signal: AbortSignal.timeout(90000),
    });
    let detail;
    if (!r.ok) detail = trim(await r.text());
    else { const d = await r.json(); const has = (d?.candidates?.[0]?.content?.parts || []).some(x => x.inlineData); detail = has ? 'GÖRSEL üretildi ✅' : '200 ama görsel yok'; }
    console.log(`GL ${p.model} -> ${r.status} (${Date.now() - t0}ms) ${detail}`);
  } catch (e) { console.log(`GL ${p.model} -> ERR ${trim(e.message || e)}`); }
}
