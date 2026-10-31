// ============================================================================
// v1.202 UÇTAN UCA KANIT: gateway /api/freellmapi/tts köprüsü → FreeLLMAPI → ses
// Kanıt: tasks/probe-v202-gateway-tts.out.wav
// ============================================================================
import fs from 'node:fs';

const r = await fetch('http://127.0.0.1:4100/api/freellmapi/tts', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ input: 'Kapı kanıt denemesi: FreeLLMAPI köprüsü uçtan uca çalışıyor.', voice: 'Aoede' }),
  signal: AbortSignal.timeout(150000),
});
console.log(`HTTP ${r.status}; provider: ${r.headers.get('x-provider')}`);
if (!r.ok) { console.log((await r.text()).slice(0, 400)); process.exit(1); }
const buf = Buffer.from(await r.arrayBuffer());
const riff = buf.length > 44 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WAVE';
console.log(`${buf.length} byte; RIFF=${riff}`);
if (riff) { fs.writeFileSync(new URL('./probe-v202-gateway-tts.out.wav', import.meta.url), buf); console.log(`KANIT: tasks/probe-v202-gateway-tts.out.wav (${(buf.length / 1024).toFixed(0)} KB)`); }
