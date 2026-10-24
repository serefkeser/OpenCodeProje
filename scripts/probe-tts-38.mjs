const tryGenerate = async (model, voice) => {
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: 'Kısa bir merhaba.' }] }], generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } } } }),
      signal: AbortSignal.timeout(60000),
    });
    if (!r.ok) return `HTTP ${r.status} | ${String(await r.text()).slice(0, 110).replace(/\s+/g, ' ')}`;
    const d = await r.json();
    const b64 = d?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    return b64 ? `OK ses ${Math.round(b64.length * 3 / 4 / 1024)}KB` : 'OK ama ses yok';
  } catch (e) { return `ERR ${String(e?.message || e).slice(0, 90)}`; }
};
for (const m of ['gemini-3.8-flash-tts', 'gemini-3.8-flash-lite-tts']) {
  console.log(`${m.padEnd(28)} → ${await tryGenerate(m, 'Aoede')}`);
}
