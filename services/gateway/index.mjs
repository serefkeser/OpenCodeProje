// ============================================================================
// OTONOM v1.195 — GATEWAY MİKRO SERVİS (port: GATEWAY_PORT / 4100)
// Sorumluluk: CORS, /health, /proxy (+/api/proxy) sayfa proxy, /api/gemini-proxy
//             (Gemini anahtarı sunucuda kalır), /api/music (kalıcı müzik deposu),
//             /api/* isteklerini analysis (4201) ve media (4202) servislerine yönlendir.
// İlke: zero-dependency (node:http + node:fetch) — server.mjs stiliyle uyumlu.
// v1.195: CORS allowlist (CORS_ORIGIN) — izinsiz köken ACAO almaz; gövde sınırı
//         MAX_BODY_BYTES (analysis/media ile ortak sabit).
// ============================================================================
import { createServer } from 'node:http';
import { mkdirSync, readFileSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const GEMINI_ORIGIN = 'https://generativelanguage.googleapis.com';
const MAX_BODY_BYTES = Number(process.env.MAX_BODY_BYTES || 100e6);
const ALLOWED_MODEL_ACTION = /^\/v1(?:beta)?\/models\/[A-Za-z0-9._-]+:(?:generateContent|streamGenerateContent|predict)$/;

const GEMINI_API_KEY = String(process.env.GEMINI_API_KEY || '');
const ANALYSIS_PORT = Number(process.env.ANALYSIS_PORT || 4201);
const MEDIA_PORT = Number(process.env.MEDIA_PORT || 4202);
const PORT = Number(process.env.GATEWAY_PORT || 4100);
const HOST = process.env.HOST || '127.0.0.1';

// v1.195: allowlist — yalnız güvenilen yerel kökenlere ACAO verilir (CORS_ORIGIN).
// Alt servislerin bıraktığı eski ACAO ('*' dahil) writeHead öncesi silinir.
const CORS_ALLOWED_ORIGINS = String(process.env.CORS_ORIGIN || 'http://localhost:5173,http://127.0.0.1:5173')
  .split(',').map(s => s.trim()).filter(Boolean);
const corsAllowOrigin = request => {
  const origin = String(request?.headers?.origin || '');
  return (origin && CORS_ALLOWED_ORIGINS.includes(origin)) ? { 'access-control-allow-origin': origin } : {};
};

const CORS_HEADERS = {
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
    if (size > MAX_BODY_BYTES) {
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
  // v1.188: Cloudflare/bot meydan okuma sayfasını ham 200/403 yerine açık kodla işaretle;
  // böylece gazete liste çekişi "yayım yok" değil "bot koruması" gerçek nedenini bilir.
  const challengePeek = payload.slice(0, 4096).toString('utf8');
  if ((upstream.status === 403 || upstream.status === 503) && /just a moment|challenges\.cloudflare|attention required|cf-chl/i.test(challengePeek)) {
    return json(503, 'CF_CHALLENGE', 'Kaynak site bot koruması (Cloudflare) meydan okuması döndürdü; içerik çekişi engellendi.');
  }
  if (upstream.status === 403) {
    return json(503, 'PROXY_UPSTREAM_FORBIDDEN', `Kaynak site 403 döndürdü (bot koruması olabilir): ${target.hostname}`);
  }
  return new Response(payload, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: { 'content-type': contentType || 'text/html; charset=utf-8', 'cache-control': 'no-store', ...CORS_HEADERS },
  });
};

// -- Kalıcı müzik deposu (v1.185) ---------------------------------------------
// Uzantı IndexedDB köprüsü yerine kendi diskimizde kalıcı kütüphane:
// services/gateway/muzik/ katalogda {id,name,mimeType,bytes,updatedAt}, parça
// verisi <id>.audio (kaba byte). Uzantı protokolü ile aynı sınırlar:
// id ^fm_[A-Za-z0-9_-]{1,230}$, parça başına 32 MB, yalnız audio/ veya
// application/(ogg|octet-stream) data-URL. Parça /api/media/{görsel} değil;
// app'in MUSIC_* protokolüyle birebir aynı JSON şekli korunur.
const MUSIC_DIR = fileURLToPath(new URL('./muzik/', import.meta.url));
const MUSIC_CATALOG = `${MUSIC_DIR}catalog.json`;
const MUSIC_ID_RE = /^fm_[a-zA-Z0-9_-]{1,230}$/;
const MUSIC_MAX_BYTES = 32 * 1024 * 1024;
const MUSIC_DATAURL_RE = /^data:(audio\/[\w.+-]+|application\/(?:ogg|octet-stream));base64,/;
const MUSIC_SECURE_NAME = /^[^\\/:*?"<>|\r\n]{1,200}$/;

const musicReadCatalog = () => {
  try { return JSON.parse(readFileSync(MUSIC_CATALOG, 'utf8')); } catch (_) { return []; }
};
const musicWriteCatalog = entries => {
  mkdirSync(MUSIC_DIR, { recursive: true });
  // Atomik benzeri yazım: önce .tmp, sonra katalog; yarı-yazılmış katalog riski kalmaz.
  const tmp = `${MUSIC_CATALOG}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify(entries, null, 1));
  rmSync(MUSIC_CATALOG, { force: true });
  writeFileSync(MUSIC_CATALOG, JSON.stringify(entries, null, 1));
  rmSync(tmp, { force: true });
};

const musicList = () => {
  const entries = musicReadCatalog();
  return json(200, 'OK', 'ok', { count: entries.length, tracks: entries });
};

const musicDelete = async incomingUrl => {
  const url = new URL(`http://local${incomingUrl}`);
  const id = String(url.searchParams.get('id') || '');
  if (!MUSIC_ID_RE.test(id)) return json(400, 'INVALID_MUSIC_ID', `Geçersiz müzik id: ${id.slice(0, 40)}`);
  const entries = musicReadCatalog();
  const next = entries.filter(e => e.id !== id);
  if (next.length === entries.length) return json(404, 'MUSIC_NOT_FOUND', `id katalogda yok: ${id.slice(0, 40)}`);
  musicWriteCatalog(next);
  rmSync(`${MUSIC_DIR}${id}.audio`, { force: true });
  return json(200, 'OK', 'ok', { deleted: id });
};

const musicPut = async request => {
  if (request.method !== 'PUT' && request.method !== 'POST') {
    return json(405, 'METHOD_NOT_ALLOWED', 'Müzik kaydı yalnızca PUT/POST kabul eder.');
  }
  const raw = (await readBody(request)).toString('utf8');
  let track;
  try { track = JSON.parse(raw || '{}')?.track; } catch (_) { return json(400, 'INVALID_MUSIC_JSON', 'Gövde JSON çözümlenemedi.'); }
  const id = String(track?.id || '');
  const name = String(track?.name || '');
  const dataUrl = String(track?.data || track?.dataUrl || '');
  if (!MUSIC_ID_RE.test(id)) return json(400, 'INVALID_MUSIC_ID', `Geçersiz müzik id: ${id.slice(0, 40)}`);
  if (!MUSIC_SECURE_NAME.test(name)) return json(400, 'INVALID_MUSIC_NAME', 'Geçersiz müzik dosya adı.');
  if (!MUSIC_DATAURL_RE.test(dataUrl)) return json(415, 'UNSUPPORTED_MUSIC_MIME', 'data yalnızca audio/* veya application/(ogg|octet-stream) kabul eder.');
  try {
    const b64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
    const bytes = Buffer.from(b64, 'base64');
    if (!bytes || bytes.length < 64 || bytes.length > MUSIC_MAX_BYTES) {
      return json(413, 'MUSIC_TOO_LARGE_OR_EMPTY', `Parça boyutu 64 B..${MUSIC_MAX_BYTES} aralığında olmalı.`);
    }
    const mime = dataUrl.slice(5, dataUrl.indexOf(';')).trim();
    mkdirSync(MUSIC_DIR, { recursive: true });
    const updatedAt = new Date().toISOString();
    const entries = musicReadCatalog().filter(e => e.id !== id);
    entries.push({ id, name, mimeType: mime, bytes: bytes.length, updatedAt });
    writeFileSync(`${MUSIC_DIR}${id}.audio`, bytes);
    musicWriteCatalog(entries);
    return json(200, 'OK', 'ok', { track: { id, name, mimeType: mime, bytes: bytes.length, updatedAt } });
  } catch (error) {
    return json(500, 'MUSIC_WRITE_FAILED', `Müzik diske yazılamadı: ${String(error?.message || error)}`);
  }
};

const musicGet = async incomingUrl => {
  const url = new URL(`http://local${incomingUrl}`);
  const id = String(url.searchParams.get('id') || '');
  if (!MUSIC_ID_RE.test(id)) return json(400, 'INVALID_MUSIC_ID', `Geçersiz müzik id: ${id.slice(0, 40)}`);
  const file = `${MUSIC_DIR}${id}.audio`;
  if (!existsSync(file)) return json(404, 'MUSIC_DATA_MISSING', `Parça verisi diskte yok: ${id.slice(0, 40)}`);
  const entry = musicReadCatalog().find(e => e.id === id) || { id, mimeType: 'application/octet-stream', name: id };
  try {
    const blob = new Blob([readFileSync(file)], { type: entry.mimeType || 'application/octet-stream' });
    const base64 = Buffer.from(await blob.arrayBuffer()).toString('base64');
    return json(200, 'OK', 'ok', { track: { id, name: entry.name, mimeType: entry.mimeType, data: `data:${entry.mimeType};base64,${base64}` } });
  } catch (error) {
    return json(500, 'MUSIC_READ_FAILED', `Parça diskten okunamadı: ${String(error?.message || error)}`);
  }
};

const handleMusicApi = async request => {
  if (request.method === 'PUT' || request.method === 'POST') return musicPut(request);
  if (request.method === 'DELETE') return musicDelete(request.url);
  const url = new URL(`http://local${request.url}`);
  if (url.searchParams.get('id')) return musicGet(request.url);
  return musicList();
};

// -- Günlük gazete manifest önbelleği (v1.188) ---------------------------------
// Uygulama seçilen tarihi kaynaklardan başarıyla doğruladığında listeyi buraya
// kaydeder (services/gateway/gazete/manifest-<tarih>.json). Kaynaklar sonradan
// bot koruması/erişim engeline düşerse AYNI günün kanıtlı listesi hatırlanır.
// Asla yanlış/eski tarihli liste sunulmaz: dosya adı tarihi denir, yalnız
// o tarihin kendisi için okunabilir.
const GAZETE_DIR = fileURLToPath(new URL('./gazete/', import.meta.url));
const GAZETE_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const GAZETE_NAME_MAX = 60;
const GAZETE_MANIFEST_MAX_NAMES = 80;
const gazeteManifestPathFor = date => `${GAZETE_DIR}manifest-${date}.json`;

const gazeteManifestGet = async incomingUrl => {
  const url = new URL(`http://local${incomingUrl}`);
  const date = String(url.searchParams.get('date') || '');
  if (!GAZETE_DATE_RE.test(date)) return json(400, 'INVALID_GAZETE_DATE', 'date YYYY-MM-DD biçiminde olmalı.');
  const file = gazeteManifestPathFor(date);
  if (!existsSync(file)) return json(404, 'GAZETE_MANIFEST_CACHE_MISS', `${date} için önbelleğe alınmış doğrulanmış liste yok.`);
  try {
    const manifest = JSON.parse(readFileSync(file, 'utf8'));
    return json(200, 'OK', 'ok', { date, manifest });
  } catch (error) {
    return json(500, 'GAZETE_CACHE_READ_FAILED', `Önbellek okunamadı: ${String(error?.message || error)}`);
  }
};

const gazeteManifestPut = async request => {
  if (request.method !== 'POST') return json(405, 'METHOD_NOT_ALLOWED', 'Manifest kaydı yalnızca POST kabul eder.');
  let body;
  try { body = JSON.parse((await readBody(request)).toString('utf8') || '{}'); } catch (_) {
    return json(400, 'INVALID_GAZETE_JSON', 'Gövde JSON çözümlenemedi.');
  }
  const date = String(body?.date || '');
  const source = String(body?.source || '').slice(0, 120);
  const status = Array.isArray(body?.status) ? body.status.map(String).slice(0, 20) : [];
  const rawNames = Array.isArray(body?.names) ? body.names : [];
  if (!GAZETE_DATE_RE.test(date)) return json(400, 'INVALID_GAZETE_DATE', 'date YYYY-MM-DD biçiminde olmalı.');
  if (!rawNames.length || rawNames.length > GAZETE_MANIFEST_MAX_NAMES) {
    return json(400, 'INVALID_GAZETE_NAMES', `names 1..${GAZETE_MANIFEST_MAX_NAMES} adet gazete adı içermeli.`);
  }
  const clean = [...new Set(rawNames.filter(n => typeof n === 'string' && n.trim().length && n.length <= GAZETE_NAME_MAX).map(n => n.trim()))];
  if (!clean.length) return json(400, 'INVALID_GAZETE_NAMES', 'names boş/geçersiz.');
  mkdirSync(GAZETE_DIR, { recursive: true });
  writeFileSync(gazeteManifestPathFor(date), JSON.stringify({
    date, names: clean, source, status, savedAt: new Date().toISOString(),
  }, null, 1));
  return json(200, 'OK', 'ok', { saved: date, count: clean.length });
};

const handleGazeteManifestApi = async request => {
  if (request.method === 'POST') return gazeteManifestPut(request);
  return gazeteManifestGet(request.url);
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
  // v1.195: tüm upstream Response'lar tek noktadan yazılır; alt servis/gateway'in
  // bıraktığı eski ACAO silinir, yalnız allowlist'te köken yankılanır.
  const send = async upstream => {
    const headers = Object.fromEntries(upstream.headers);
    delete headers['access-control-allow-origin'];
    response.writeHead(upstream.status, { ...headers, ...corsAllowOrigin(request) });
    response.end(Buffer.from(await upstream.arrayBuffer()));
  };
  try {
    if (request.method === 'OPTIONS') {
      response.writeHead(204, { ...CORS_HEADERS, ...corsAllowOrigin(request) }).end();
      return;
    }
    if (request.url === '/health' || request.url === '/api/health') {
      const [analysisOk, mediaOk] = await Promise.all([probe(ANALYSIS_PORT), probe(MEDIA_PORT)]);
      response.writeHead(200, { 'content-type': 'application/json; charset=utf-8', ...CORS_HEADERS, ...corsAllowOrigin(request) });
      response.end(JSON.stringify({ ok: true, gateway: PORT, analysis: { port: ANALYSIS_PORT, up: analysisOk }, media: { port: MEDIA_PORT, up: mediaOk }, geminiKey: Boolean(GEMINI_API_KEY.trim()) }));
      return;
    }
    if (request.url.startsWith('/api/gemini-proxy')) {
      await send(await handleGeminiProxy(request));
      return;
    }
    // v1.176: Haber Linki akışı için ham sayfa/görsel proxy (/#/api/proxy takma adı).
    if (request.url.startsWith('/proxy') || request.url.startsWith('/api/proxy')) {
      await send(await handlePageProxy(request.url));
      return;
    }
    // v1.185: kalıcı müzik deposu (uzantı IndexedDB yerine gateway diski).
    if (request.url.startsWith('/api/music')) {
      await send(await handleMusicApi(request));
      return;
    }
    // v1.188: günlük gazete manifest önbelleği (doğrulanmış listenin diske kaydı).
    if (request.url.startsWith('/api/gazete-manifest')) {
      await send(await handleGazeteManifestApi(request));
      return;
    }
    const matched = SERVICE_ALIASES.find(a => a.name && request.url.startsWith(a.prefix));
    if (matched) {
      await send(await handlePassthrough(matched.name, matched.port)(request));
      return;
    }
    await send(json(404, 'NOT_FOUND', 'Gateway API yolu bulunamadı.'));
  } catch (error) {
    response.writeHead(error?.status || 500, { 'content-type': 'application/json; charset=utf-8', ...CORS_HEADERS, ...corsAllowOrigin(request) });
    response.end(JSON.stringify({ ok: false, code: error?.message || 'SERVER_ERROR', message: 'Gateway isteği işleyemedi.' }));
  }
});

server.listen(PORT, HOST, () => console.log(`[gateway] http://${HOST}:${PORT} (analysis:${ANALYSIS_PORT}, media:${MEDIA_PORT}, geminiKey:${Boolean(GEMINI_API_KEY.trim())})`));
