// TTS model doğrulama: (1) katalogda hangi tts modelleri var? (2) hangisi gerçekten ses döndürür?
const base = 'https://generativelanguage.googleapis.com/v1beta';

// 1) Katalog listesi (tts geçen modeller)
const lr = await fetch(`${base}/models?key=${process.env.GEMINI_API_KEY}&pageSize=200`, { signal: AbortSignal.timeout(30000) });
console.log('katalog HTTP', lr.status);
if (lr.ok) {
  const d = await lr.json();
  const tts = (d.models || []).filter(m => /tts/i.test(m.name || ''));
  for (const m of tts) console.log('TTS aday:', m.name, '| destekler:', (m.supportedGenerationMethods || []).join(','));
}

// 2) Gerçek ses denemesi (Aoede sesiyle tek satır)
const tryGenerate = async (model) => {
  try {
    const r = await fetch(`${base}/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'Kısa bir merhaba.' }] }],
        generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Aoede' } } } },
      }),
      signal: AbortSignal.timeout(60000),
    });
    if (!r.ok) return `HTTP ${r.status} | ${String(await r.text()).slice(0, 120).replace(/\s+/g, ' ')}`;
    const d = await r.json();
    const b64 = d?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    return b64 ? `OK ses ${Math.round(b64.length * 3 / 4 / 1024)}KB` : 'OK ama ses yok';
  } catch (e) { return `ERR ${String(e?.message || e).slice(0, 100)}`; }
};

for (const model of ['gemini-2.5-flash-preview-tts', 'gemini-2.5-flash-tts', 'gemini-3.1-flash-tts-preview']) {
  const r = await tryGenerate(model);
  console.log(`${model.padEnd(32)} → ${r}`);
}
