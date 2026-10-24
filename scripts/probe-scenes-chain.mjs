// v1.181 tanı: NO_SCENES_GENERATED — zincir (gpt-oss-120b) gerçek üretim sysPrompt'uyla
// 0 sahne mı döndürüyor? App.tsx'ten ANALİZ sysPrompt'u BİREBİR çıkarılır (kelime kelime),
// üretimdeki değerlemelerle (unlimited haber akışı) doldurulur, _stripJsonConfigForSearch
// birebir simüle edilir ve zincire (gateway /api/analysis/text, maxTokens 8192) gönderilir.
// NOT: haber metni gerçek üretimdekiyle birebir DEĞİLDİR (sayfayı çekmiyoruz); sahne-sayısı
// tanısı metnin açık sözlü yapısına bağlığı, birebir metin gerekmediği için sentez yazıldı.
import fs from 'node:fs';

const src = fs.readFileSync(new URL('../web/src/App.tsx', import.meta.url), 'utf8');

// --- 1) sysPrompt şablonunu kaynağınıdan çıkar -----------------------------
const tagStart = 'const sysPrompt = `';
const i0 = src.indexOf(tagStart);
if (i0 === -1) throw new Error('sysPrompt bulunamadı');
const s0 = i0 + tagStart.length;
const endMarker = 'Dönüş ZORUNLU olarak JSON formatında olmalı.`;';
const i1 = src.indexOf(endMarker, s0);
if (i1 === -1) throw new Error('sysPrompt kapanışı bulunamadı');
let tpl = src.slice(s0, i1 + endMarker.length - 2); // backtick hariç

// --- 2) üretim değerlemeleri (haber linki + unlimited + deep_analysis + yorum boş) ---
const context = {
  sceneCount: 'İçeriğe göre en az 10, ortalama 18-25 sahne',
  isImageOutput: false,
  words: 'İçeriği eksiksiz anlatacak kadar esnek',
  langInstruction: 'BÜTÜN SENARYOYU TÜRKÇE YAZACAKSIN.',
  styleInstruction: 'Video stili: Tarafsız, analitik, ciddi ve keskin bir haber editörü.',
  dynamicRules: 'BİRİNCİ KURAL (DERİN ANALİZ): 5N1K dengesini sorgula ve sosyolojik/ekonomik etkileri analiz et.\nİKİNCİ KURAL: Skandalsa \'mediaBlackout.show\' true yap.\nÜÇÜNCÜ KURAL: \'sonSoz\' alanını tekrarlama.\nDÖRDÜNCÜ KURAL: Her sahnenin \'spokenText\' metni NOKTA İLE BİTEN BİR CÜMLE OLMALIDIR.\nSÜRE SINIRI YOKTUR. Olayı detaylıca anlat.',
  sonSozInstruction: '\n\nYEDİNCİ KURAL (SON SÖZ): Haberin/gazetenin GENEL OLARAK NE ANLATTIĞINA bak ve konuya uygun kısa bir Son Söz seç. [probe kısaltması: buildSonSozCategoryPrompt] ... \'sonSozKaynak\' kişi adı, klasik eser + yazar veya "Sinema temalı özgün söz" / "Animasyon temalı özgün söz" biçiminde kısa kaynak olsun. KESİNLİKLE TEKRAR ETME — aşağıdaki liste daha önce kullanılmış Son Sözlerdir:\n[probe kısaltması: buildSonSozHistoryPrompt]',
};
const unresolved = [];
const evalCtx = context;
const sysPrompt = tpl.replace(/\$\{([^}]*)\}/g, (_, expr) => {
  try {
    return new Function(...Object.keys(evalCtx), `"use strict"; return (${expr});`)(...Object.values(evalCtx));
  } catch (e) {
    unresolved.push(`${expr} (${String(e?.message || e).slice(0, 60)})`);
    return `<ÇÖZÜLEMEDİ:${expr}>`;
  }
});
if (unresolved.length) console.log('ÇÖZÜMLENEMEYEN placeholder:', unresolved);

// --- 3) responseSchema üretimdekiyle birebir -------------------------------
const responseSchema = {
  type: "OBJECT",
  properties: {
    isContentUnreadable: { type: "BOOLEAN" },
    videoSlides: { type: "ARRAY", items: { type: "OBJECT", properties: { topText: { type: "STRING" }, spokenText: { type: "STRING" }, imagePrompts: { type: "ARRAY", items: { type: "STRING" } } }, required: ["topText", "spokenText", "imagePrompts"] } },
    thumbnailText: { type: "STRING" },
    sonSoz: { type: "STRING" },
    sonSozKaynak: { type: "STRING" },
    lastQuote: { type: "STRING" },
    thumbnailImagePrompt: { type: "STRING" },
    tiktokTitle: { type: "STRING" },
    tiktokDescription: { type: "STRING" },
    tiktokHashtags: { type: "ARRAY", items: { type: "STRING" } },
    kaynaklar: { type: "ARRAY", items: { type: "OBJECT", properties: { baslik: { type: "STRING" }, url: { type: "STRING" }, tarih: { type: "STRING" } }, required: ["baslik", "url"] } },
    mediaBlackout: { type: "OBJECT", properties: { show: { type: "BOOLEAN" }, percentageCovered: { type: "NUMBER" }, percentageIgnored: { type: "NUMBER" }, mediaNames: { type: "ARRAY", items: { type: "STRING" } }, explanation: { type: "STRING" } }, required: ["show", "percentageCovered", "percentageIgnored", "mediaNames", "explanation"] },
    gazeteBasliklari: { type: "ARRAY", items: { type: "OBJECT", properties: { baslik: { type: "STRING" }, aciklama: { type: "STRING" }, x: { type: "NUMBER" }, y: { type: "NUMBER" }, w: { type: "NUMBER" }, h: { type: "NUMBER" } }, required: ["baslik", "aciklama"] } },
    chartData: { type: "OBJECT", properties: { show: { type: "BOOLEAN" }, type: { type: "STRING" }, title: { type: "STRING" }, note: { type: "STRING" }, items: { type: "ARRAY", items: { type: "OBJECT", properties: { label: { type: "STRING" }, value: { type: "NUMBER" } }, required: ["label", "value"] } } } }
  },
  required: ["isContentUnreadable", "videoSlides", "thumbnailText", "sonSoz", "sonSozKaynak", "lastQuote", "thumbnailImagePrompt", "tiktokTitle", "tiktokDescription", "tiktokHashtags", "mediaBlackout"]
};

// --- 4) kullanıcı parçası (url+_articleText yolu) --------------------------
// Gerçek makale varsa (tasks/nefes-real-article.txt) BİREBİR kullanılır; yoksa sentez.
let article = '';
try { article = fs.readFileSync(new URL('../tasks/nefes-real-article.txt', import.meta.url), 'utf8').trim(); } catch (e) {}
if (!article) {
  article = `İzmir'de düzenlenen bir basın etkinliğinde gazetecilere halk desteği büyüdü. Kentte çok sayıda yurttaş, basın mensuplarının yanında yer alarak cumartesi günü meydanda toplandı. Katılımcılar, "özgür gazetecilik", "haberin varsa her şeyin var" ve "iyisiyle kötüsüyle haber halkın hakkı" benzeri pankartlar taşıdı. Etkinliğe meslek örgütlerinin temsilcileri de katılım gösterdi; konuşmacılar, gazetecilerin iş güvencesi, hakaret ve şiddet davalarına karşı korunması gerektiğini söyledi.

Bölgedeki gazeteciler, son dönemde haber takipleri sırasında yıldırma girişimleriyle karşılaştıklarını, bazı habercilere araç ve telefonlarına el konulduğu yönünde paylaşımlar yapıldığını aktardı.

Toplantı sonunda düzenlenen bildiri, medya kuruluşlarından yerel habere yeterli alan açmasını, yetkililerden ise gazetecilere yönelik saldırıların soruşturulmasını istedi. İmza kampanyası açıldı; ilk gün içinde binlerce imza toplandığı bildirildi. Yurttaşlar, etkinliğin ardından meslek örgütlerinin çağrısıyla gazetecilere kahve, kitap ve ekipman desteği başlattı.

İzmir Valiliği, etkinlik için güvenlik önlemi aldı; polis toplulukla konuşarak akışı korudu. Belediye yetkilisi, "Basın mensuplarımızın toplanma ve haber verme özgürlüğü her koşulda savunulur" ifadesini kullandı. Etkinlik haberleşmesinde sosyal medyada "#GazetecilereDesteğe" etiketi gündeme girdi. Organizasyon komitesi, önümüzdeki hafta benzer bir buluşmanın Ankara'da yapılacağını duyurdu.`;
  console.log('UYARI: gerçek makale yok — sentez metin kullanılıyor');
}
const realUsed = article.length > 2000 ? 'GERÇEK (2381κ yerine ' + article.length + ' karakter)' : 'SENTEZ';

const userText = `[HABER METNİ — YALNIZ BU METNE DAYAN, EKLEME/UYDURMA YAPMA]\nKaynak: Nefes\nBaşlık: İzmir'de gazetecilere büyük halk desteği\nURL: https://www.nefes.com.tr/izmirde-gazetecilere-buyuk-halk-destegi-160315\n\n${article}\n\nOlayı tam anla ve KISA BİR ÖZET ver.`;

// --- 5) _stripJsonConfigForSearch birebir (app payload'ı bundan geçiyor) ---
let systemText = sysPrompt + `\n\nSTRICT JSON OUTPUT: Dönüşün TAMAMI şu şemaya uyan TEK geçerli JSON olsun (markdown çiti, açıklama, ek metin YASAK). Şema: ${JSON.stringify(responseSchema)}`;
const parts = [{ text: userText }, { text: systemText.substring(systemText.indexOf('STRICT JSON OUTPUT')) }];

// --- 6) zincire üretim şekliyle gönder -------------------------------------
const bodyText = parts.map(p => p.text).join('\n\n');
console.log('--- system uzunluk:', sysPrompt.length, '| makale:', realUsed, '| makale uzunluk:', article.length, '| toplam prompt:', bodyText.length);
const r = await fetch('http://127.0.0.1:4100/api/analysis/text', {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ prompt: bodyText, system: systemText, maxTokens: 8192 }), // temperature app'te undefined → gönderilmez
  signal: AbortSignal.timeout(150000),
});
console.log('HTTP', r.status);
if (!r.ok) { console.log(String(await r.text()).slice(0, 400)); process.exit(1); }
const d = await r.json();
console.log('sağlayıcı:', d.provider, '| model:', d.model, '| denemeler:', JSON.stringify(d.attempts || []));
const raw = String(d.text || '');
console.log('ham uzunluk:', raw.length);

// --- 7) tıpatıp aynı gevşek parse (app _callGeminiAndParse / _parseMaybeTruncatedJson) --
const head = raw.slice(0, 300);
let parsed = null; let how = 'yok';
try {
  let t = raw.replace(/`json/gi, '').replace(/`/g, '').trim();
  const s = t.indexOf('{'); const e = t.lastIndexOf('}');
  parsed = JSON.parse(t.substring(s, e + 1)); how = 'doğrudan';
} catch (err) { how = 'kesik/ONARIM aklına: ' + String(err?.message || err); }
console.log('parse:', how);
if (!parsed) process.exit(2);
const keys = Object.keys(parsed);
console.log('anahtarlar:', keys.join(','));
const slides = parsed.videoSlides;
if (Array.isArray(slides)) {
  console.log('videoSlides: DİZİ, uzunluk', slides.length);
  slides.slice(0, 3).forEach((s, i) => console.log(`  [${i}] topText="${String(s?.topText || '').slice(0, 40)}" spoken="${String(s?.spokenText || '').slice(0, 60)}"`));
  if (slides.length === 0) console.log('>>> 0 SAHNE ÜRETİLDİ — zincir videoSlides: [] döndürdü (üretimdeki hata birebir bu)');
} else {
  console.log('videoSlides anahtarı YOK veya tip:', typeof slides, '| değeri başı:', JSON.stringify(parsed.videoSlides).slice(0, 200));
}
console.log('✓ probe tamamladı');
