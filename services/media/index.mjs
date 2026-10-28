// ============================================================================
// OTONOM v1.195 — MEDIA MİKRO SERVİS (port: MEDIA_PORT / 4202)
// Sorumluluk: Görsel üretimi (Gemini), TTS (GEMINI_TTS_MODEL + GEMINI_TTS_VOICE).
// Uç noktalar: POST /api/media/image, POST /api/media/tts, GET /health
// v1.195: TTS boş yanıtı artık 502 (fail-closed; ok:true+audio:null sessiz düşüşü
//         kaldırıldı), readJson taşmada stream destroy (bellek şişmesi fix),
//         CORS allowlist (CORS_ORIGIN) + gövde sınırı MAX_BODY_BYTES.
// ============================================================================
import { createServer } from 'node:http';

const PORT = Number(process.env.MEDIA_PORT || 4202);
const HOST = process.env.HOST || '127.0.0.1';
const MAX_BODY_BYTES = Number(process.env.MAX_BODY_BYTES || 100e6);
const GEMINI_API_KEY = String(process.env.GEMINI_API_KEY || '');
// .env'de GEMINI_TTS_MODEL iki kez geçer; node --env-file'da SON satır kazanır.
const GEMINI_TTS_MODEL = String(process.env.GEMINI_TTS_MODEL || 'gemini-3.1-flash-tts-preview'); // v1.178: 2.5-flash-preview-tts ücretsiz kotası 0 (HTTP 429)
const GEMINI_TTS_VOICE = String(process.env.GEMINI_TTS_VOICE || 'Aoede');
const GEMINI_IMAGE_MODEL = String(process.env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image');

const CORS_BASE_HEADERS = {
  'access-control-allow-methods': 'GET, POST, OPTIONS',
  'access-control-allow-headers': 'content-type, accept, authorization',
};
// v1.195: CORS allowlist — yalnız güvenilen yerel kökenler yankılanır; izinsiz
// köken ACAO almaz (tarayıcı yanıtı okuyamaz → drive-by kota tüketimi engellenir).
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
  // v1.195: taşmada reject + destroy + return (analysis ile birebir aynı davranış).
  request.on('data', c => { size += c.length; if (size > MAX_BODY_BYTES) { reject(Object.assign(new Error('REQUEST_TOO_LARGE'), { status: 413 })); request.destroy(); return; } chunks.push(c); });
  request.on('end', () => {
    try { resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {}); }
    catch (e) { reject(Object.assign(new Error('INVALID_JSON'), { status: 400 })); }
  });
  request.on('error', reject);
});

// -- Gemini generateContent yardımcıları --------------------------------------
const geminiGenerate = async (model, payload) => {
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': GEMINI_API_KEY },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(120_000),
  });
  if (!r.ok) throw new Error(`gemini ${model} HTTP ${r.status}: ${(await r.text()).slice(0, 300)}`);
  return r.json();
};

const extractInline = data => (data?.candidates?.[0]?.content?.parts || [])
  .map(p => p.inlineData).filter(Boolean)
  .map(({ mimeType, data: base64 }) => ({ mimeType, base64 }));

// -- Uç noktalar --------------------------------------------------------------
const handleImage = async body => {
  const prompt = String(body.prompt || '').trim();
  if (!prompt) { const e = new Error('PROMPT_REQUIRED'); e.status = 400; throw e; }
  const payload = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { responseModalities: ['IMAGE'] },
  };
  // Monolit davranışı (satır 5571): görsel modelleri sırayla denenir.
  const modelos = body.model ? [body.model] : ['gemini-2.5-flash-image', 'gemini-3.1-flash-image'];
  const attempts = [];
  for (const model of modelos) {
    try {
      const data = await geminiGenerate(model, payload);
      const images = extractInline(data);
      if (images.length) return { images, model, attempts };
      attempts.push({ model, error: 'inline veri yok' });
    } catch (error) {
      attempts.push({ model, error: String(error?.message || error).slice(0, 240) });
    }
  }
  const e = new Error('Tüm görsel modelleri başarısız.');
  e.status = 502;
  e.attempts = attempts;
  throw e;
};

const handleTts = async body => {
  const text = String(body.text || '').trim();
  if (!text) { const e = new Error('TEXT_REQUIRED'); e.status = 400; throw e; }
  const voice = body.voice || GEMINI_TTS_VOICE;
  const payload = {
    contents: [{ role: 'user', parts: [{ text }] }],
    generationConfig: {
      responseModalities: ['AUDIO'],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } },
    },
  };
  const data = await geminiGenerate(body.model || GEMINI_TTS_MODEL, payload);
  // v1.195: boş Gemini yanıtı artık 502 ile reddedilir (fail-closed) —
  // eski davranış ok:true + audio:null sessiz düşüşüydü.
  const audio = extractInline(data)[0];
  if (!audio) {
    const e = new Error('TTS ses verisi yok (candidates/inlineData boş döndü).');
    e.status = 502;
    e.attempts = [{ model: body.model || GEMINI_TTS_MODEL, error: 'inline audio yok' }];
    throw e;
  }
  return { audio, voice, model: body.model || GEMINI_TTS_MODEL };
};

// -- Uç noktalar --------------------------------------------------------------

const server = createServer(async (request, response) => {
  try {
    if (request.method === 'OPTIONS') return response.writeHead(204, corsHeaders(request)).end();
    if (request.url === '/health' && request.method === 'GET') {
      return writeJson(200, response, {
        ok: true, service: 'media',
        models: { image: GEMINI_IMAGE_MODEL, tts: GEMINI_TTS_MODEL },
        voice: GEMINI_TTS_VOICE,
        keys: { gemini: Boolean(GEMINI_API_KEY) },
      }, request);
    }
    if (request.url.startsWith('/api/media/image') && request.method === 'POST') {
      const body = await readJson(request);
      const result = await handleImage(body);
      return writeJson(200, response, { ok: true, ...result }, request);
    }
    if (request.url.startsWith('/api/media/tts') && request.method === 'POST') {
      const body = await readJson(request);
      const result = await handleTts(body);
      return writeJson(200, response, { ok: true, ...result }, request);
    }
    return writeJson(404, response, { ok: false, code: 'NOT_FOUND', message: 'Media API yolu bulunamadı.' }, request);
  } catch (error) {
    return writeJson(error?.status || 500, response, { ok: false, code: error?.message || 'SERVER_ERROR', attempts: error?.attempts }, request);
  }
});

server.listen(PORT, HOST, () => console.log(`[media] http://${HOST}:${PORT} (image:${GEMINI_IMAGE_MODEL}, tts:${GEMINI_TTS_MODEL} / ${GEMINI_TTS_VOICE})`));
