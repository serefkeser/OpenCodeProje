// ============================================================================
// OTONOM v1.172 — MEDIA MİKRO SERVİS (port: MEDIA_PORT / 4202)
// Sorumluluk: Görsel üretimi (Gemini), TTS (GEMINI_TTS_MODEL + GEMINI_TTS_VOICE),
//             Buffer API köprüsü (token sunucuda kalır).
// Uç noktalar: POST /api/media/image, POST /api/media/tts,
//              POST /api/buffer/proxy, GET /health
// ============================================================================
import { createServer } from 'node:http';

const PORT = Number(process.env.MEDIA_PORT || 4202);
const HOST = process.env.HOST || '127.0.0.1';
const GEMINI_API_KEY = String(process.env.GEMINI_API_KEY || '');
// .env'de GEMINI_TTS_MODEL iki kez geçer; node --env-file'da SON satır kazanır.
const GEMINI_TTS_MODEL = String(process.env.GEMINI_TTS_MODEL || 'gemini-2.5-flash-preview-tts');
const GEMINI_TTS_VOICE = String(process.env.GEMINI_TTS_VOICE || 'Aoede');
const GEMINI_IMAGE_MODEL = String(process.env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image');
const BUFFER_TOKEN = String(process.env['Buffer'] || process.env.BUFFER_API_TOKEN || '');
const BUFFER_ORIGIN = 'https://api.bufferapp.com';

const CORS_HEADERS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
  'access-control-allow-headers': 'content-type, accept, authorization',
};

const writeJson = (status, nodeResponse, body) => {
  nodeResponse.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...CORS_HEADERS });
  nodeResponse.end(JSON.stringify(body));
};

const readJson = request => new Promise((resolve, reject) => {
  const chunks = [];
  let size = 0;
  request.on('data', c => { size += c.length; if (size > 50e6) reject(Object.assign(new Error('REQUEST_TOO_LARGE'), { status: 413 })); chunks.push(c); });
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
  const audio = extractInline(data)[0];
  return { audio: audio || null, voice, model: body.model || GEMINI_TTS_MODEL };
};

// -- Buffer passthrough -------------------------------------------------------
const handleBuffer = async request => {
  const url = new URL(`http://local${request.url || ''}`);
  const targetPath = url.searchParams.get('path') || '';
  if (!/^\/[0-9a-z._/-]+$/i.test(targetPath)) return { error: Buffer.from(JSON.stringify({ ok: false, code: 'INVALID_BUFFER_PATH' })) };
  const targetUrl = `${BUFFER_ORIGIN}${targetPath}`;
  const raw = await new Promise((resolve, reject) => {
    const chunks = [];
    request.on('data', c => chunks.push(c));
    request.on('end', () => resolve(Buffer.concat(chunks)));
    request.on('error', reject);
  });
  const apiResponse = await fetch(targetUrl, {
    method: request.method,
    headers: {
      'content-type': request.headers['content-type'] || 'application/json',
      ...(BUFFER_TOKEN ? { authorization: `Bearer ${BUFFER_TOKEN}` } : {}),
    },
    body: request.method === 'GET' || request.method === 'HEAD' ? undefined : raw,
  });
  return { upstream: apiResponse };
};

const server = createServer(async (request, response) => {
  try {
    if (request.method === 'OPTIONS') return response.writeHead(204, CORS_HEADERS).end();
    if (request.url === '/health' && request.method === 'GET') {
      return writeJson(200, response, {
        ok: true, service: 'media',
        models: { image: GEMINI_IMAGE_MODEL, tts: GEMINI_TTS_MODEL },
        voice: GEMINI_TTS_VOICE,
        keys: { gemini: Boolean(GEMINI_API_KEY), buffer: Boolean(BUFFER_TOKEN) },
      });
    }
    if (request.url.startsWith('/api/media/image') && request.method === 'POST') {
      const body = await readJson(request);
      const result = await handleImage(body);
      return writeJson(200, response, { ok: true, ...result });
    }
    if (request.url.startsWith('/api/media/tts') && request.method === 'POST') {
      const body = await readJson(request);
      const result = await handleTts(body);
      return writeJson(200, response, { ok: true, ...result });
    }
    if (request.url.startsWith('/api/buffer/') && request.method === 'POST') {
      const { upstream, error } = await handleBuffer(request);
      if (error) return writeJson(400, response, JSON.parse(error.toString()));
      response.writeHead(upstream.status, {
        'content-type': upstream.headers.get('content-type') || 'application/json; charset=utf-8',
        ...CORS_HEADERS,
      });
      return response.end(Buffer.from(await upstream.arrayBuffer()));
    }
    return writeJson(404, response, { ok: false, code: 'NOT_FOUND', message: 'Media API yolu bulunamadı.' });
  } catch (error) {
    return writeJson(error?.status || 500, response, { ok: false, code: error?.message || 'SERVER_ERROR', attempts: error?.attempts });
  }
});

server.listen(PORT, HOST, () => console.log(`[media] http://${HOST}:${PORT} (image:${GEMINI_IMAGE_MODEL}, tts:${GEMINI_TTS_MODEL} / ${GEMINI_TTS_VOICE}, buffer:${Boolean(BUFFER_TOKEN)})`));
