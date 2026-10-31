// ============================================================================
// v1.202 PROBU: FreeLLMAPI (localhost:3001) /v1/audio/speech TTS kanıtı
// Anahtar: C:\Users\skese\Downloads\files\.env -> FREELLMAPI_UNIFIED_KEY (yazdırılmaz)
// Kanıt: tasks/probe-freellmapi-models.out.txt + tasks/probe-freellmapi-tts.out.wav
// ============================================================================
import fs from 'node:fs';

const ENV_PATH = 'C:/Users/skese/Downloads/files/.env';
const env = {};
for (const line of fs.readFileSync(ENV_PATH, 'utf8').split(/\r?\n/)) {
  const m = /^\s*([A-Za-z_0-9]+)\s*=\s*["']?([^"']*?)["']?\s*$/.exec(line);
  if (m) env[m[1]] = m[2];
}
const key = env.FREELLMAPI_UNIFIED_KEY;
if (!key) { console.log('FREELLMAPI_UNIFIED_KEY yok — probe atlandı.'); process.exit(0); }
const BASE = 'http://localhost:3001';
const H = { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };

// 1) Model kataloğu
let catalog = [];
try {
  const r = await fetch(`${BASE}/v1/models`, { headers: { Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(15000) });
  console.log(`/v1/models -> HTTP ${r.status}`);
  const j = await r.json();
  catalog = (j?.data || []).map(m => m.id || m.model || String(m));
  fs.writeFileSync(new URL('./probe-freellmapi-models.out.txt', import.meta.url), JSON.stringify(j, null, 2), 'utf8');
  console.log(`katalog: ${catalog.length} model; TTS adayları: ${catalog.filter(id => /tts|speech|audio/i.test(id)).join(', ') || '(yok)'}`);
} catch (e) {
  console.log(`/v1/models HATA: ${e?.message || e}`);
}

// 2) /v1/audio/speech denemeleri — katalog TTS adayları + bilinen adaylar
const candidates = [...new Set([
  ...catalog.filter(id => /tts|speech|audio/i.test(id)),
  'openai-audio', 'pollinations/openai-audio', 'gemini-2.5-flash-preview-tts', 'kokoro',
])].slice(0, 8);

const input = 'Merhaba. Bu bir FreeLLMAPI seslendirme kanıt denemesidir. Otuz bir Ekim, iki bin yirmi altı.';
for (const model of candidates) {
  try {
    const t0 = Date.now();
    const r = await fetch(`${BASE}/v1/audio/speech`, {
      method: 'POST', headers: H,
      body: JSON.stringify({ model, input, voice: 'alloy', response_format: 'wav' }),
      signal: AbortSignal.timeout(90000),
    });
    const ms = Date.now() - t0;
    if (!r.ok) {
      const text = await r.text();
      console.log(`[${model}] HTTP ${r.status} (${ms} ms): ${text.slice(0, 160)}`);
      continue;
    }
    const buf = Buffer.from(await r.arrayBuffer());
    const riff = buf.length > 44 && buf.toString('ascii', 0, 4) === 'RIFF';
    console.log(`[${model}] HTTP ${r.status} (${ms} ms): ${buf.length} byte, RIFF=${riff}, content-type=${r.headers.get('content-type')}, X-Provider=${r.headers.get('x-provider')}`);
    if (buf.length > 1000) {
      fs.writeFileSync(new URL('./probe-freellmapi-tts.out.wav', import.meta.url), buf);
      console.log(`KANIT KAYDEDILDI: tasks/probe-freellmapi-tts.out.wav (${(buf.length / 1024).toFixed(0)} KB, model: ${model})`);
      break;
    }
  } catch (e) {
    console.log(`[${model}] HATA: ${e?.message || e}`);
  }
}
