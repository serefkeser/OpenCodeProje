// ============================================================================
// OTONOM v1.196 KÖK NEDEN PROBU — "Son Söz seslendirmesi üretilemedi" FAILED raporu
// Uygulamanın birebir yolunu taklit eder: tarayıcı hook'u gibi gateway
// /api/gemini-proxy üzerinden 3 TTS modelini kısa metinle dener; her modelin
// HTTP durumunu + hata gövdesini yazdırır. Kota harcaması: istek başına ~30 ses.
// Kanıt: tasks/probe-v196-tts.out.txt
// ============================================================================
const GATEWAY = 'http://127.0.0.1:4100';
const TTS_MODELS = ['gemini-3.1-flash-tts-preview', 'gemini-3.8-flash-tts', 'gemini-3.8-flash-lite-tts'];
const TEXT = 'Bu bir kök neden probu. Merhaba dünya.';

const probe = async model => {
  const path = `/v1beta/models/${model}:generateContent`;
  const payload = {
    contents: [{ parts: [{ text: TEXT }] }],
    generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Aoede' } } } },
  };
  const started = Date.now();
  try {
    const r = await fetch(`${GATEWAY}/api/gemini-proxy?target=${encodeURIComponent(path)}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(60000),
    });
    const ms = Date.now() - started;
    if (r.ok) {
      const d = await r.json();
      const audio = d?.candidates?.[0]?.content?.parts?.[0]?.inlineData;
      const bytes = audio ? Math.round((audio.data?.length || 0) * 0.75 / 1024) : 0;
      return `PASS ${model}: HTTP 200 (${ms} ms), inlineAudio=${audio ? `${audio.mimeType} ${bytes}KB` : 'YOK (candidates boş!)'}`;
    }
    const body = await r.text();
    return `FAIL ${model}: HTTP ${r.status} (${ms} ms) → ${body.slice(0, 400)}`;
  } catch (e) {
    return `FAIL ${model}: AĞ HATASI (${Date.now() - started} ms) → ${String(e?.message || e).slice(0, 300)}`;
  }
};

const lines = [];
for (const model of TTS_MODELS) {
  const line = await probe(model);
  console.log(line);
  lines.push(line);
}
// Yanıt hızı analizi: 429 kota cevapları <2 sn döner; gerçek ses üretimi 5-20 sn.
console.log('\nNOT: HTTP 429 = kota; HTTP 404 = model emekli; PASS audio YOK = boş yanıt.');
const fs = await import('node:fs');
fs.writeFileSync(new URL('./probe-v196-tts.out.txt', import.meta.url), lines.join('\n'), 'utf8');
