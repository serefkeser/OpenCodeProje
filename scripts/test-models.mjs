// Model/anahtar testi — her sağlayıcı için minik gerçek istek (maliyet ~yok).
// Kurallı: hiçbir anahtar değeri yazdırılmaz; yalnız HTTP durumu + kısa özet.
import { readFileSync } from 'node:fs';

const env = {};
for (const line of readFileSync('.env', 'utf8').split('\n')) {
  const m = /^([A-Z_0-9]+)=(.*)$/.exec(line.trim());
  if (m) env[m[1]] = m[2];
}

const trim = (s, n = 140) => String(s || '').replace(/\s+/g, ' ').slice(0, n);
const openAiBody = (model, extra = {}) => JSON.stringify({
  model, max_tokens: 8, messages: [{ role: 'user', content: 'selam de' }], ...extra,
});

const PROBES = [
  // --- Gemini doğrudan
  { id: 'GL-TEXT gemini-2.5-flash', run: async () => {
    const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent', {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
      body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: 'selam de' }] }], generationConfig: { maxOutputTokens: 8 } }),
      signal: AbortSignal.timeout(60_000),
    });
    return { status: r.status, detail: r.ok ? 'yanıt OK' : trim(await r.text()) };
  } },
  { id: 'GL-IMG gemini-2.5-flash-image (servis varsayılanı)', run: async () => {
    const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent', {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
      body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: 'küçük kırmızı daire çiz' }] }], generationConfig: { responseModalities: ['IMAGE'] } }),
      signal: AbortSignal.timeout(90_000),
    });
    if (!r.ok) return { status: r.status, detail: trim(await r.text()) };
    const d = await r.json();
    const hasImg = (d?.candidates?.[0]?.content?.parts || []).some(p => p.inlineData);
    return { status: 200, detail: hasImg ? 'GÖRSEL üretildi' : '200 ama inline image yok' };
  } },
  { id: 'GL-IMG gemini-3.1-flash-image (alternatif)', run: async () => {
    const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image:generateContent', {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
      body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: 'küçük kırmızı daire çiz' }] }], generationConfig: { responseModalities: ['IMAGE'] } }),
      signal: AbortSignal.timeout(90_000),
    });
    if (!r.ok) return { status: r.status, detail: trim(await r.text()) };
    const d = await r.json();
    const hasImg = (d?.candidates?.[0]?.content?.parts || []).some(p => p.inlineData);
    return { status: 200, detail: hasImg ? 'GÖRSEL üretildi' : '200 ama inline image yok' };
  } },
  { id: `GL-TTS ${env.GEMINI_TTS_MODEL || 'env-yok'} (${env.GEMINI_TTS_VOICE || 'Aoede'})`, run: async () => {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${env.GEMINI_TTS_MODEL || 'gemini-2.5-flash-preview-tts'}:generateContent`, {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: 'Sadece "merhaba" de.' }] }],
        generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: env.GEMINI_TTS_VOICE || 'Aoede' } } } },
      }),
      signal: AbortSignal.timeout(90_000),
    });
    if (!r.ok) return { status: r.status, detail: trim(await r.text()) };
    const d = await r.json();
    const hasAudio = (d?.candidates?.[0]?.content?.parts || []).some(p => p.inlineData?.mimeType?.startsWith('audio/'));
    return { status: 200, detail: hasAudio ? 'SES üretildi' : '200 ama inline audio yok' };
  } },
  // --- OpenRouter
  { id: `OR-TEXT ${env.OPENROUTER_TEXT_MODEL}`, run: async () => {
    const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${env.OPENROUTER_API_KEY}` },
      body: openAiBody(env.OPENROUTER_TEXT_MODEL), signal: AbortSignal.timeout(60_000),
    });
    return { status: r.status, detail: r.ok ? 'yanıt OK' : trim(await r.text()) };
  } },
  { id: `OR-VISION ${env.OPENROUTER_VISION_MODEL} (text-probe)`, run: async () => {
    const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${env.OPENROUTER_API_KEY}` },
      body: openAiBody(env.OPENROUTER_VISION_MODEL), signal: AbortSignal.timeout(60_000),
    });
    return { status: r.status, detail: r.ok ? 'yanıt OK' : trim(await r.text()) };
  } },
  { id: `OR-IMG ${env.OPENROUTER_IMAGE_MODEL}`, run: async () => {
    const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${env.OPENROUTER_API_KEY}` },
      body: JSON.stringify({ model: env.OPENROUTER_IMAGE_MODEL, modalities: ['image', 'text'], max_tokens: 200, messages: [{ role: 'user', content: 'küçük kırmızı daire çiz' }] }),
      signal: AbortSignal.timeout(120_000),
    });
    if (!r.ok) return { status: r.status, detail: trim(await r.text()) };
    const d = await r.json();
    const hasImg = !!d?.choices?.[0]?.message?.images?.length;
    return { status: 200, detail: hasImg ? 'GÖRSEL üretildi' : '200 ama images[] yok' };
  } },
  { id: `OR-TTS ${env.OPENROUTER_TTS_MODEL}`, run: async () => {
    const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${env.OPENROUTER_API_KEY}` },
      body: JSON.stringify({ model: env.OPENROUTER_TTS_MODEL, modalities: ['text', 'audio'], audio: { voice: 'alloy', format: 'wav' }, max_tokens: 60, messages: [{ role: 'user', content: 'sadece merhaba de' }] }),
      signal: AbortSignal.timeout(90_000),
    });
    if (!r.ok) return { status: r.status, detail: trim(await r.text()) };
    const d = await r.json();
    const hasAudio = !!d?.choices?.[0]?.message?.audio;
    return { status: 200, detail: hasAudio ? 'SES üretildi' : '200 ama audio yok' };
  } },
  // --- Groq
  { id: `GQ-TEXT ${env.GROQ_TEXT_MODEL}`, run: async () => {
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${env.GROQ_API_KEY}` },
      body: openAiBody(env.GROQ_TEXT_MODEL), signal: AbortSignal.timeout(60_000),
    });
    return { status: r.status, detail: r.ok ? 'yanıt OK' : trim(await r.text()) };
  } },
  // --- NVIDIA
  { id: `NV-TEXT ${env.NVIDIA_TEXT_MODEL}`, run: async () => {
    const r = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${env.NVIDIA_API_KEY}` },
      body: openAiBody(env.NVIDIA_TEXT_MODEL), signal: AbortSignal.timeout(60_000),
    });
    return { status: r.status, detail: r.ok ? 'yanıt OK' : trim(await r.text()) };
  } },
];

const runProbe = async p => {
  const t0 = Date.now();
  try { const r = await p.run(); return { id: p.id, ms: Date.now() - t0, ...r }; }
  catch (e) { return { id: p.id, ms: Date.now() - t0, status: 'ERR', detail: trim(e?.message || e) }; }
};

// --- Servis uçları (gerçek akış) ---
const svc = [
  { id: 'SVC analysis :4201 /api/analysis/text (zincir)', url: 'http://localhost:4201/api/analysis/text', body: { prompt: 'selam de', maxTokens: 8 } },
  { id: 'SVC media :4202 /api/media/image (zincir)', url: 'http://localhost:4202/api/media/image', body: { prompt: 'küçük kırmızı daire çiz' } },
  { id: 'SVC media :4202 /api/media/tts', url: 'http://localhost:4202/api/media/tts', body: { text: 'Sadece "merhaba" de.' } },
];
const runSvc = async s => {
  const t0 = Date.now();
  try {
    const r = await fetch(s.url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(s.body), signal: AbortSignal.timeout(120_000) });
    const tag = r.ok ? 'OK' : `HTTP ${r.status}`;
    const d = await r.json().catch(() => ({}));
    // hangi provider evreye düştü / hata neydi
    const provider = d.provider || (Array.isArray(d.attempts) && d.attempts.map(a => `${a.provider}${a.error ? '!' : ''}`).join('→')) || '';
    let detail = r.ok ? (d.kind || d.model || '') : trim(d?.attempts?.[d.attempts.length - 1]?.error || (JSON.stringify(d)));
    return { id: s.id, ms: Date.now() - t0, status: tag, detail: trim(`${provider} ${detail}`.trim()) };
  } catch (e) { return { id: s.id, ms: Date.now() - t0, status: 'ERR', detail: trim(e?.message || e) }; }
};

console.log('PROBE başlıyor (anahtar değerleri yazdırılmaz)...\n');
const all = [...(await Promise.all(PROBES.map(runProbe)))];
const svcResults = [];
for (const s of svc) svcResults.push(await runSvc(s));

console.log('=== DOĞRUDAN MODEL PROBELERİ ===');
for (const r of all) console.log(`${String(r.status).padStart(4)} ${String(r.ms + 'ms').padStart(7)}  ${r.id}\n      ↳ ${r.detail}`);
console.log('\n=== SERVİS UÇ NOKTALARI (gerçek akış) ===');
for (const r of svcResults) console.log(`${String(r.status).padStart(4)} ${String(r.ms + 'ms').padStart(7)}  ${r.id}\n      ↳ ${r.detail}`);
