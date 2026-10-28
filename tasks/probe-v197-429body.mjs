// ============================================================================
// OTONOM v1.197 KÖK NEDEN PROBU — 429 gövdesinin TAM içeriği: retryDelay var mı,
// limit RPM mi RPD mi? (kanıt: tasks/probe-v197-429body.out.txt)
// ============================================================================
const GATEWAY = 'http://127.0.0.1:4100';
const MODEL = 'gemini-3.1-flash-tts-preview';
const path = `/v1beta/models/${MODEL}:generateContent`;
const payload = {
  contents: [{ parts: [{ text: 'Bu bir 429 gövde probu.' }] }],
  generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Aoede' } } } },
};
const r = await fetch(`${GATEWAY}/api/gemini-proxy?target=${encodeURIComponent(path)}`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(payload),
  signal: AbortSignal.timeout(60000),
});
const body = await r.text();
console.log(`HTTP ${r.status}`);
console.log(body);
const fs = await import('node:fs');
fs.writeFileSync(new URL('./probe-v197-429body.out.txt', import.meta.url), `HTTP ${r.status}\n${body}`, 'utf8');
const retryDelay = /"retryDelay":\s*"([^"]+)"/.exec(body)?.[1];
const quotaId = /"quotaId":\s*"([^"]+)"/.exec(body)?.[1];
console.log(`\nretryDelay: ${retryDelay || 'YOK'}`);
console.log(`quotaId: ${quotaId || 'YOK'}`);
