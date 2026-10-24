// v1.179 kanıt: gateway /api/analysis/text zinciri analiz-şeklinde JSON döndürür mü?
// (Şema metin talimatı + geçvşek parse; app'in _callAnalysisChainAndParse yolunun birebir simülasyonu.)
const schemaRule = 'STRICT JSON OUTPUT: Dönüşün TAMAMI şu şemaya uyan TEK geçerli JSON olsun (markdown çiti, açıklama, ek metin YASAK). Şema: {"type":"OBJECT","properties":{"videoSlides":{"type":"ARRAY","items":{"type":"OBJECT","properties":{"topText":{"type":"STRING"},"spokenText":{"type":"STRING"}}}},"sonSoz":{"type":"STRING"}}}';
const metin = "Antalya'da dünyanın elli yılını kurtaracak 85 lider projesinin açıklandığı haber: turizm kentinde su yönetimi ve iklim dayanıklılığı için büyük yatırım paketi; ilk etapta 12 proje öncelikli.";

const r = await fetch('http://127.0.0.1:4100/api/analysis/text', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    prompt: `HABER METNİ:\n${metin}\n\nYukarıdaki metinden 2 sahnelik haber videosu taslağı üret.`,
    system: `Sen tarafsız bir haber editörüsün.\n\n${schemaRule}`,
    temperature: 0.7,
  }),
  signal: AbortSignal.timeout(150000),
});
console.log('HTTP', r.status);
if (!r.ok) { console.log(String(await r.text()).slice(0, 400)); process.exit(1); }
const d = await r.json();
console.log('sağlayıcı:', d.provider, '| model:', d.model, '| zincir denemeleri:', JSON.stringify(d.attempts || []));
let text = String(d.text || '').replace(/`json/gi, '').replace(/`/g, '').trim();
const s = text.indexOf('{'); const e = text.lastIndexOf('}');
const parsed = JSON.parse(text.substring(s, e + 1));
console.log('PARSE OK — videoSlides:', (parsed.videoSlides || []).length, '| sonSoz:', String(parsed.sonSoz || '').slice(0, 60));
