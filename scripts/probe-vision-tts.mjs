// Kalan probe'lar: NVIDIA vision + OpenRouter TTS (kredi teyidi). Anahtar değeri yazdırılmaz.
const env = process.env;
const trim = s => String(s || '').replace(/\s+/g, ' ').slice(0, 120);

const nvidiaChat = async (model, body, ms = 150000) => {
  const t0 = Date.now();
  try {
    const r = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${env.NVIDIA_API_KEY}` },
      body: JSON.stringify({ model, max_tokens: 8, ...body }),
      signal: AbortSignal.timeout(ms),
    });
    return `${r.status} ${r.ok ? `OK ${Date.now() - t0}ms` : trim(await r.text())}`;
  } catch (e) { return `ERR ${trim(e.message || e)}`; }
};

console.log('NV-VISION', env.NVIDIA_VISION_MODEL, '->', await nvidiaChat(env.NVIDIA_VISION_MODEL, { messages: [{ role: 'user', content: 'selam de' }] }));
console.log('NV-VISION meta/llama-3.2-11b-vision-instruct ->', await nvidiaChat('meta/llama-3.2-11b-vision-instruct', { messages: [{ role: 'user', content: 'selam de' }] }));

try {
  const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${env.OPENROUTER_API_KEY}` },
    body: JSON.stringify({ model: 'openai/gpt-audio-mini', modalities: ['text', 'audio'], audio: { voice: 'alloy', format: 'wav' }, max_tokens: 60, messages: [{ role: 'user', content: 'sadece merhaba de' }] }),
    signal: AbortSignal.timeout(90000),
  });
  console.log('OR-TTS openai/gpt-audio-mini ->', r.status, r.ok ? 'SES OK' : trim(await r.text()));
} catch (e) { console.log('OR-TTS ERR', trim(e.message || e)); }
