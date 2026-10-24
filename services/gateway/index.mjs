// ============================================================================
// OTONOM v1.176 — GATEWAY MİKRO SERVİS (port: GATEWAY_PORT / 4100)
// Sorumluluk: CORS, /health, /proxy (+/api/proxy) sayfa proxy, /api/gemini-proxy
//             (Gemini anahtarı sunucuda kalır), /api/* isteklerini analysis (4201)
//             ve media (4202) servislerine yönlendir.
// İlke: zero-dependency (node:http + node:fetch) — server.mjs stiliyle uyumlu.
// ============================================================================
import { createServer } from 'node:http';

const GEMINI_ORIGIN = 'https://generativelanguage.googleapis.com';
const GEMINI_MAX_BODY_BYTES = 100 * 1024 * 1024;
const ALLOWED_MODEL_ACTION = /^\/v1(?:beta)?\/models\/[A-Za-z0-9._-]+:(?:generateContent|streamGenerateContent|predict)$/;

const GEMINI_API_KEY = String(process.env.GEMINI_API_KEY || '');
const ANALYSIS_PORT = Number(process.env.ANALYSIS_PORT || 4201);
const MEDIA_PORT = Number(process.env.MEDIA_PORT || 4202);
const PORT = Number(process.env.GATEWAY_PORT || 4100);
const HOST = process.env.HOST || '127.0.0.1';

const CORS_HEADERS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'access-control-allow-headers': 'content-type, accept, authorization, x-requested-with',
};

const json = (status, code, message, extra = {}) => new Response(
  JSON.stringify({ ok: status < 400, status, code, message, ...extra }),
  { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...CORS_HEADERS } },
);

const readBody = request => new Promise((resolveBody, rejectBody) => {
  const chunks = [];
  let size = 0;
  request.on('data', chunk => {
    size += chunk.length;
    if (size > GEMINI_MAX_BODY_BYTES) {
      const error = new Error('REQUEST_TOO_LARGE');
      error.status = 413;
      rejectBody(error);
      request.destroy();
      return;
    }
    chunks.push(chunk);
  });
  request.on('end', () => resolveBody(Buffer.concat(chunks)));
  request.on('error', rejectBody);
});

// -- Gemini proxy (server/gemini-proxy.mjs mantığının uyarlanmış kopyası) ------
const parseGeminiTarget = incomingUrl => {
  const url = new URL(incomingUrl);
  const rawTarget = url.searchParams.get('target') || '';
  if (!rawTarget.startsWith('/') || rawTarget.startsWith('//')) return null;
  let targetUrl;
  try { targetUrl = new URL(rawTarget, GEMINI_ORIGIN); } catch (_) { return null; }
  if (targetUrl.origin !== GEMINI_ORIGIN || !ALLOWED_MODEL_ACTION.test(targetUrl.pathname)) return null;
  targetUrl.searchParams.delete('key');
  return targetUrl;
};

const handleGeminiProxy = async request => {
  if (request.method !== 'POST') return json(405, 'METHOD_NOT_ALLOWED', 'Gemini geçidi yalnızca POST kabul eder.');
  if (!GEMINI_API_KEY.trim()) return json(503, 'GEMINI_SECRET_MISSING', 'Sunucuda GEMINI_API_KEY tanımlı değil (.env).');
  const targetUrl = parseGeminiTarget(`http://local${request.url || ''}`);
  if (!targetUrl) return json(400, 'INVALID_GEMINI_TARGET', 'İzin verilmeyen Gemini API yolu.');
  const body = await readBody(request);
  const upstream = await fetch(targetUrl, {
    method: 'POST',
    headers: {
      'content-type': request.headers['content-type'] || 'application/json',
      accept: request.headers.accept || 'application/json',
      'x-goog-api-key': GEMINI_API_KEY,
    },
    body,
  });
  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: { 'content-type': upstream.headers.get('content-type') || 'application/json; charset=utf-8', ...CORS_HEADERS },
  });
};

// ---- Sayfa proxy (v1.176): Haber Linki akışı sunucu tarafından HTML çeker ----
// Tarayıcıdan CORS yüzünden çekilemeyen haber sayfaları; üçüncü parti ücretsiz
// CORS proxy'leri ölü/yoğun. Kendi gateway'imizde sıfır bağımlılık çözüm.
const PROXY_TIMEOUT_MS = 25000;
const PROXY_MAX_BYTES = 10 * 1024 * 1024;
const PROXY_BLOCKED_HOST = /^(localhost$|127\.|10\.|192\.168\.|169\.254\.|172\.(?:1[6-9]|2\d|3[01])\.|\[::1\])/i;

const readUpTo = async (body, cap) => {
  const reader = body.getReader();
  const chunks = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    chunks.push(value);
    if (size > cap) {
      try { reader.cancel(); } catch (_) {}
      const error = new Error('PROXY_RESPONSE_TOO_LARGE');
      error.status = 413;
      throw error;
    }
  }
  return Buffer.concat(chunks);
};

const handlePageProxy = async incomingUrl => {
  const url = new URL(`http://local${incomingUrl}`);
  let target;
  try { target = new URL(url.searchParams.get('url') || ''); } catch (_) { target = null; }
  if (!target || !/^https?:$/i.test(target.protocol) || PROXY_BLOCKED_HOST.test(target.hostname)) {
    return json(400, 'INVALID_PROXY_TARGET', 'İzin verilmeyen proxy hedefi (yalnızca http/https dış adresler).');
  }
  let upstream;
  try {
    upstream = await fetch(target, {
      headers: {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/*,*/*;q=0.8',
        'accept-language': 'tr,en;q=0.8',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(PROXY_TIMEOUT_MS),
    });
  } catch (error) {
    return json(502, 'PROXY_UPSTREAM_FAILED', `Hedef siteye gateway ulaşamadı: ${String(error?.message || error)}`);
  }
  const contentType = upstream.headers.get('content-type') || '';
  if (contentType && !/^(?:image|text\/html|application\/(?:xhtml\+xml|xml))/i.test(contentType) && contentType !== 'application/json') {
    return json(415, 'PROXY_UNSUPPORTED_CONTENT', `Desteklenmeyen içerik türü: ${contentType}`);
  }
  const payload = await readUpTo(upstream.body, PROXY_MAX_BYTES);
  return new Response(payload, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: { 'content-type': contentType || 'text/html; charset=utf-8', 'cache-control': 'no-store', ...CORS_HEADERS },
  });
};

// -- Alt servislere passthrough ----------------------------------------------
const handlePassthrough = (name, port) => async request => {
  const targetPath = request.url || '/';
  const targetBase = `http://127.0.0.1:${port}`;
  const targetUrl = new URL(targetPath, targetBase);
  const body = request.method === 'GET' || request.method === 'HEAD' ? undefined : await readBody(request);
  // undici fetch'e SADECE güvenli minimal header seti iletilir; connection/expect/
  // transfer-encoding gibi hop-by-hop başlıkları geçmek 400/502'ye yol açar.
  const headers = {
    'content-type': request.headers['content-type'] || 'application/json',
    accept: request.headers.accept || 'application/json',
  };
  try {
    const upstream = await fetch(targetUrl, { method: request.method, headers, body, duplex: 'half' });
    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: { 'content-type': upstream.headers.get('content-type') || 'application/json; charset=utf-8', ...CORS_HEADERS },
    });
  } catch (error) {
    return json(502, `${name}_UNREACHABLE`, `${name} servisine gateway ulaşılamadı (port ${port}).`, { detail: String(error?.message || error) });
  }
};

const SERVICE_ALIASES = [
  { prefix: '/api/gemini-proxy', handler: undefined }, // özel (aşağıda)
  { prefix: '/api/analysis', name: 'ANALYSIS', port: ANALYSIS_PORT },
  { prefix: '/api/media', name: 'MEDIA', port: MEDIA_PORT },
];

// -- Health probe -------------------------------------------------------------
const probe = async port => {
  try {
    const r = await fetch(`http://127.0.0.1:${port}/health`, { signal: AbortSignal.timeout(1500) });
    return r.ok;
  } catch (_) { return false; }
};

const server = createServer(async (request, response) => {
  try {
    if (request.method === 'OPTIONS') {
      response.writeHead(204, CORS_HEADERS).end();
      return;
    }
    if (request.url === '/health' || request.url === '/api/health') {
      const [analysisOk, mediaOk] = await Promise.all([probe(ANALYSIS_PORT), probe(MEDIA_PORT)]);
      response.writeHead(200, { 'content-type': 'application/json; charset=utf-8', ...CORS_HEADERS });
      response.end(JSON.stringify({ ok: true, gateway: PORT, analysis: { port: ANALYSIS_PORT, up: analysisOk }, media: { port: MEDIA_PORT, up: mediaOk }, geminiKey: Boolean(GEMINI_API_KEY.trim()) }));
      return;
    }
    if (request.url.startsWith('/api/gemini-proxy')) {
      const upstream = await handleGeminiProxy(request);
      response.writeHead(upstream.status, Object.fromEntries(upstream.headers));
      response.end(Buffer.from(await upstream.arrayBuffer()));
      return;
    }
    // v1.176: Haber Linki akışı için ham sayfa/görsel proxy (/#/api/proxy takma adı).
    if (request.url.startsWith('/proxy') || request.url.startsWith('/api/proxy')) {
      const upstream = await handlePageProxy(request.url);
      response.writeHead(upstream.status, Object.fromEntries(upstream.headers));
      response.end(Buffer.from(await upstream.arrayBuffer()));
      return;
    }
    const matched = SERVICE_ALIASES.find(a => a.name && request.url.startsWith(a.prefix));
    if (matched) {
      const upstream = await handlePassthrough(matched.name, matched.port)(request);
      response.writeHead(upstream.status, Object.fromEntries(upstream.headers));
      response.end(Buffer.from(await upstream.arrayBuffer()));
      return;
    }
    const notFound = json(404, 'NOT_FOUND', 'Gateway API yolu bulunamadı.');
    response.writeHead(notFound.status, Object.fromEntries(notFound.headers));
    response.end(Buffer.from(await notFound.arrayBuffer()));
  } catch (error) {
    response.writeHead(error?.status || 500, { 'content-type': 'application/json; charset=utf-8', ...CORS_HEADERS });
    response.end(JSON.stringify({ ok: false, code: error?.message || 'SERVER_ERROR', message: 'Gateway isteği işleyemedi.' }));
  }
});

server.listen(PORT, HOST, () => console.log(`[gateway] http://${HOST}:${PORT} (analysis:${ANALYSIS_PORT}, media:${MEDIA_PORT}, geminiKey:${Boolean(GEMINI_API_KEY.trim())})`));
