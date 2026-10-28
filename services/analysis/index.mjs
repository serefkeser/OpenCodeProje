// ============================================================================
// OTONOM v1.195 — ANALYSIS MİKRO SERVİS (port: ANALYSIS_PORT / 4201)
// Sorumluluk: Metin + görsel analiz. Provider zinciri:
//   OpenRouter → Groq → NVIDIA → Gemini. Modeller .env'den okunur.
// Uç noktalar: POST /api/analysis/text, POST /api/analysis/vision, GET /health
// v1.195: CORS allowlist (CORS_ORIGIN) + gövde sınırı MAX_BODY_BYTES.
// ============================================================================
import { createServer } from 'node:http';

const PORT = Number(process.env.ANALYSIS_PORT || 4201);
const HOST = process.env.HOST || '127.0.0.1';
const MAX_BODY_BYTES = Number(process.env.MAX_BODY_BYTES || 100e6);
const OPENROUTER_API_KEY = String(process.env.OPENROUTER_API_KEY || '');
const GROQ_API_KEY = String(process.env.GROQ_API_KEY || '');
const NVIDIA_API_KEY = String(process.env.NVIDIA_API_KEY || '');
const GEMINI_API_KEY = String(process.env.GEMINI_API_KEY || '');
const MODELS = {
  openrouter: { text: String(process.env.OPENROUTER_TEXT_MODEL || ''), vision: String(process.env.OPENROUTER_VISION_MODEL || '') },
  groq: { text: String(process.env.GROQ_TEXT_MODEL || ''), vision: String(process.env.GROQ_VISION_MODEL || '') },
  nvidia: { text: String(process.env.NVIDIA_TEXT_MODEL || ''), vision: String(process.env.NVIDIA_VISION_MODEL || '') },
  gemini: { text: 'gemini-2.5-flash' },
};

const CORS_BASE_HEADERS = {
  'access-control-allow-methods': 'GET, POST, OPTIONS',
  'access-control-allow-headers': 'content-type, accept',
};
// v1.195: CORS allowlist — yalnız güvenilen yerel kökenler yankılanır; izinsiz
// köken ACAO almaz (drive-by kota tüketimine karşı, media servisiyle aynı kurallar).
const CORS_ALLOWED_ORIGINS = String(process.env.CORS_ORIGIN || 'http://localhost:5173,http://127.0.0.1:5173')
  .split(',').map(s => s.trim()).filter(Boolean);
const corsHeaders = request => {
  const origin = String(request?.headers?.origin || '');
  return (origin && CORS_ALLOWED_ORIGINS.includes(origin))
    ? { ...CORS_BASE_HEADERS, 'access-control-allow-origin': origin }
    : { ...CORS_BASE_HEADERS };
};

const writeJson = (status, nodeResponse, body, request) => {
  nodeResponse.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...corsHeaders(request) });
  nodeResponse.end(JSON.stringify(body));
};

const readJson = request => new Promise((resolve, reject) => {
  const chunks = [];
  let size = 0;
  request.on('data', c => { size += c.length; if (size > MAX_BODY_BYTES) { reject(Object.assign(new Error('REQUEST_TOO_LARGE'), { status: 413 })); request.destroy(); return; } chunks.push(c); });
  request.on('end', () => {
    try { resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {}); }
    catch (e) { reject(Object.assign(new Error('INVALID_JSON'), { status: 400 })); }
  });
  request.on('error', reject);
});

// -- OpenAI-uyumlu provider'lar (OpenRouter, Groq, NVIDIA ortak şema) --------
const openAiStyleCall = async ({ endpoint, apiKey, model, system, prompt, images, temperature, maxTokens }) => {
  const content = images?.length
    ? [{ type: 'text', text: prompt }, ...images.map(src => ({ type: 'image_url', image_url: { url: String(src).startsWith('data:') ? src : `data:image/png;base64,${src}` } }))]
    : prompt;
  const r = await fetch(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      temperature: temperature ?? 0.8,
      // v1.180: default zemin 2048 → 4096; reasoning üreten modeller bütçeyi
      // reasoning'e harcayıp JSON'u ortada kesiyordu (gerçek üretim kanıtı: 224. kolon).
      max_tokens: maxTokens ?? 4096,
      ...(system
        ? { messages: [{ role: 'system', content: system }, { role: 'user', content }] }
        : { messages: [{ role: 'user', content }] }),
    }),
    signal: AbortSignal.timeout(90_000),
  });
  if (!r.ok) throw new Error(`${new URL(endpoint).host} HTTP ${r.status}: ${(await r.text()).slice(0, 240)}`);
  const data = await r.json();
  const text = data?.choices?.[0]?.message?.content || '';
  if (!text) throw new Error('Boş yanıt (choices[0].message.content yok).');
  return { text, provider: 'openai-style', model };
};

const geminiCall = async ({ prompt, system, images, temperature, maxTokens, model }) => {
  const parts = [];
  (images || []).forEach(src => {
    const data = String(src).includes(',') ? String(src).split(',')[1] : String(src);
    const mimeType = /data:(image\/[a-z+]+);/i.exec(String(src))?.[1] || 'image/png';
    parts.push({ inlineData: { mimeType, data } });
  });
  parts.push({ text: prompt });
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': GEMINI_API_KEY },
    body: JSON.stringify({
      contents: [{ role: 'user', parts }],
      ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
      generationConfig: { temperature: temperature ?? 0.8, maxOutputTokens: maxTokens ?? 4096 }, // v1.180: 2048 → 4096 (kesik çıktı zimni)
    }),
    signal: AbortSignal.timeout(90_000),
  });
  if (!r.ok) throw new Error(`gemini HTTP ${r.status}: ${(await r.text()).slice(0, 240)}`);
  const data = await r.json();
  const text = (data?.candidates?.[0]?.content?.parts || []).map(p => p.text).filter(Boolean).join('\n');
  if (!text) throw new Error('Boş yanıt (candidates yok).');
  return { text, provider: 'gemini', model };
};

const CHAIN = key => [
  { name: 'openrouter', gate: () => Boolean(OPENROUTER_API_KEY && MODELS.openrouter[key]), run: a => { const model = a.model || MODELS.openrouter[key]; return openAiStyleCall({ ...a, endpoint: 'https://openrouter.ai/api/v1/chat/completions', apiKey: OPENROUTER_API_KEY, model }); } },
  { name: 'groq', gate: () => Boolean(GROQ_API_KEY && MODELS.groq[key]), run: a => { const model = a.model || MODELS.groq[key]; return openAiStyleCall({ ...a, endpoint: 'https://api.groq.com/openai/v1/chat/completions', apiKey: GROQ_API_KEY, model }); } },
  { name: 'nvidia', gate: () => Boolean(NVIDIA_API_KEY && MODELS.nvidia[key]), run: a => { const model = a.model || MODELS.nvidia[key]; return openAiStyleCall({ ...a, endpoint: 'https://integrate.api.nvidia.com/v1/chat/completions', apiKey: NVIDIA_API_KEY, model }); } },
  { name: 'gemini', gate: () => Boolean(GEMINI_API_KEY), run: a => { const model = a.model || MODELS.gemini.text; return geminiCall({ ...a, model }); } },
];

const runChain = async (key, args) => {
  const attempts = [];
  for (const step of CHAIN(key)) {
    if (!step.gate()) { attempts.push({ provider: step.name, skipped: true }); continue; }
    try {
      const result = await step.run(args);
      return { ...result, attempts };
    } catch (error) {
      attempts.push({ provider: step.name, error: String(error?.message || error).slice(0, 300) });
    }
  }
  const e = new Error('Tüm providerlar başarısız.');
  e.status = 502;
  e.attempts = attempts;
  throw e;
};

const server = createServer(async (request, response) => {
  try {
    if (request.method === 'OPTIONS') return response.writeHead(204, corsHeaders(request)).end();
    if (request.url === '/health' && request.method === 'GET') {
      return writeJson(200, response, {
        ok: true, service: 'analysis', models: MODELS,
        keys: { openrouter: Boolean(OPENROUTER_API_KEY), groq: Boolean(GROQ_API_KEY), nvidia: Boolean(NVIDIA_API_KEY), gemini: Boolean(GEMINI_API_KEY) },
      }, request);
    }
    const isText = request.url === '/api/analysis/text';
    const isVision = request.url === '/api/analysis/vision';
    if ((isText || isVision) && request.method === 'POST') {
      const body = await readJson(request);
      const args = {
        prompt: String(body.prompt || ''),
        system: body.system,
        images: isVision ? body.images : undefined,
        temperature: body.temperature,
        maxTokens: body.maxTokens,
        model: body.model,
      };
      if (!args.prompt) return writeJson(400, response, { ok: false, code: 'PROMPT_REQUIRED' }, request);
      if (isVision && !args.images?.length) return writeJson(400, response, { ok: false, code: 'IMAGES_REQUIRED' }, request);
      const result = await runChain(isVision ? 'vision' : 'text', args);
      return writeJson(200, response, { ok: true, ...result }, request);
    }
    return writeJson(404, response, { ok: false, code: 'NOT_FOUND', message: 'Analysis API yolu bulunamadı.' }, request);
  } catch (error) {
    return writeJson(error?.status || 500, response, { ok: false, code: error?.message || 'SERVER_ERROR', attempts: error?.attempts }, request);
  }
});

server.listen(PORT, HOST, () => console.log(`[analysis] http://${HOST}:${PORT} (text:${MODELS.openrouter.text} → groq:${MODELS.groq.text} → nvidia:${MODELS.nvidia.text} → gemini)`));
