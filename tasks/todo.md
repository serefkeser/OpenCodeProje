# tasks/todo.md — Monolit → Mikro Servis (v1.172)

Hedef: haber_saas_sistemiii.tsx içindeki AI/medya/Buffer işlemlerini .env tabanlı 3 yerel
mikro servise (gateway:4100, analysis:4201, media:4202) taşımak; web (Vite:5173) bu servislere
bağlanacak. UI menüsü ekrandan birebir korunur; Canvas render + IndexedDB tarayıcıda kalır.

- [x] 1. Ortam: .env kopya (root, gitignored), root package.json (workspaces, scripts)
- [x] 2. services/gateway — CORS, /health, /api/gemini-proxy, /analysis → 4201, /media → 4202
- [x] 3. services/analysis — text+vision analiz (OpenRouter/Groq/NVIDIA/Gemini fallback, .env modelleri)
- [x] 4. services/media — görsel üretimi, TTS (GEMINI_TTS_MODEL + Aoede), Buffer köprüsü
- [x] 5. Servis testleri — kanıt: text=OpenRouter direkt hit (attempts:[]), TTS=104.960 chars PCM, image=2 model 429 (upstream kota); passthrough header fix + spread bug fix tamamlandı
- [x] 6. web/ scaffold — Vite + React, src/App.tsx = mevcut tsx kopyası (1.172), AI çağrıları → :4100
- [x] 7. Tam akış: vite build ✓ (26 modül, 2.19 MB), dev transform ✓ (200, 7.04MB, yama aktif), servisler ✓ — tarayıcı e2e'si masaüstü browser bağlı olmadığından otomatik yapılamadı; manuel kontrol önerilir: http://localhost:5173
- [x] 8. commit + push (8fd772b — 12 dosya, 19.249 satır)

## Buffer Kaldırma (v1.173 görevi)

- [x] F1: mikro servis katmanı — media buffer köprüsü+token, gateway /api/buffer alias, .env Buffer satırı, README (kanıt: health keys{gemini:true}, 404)
- [x] F2: App.tsx yapraklar — PAYLAŞ butonu, bufferShareReport panosu, autoReview panosu+video hook'ları (playing/ended/block), Gönderim Kuyruğu tab+IIFE, canlı izleme GÖNDERİM filtresi+istatistik kartları, gazete kuyruk report şeritleri, guard-cancel satırları
- [x] F3: App.tsx subsystemler — createReviewedBufferFlow (1690+), DurablePostingQueue+POSTING_* sabitleri, BufferBudget, shareToBufferAPI+enqueue/scheduler bloğu (11011–11967), bridge fonksiyonları (probe/graphql/upload), sosyal helper blok, autoSave onPrepared kuyruk bloğu, kalıntı log metinleri + BOS if/else temizliği (tur 1–4 scriptleri: scripts/remove-buffer*.mjs)
- [x] F4: v1.173 sürüm bump (başlık+APP_VERSION+FIX_CHECKLIST BUFFER_REMOVED), ayrıca canlı izleme saati için 30sn hafif tick eklendi; kanıt: `npx vite build` ✓ 26 modül, ~2.11 MB; kalan [Bb]uffer satırları yalnız tarihî FIX_CHECKLIST girişleri + false positive (ArrayBuffer/wavBuffer/_logBuffer/AUDIO BufferSource)
Not: Sürüm notlarındaki tarihî Buffer kayıtları silinmez (geçmiş dökümanı).

Sürüm kuralı: SÜRÜM BAŞLIĞI + APP_VERSION (1,172) + SÜRÜM NOTLARI birlikte artırılır.
Not: .env anahtarlar ASLA repoya yazılmaz.

## Sıfır Maliyet Görsel Yedeği (v1.174 görevi)

- [x] G1: Tüm key/model gerçek istekle test edildi (scripts/test-models.mjs) — ÇALIŞAN: Gemini metin (gemini-2.5-flash), Gemini TTS (3.1-flash-tts-preview+Aoede), OpenRouter metin (gpt-oss-120b), OpenRouter vizyon (google/gemini-2.5-flash), Groq metin (gpt-oss-120b), NVIDIA metin (minimaxai/minimax-m3.1-flash — .env'den 404 nemotron düzeltildi), NVIDIA vizyon (meta/llama-3.2-11b-vision-instruct — .env'den 410 Gone düzeltildi). ÇALIŞMAYAN (kota/bakiye, key değil): Gemini görsel tüm Nano Banana ailesi → Google ücretsiz kotası "limit: 0"; OpenRouter görsel → 402 kredi; OpenRouter TTS → 402 (≥$0.50 bakiye); OPENCODE anahtarları kod'a bağlı değil.
- [x] G2: .env yedeği (değerler repoya yazılmaz): .env.yedek-20261024-2100; .gitignore'a `.env.yedek*` deseni eklendi.
- [x] G3: App.tsx v1.174 — MediaSynthesisService.generateImage Gemini görsel hatalarında jenerik prosedürel yedeğe düşmeden önce findFreeRealImage çalıştırır: (1) proper-isim grubunun tr.wikipedia birebir başlık görseli (ilk kelimesiz varyant dahil), (2) puanlı aramanın en üst madde sayfa görseli, (3) Commons bitmap araması. Sıfır key/ücret yok. Gazete Yorumla 16:9 gerçek-referans kapak throw'u aynen korundu. Kanıt: `npx vite build` ✓ (12.28s, 0 hata); scripts/test-wiki-fallback.mjs ile Erdoğan → bizzat Erdoğan 2025 fotoğrafı (HTTP 200, 1.5 MB), İstanbul → Boğaz köprüsü.

## Sıfır Maliyet Sağlamlık Zinciri (v1.175–v1.182)

- [x] v1.175: Gemini MODEL emekli + google_search×JSON 400 fix (_stripJsonConfigForSearch; A/B kombinasyon probu 200/200/400).
- [x] v1.176: Haber Linki sayfa/görsel çekimi yerel gateway proxy'ine (CORS + ölü ücretsiz proxy havuzları kök neden; kanıt: gerçek sayfa 200, 103 KB).
- [x] v1.177: Kapak görseli yokken boş beyaz ilk-kare mührü yerine drawThumbnail img=null tam clickbait şablonu (BLACK_FRAME_PREFLIGHT luma ölçüm düzeltmesi).
- [x] v1.179: Analysis zinciri yedeği — Gemini 429'da aynı istek şekli gateway /api/analysis/text|vision'a pas (üretimde canlı devralma kanıtı: openai/gpt-oss-120b); canlı izleme render filtresi çökme fix.
- [x] v1.180: Zincir max-token floor 8192 + _parseMaybeTruncatedJson onarım (üretim kanıtı: 224. kolon kesik JSON); SÜRE/TOKEN kartı kaldırıldı (ölen referans var → sahte veri üretilmedi).
- [x] v1.181: TTS cızırtı kök nedeni — gemini-3.8 ailesi çıplak WAV döndürüyor, çift başlık temizlendi (probe mime/format kanıtı: 3.1 l16 24000 vs 3.8 RIFF); binlik ayraçlı sayılar tek tamsayıya birleştirildi ("3 000" → "üç bin", probe 5/5); kapak silüet fallback (tImg yoksa sahne/haber görseli arka plana, coverImageForScene preflight/primer/sahne korunur).
- [x] v1.182: Üretim: zincir JSON sorunsuz ama 0 sahne → NO_SCENES_GENERATED. Tanı: probe-scenes-chain.mjs gerçek üretim sysPrompt'u App'ten birebir çıkarıp + gerçek makale + zincir = 3 turda da 12 sahne → dalgınlık [Muhtemelen]; videoSlides boşsa SAHNE ZORUNLULUĞU talimatlı tek yeniden istek + anahtar-listeli WARN + "N sahne döndürüldü" başarı logu. Kanıt: `npx vite build` ✓ (11.37s), rozet Chatgpt_1.182.
- [x] v1.183: Kullanıcı talebi — panoya kopyalanan canlı izleme logunun ilk satırına sürüm ("OTONOM Chatgpt_1.183 — canlı izleme logları (tarih)"); SÜREÇ TXT zaten Sürüm satırı taşıyordu. Kanıt: `npx vite build` ✓ (10.82s), rozet Chatgpt_1.183.
- [x] v1.184: Kullanıcı MP4 analizi (65.92 sn, konuşma-bandı RMS haritesi): (1) kapak 0-2 sn yazılı ama sessiz — kök: clickbait TTS null → koşulsuz "hazır" SUCCESS, null sessiz atama; (2) 0:48-0:52 yazı var/konuşma yok — kök: sahne TTS null sessiz atama + render 4 sn sessiz oynatma. Çözüm: her iki TTS noktasında null → WARN + tek retry, yine null → açık ERROR; render sesi olmayan sahnede açık WARN. Kanıt: `npx vite build` ✓ (6.46s), ffmpeg ölçüm kanıtı (0-2/48-51 yalnız müzik -35..-37dB; 2-47/52-65 konuşma), rozet.
- [x] v1.185: Firefox uzantısı bağımsızlık — müzik kütüphanesi gateway 4100 /api/music kalıcı deposuna taşındı (services/gateway/muzik/ klasörü; katalog.json + <id>.audio; fm_ id regex, 32 MB, yalnız audio mime). App müzik metodları (save/getAll/get/remove/mirror/refresh) uzantı MUSIC_* protokolünden gateway fetch'e bağlandı; musicExtensionRequest+probeMusicExtension silindi; yerel IndexedDB birincil önbellek; gateway kapalıysa açık WARN. Buffer köprüsü v1.173'te zaten çıkarılmıştı, gazete fetch uzantısız zinciri aynen korundu → uzantı artık tamamen gereksiz. Kanıt: probe-gateway-music.mjs 8/8 PASS ( geçici port), `npx vite build` ✓ (27.22s), uzaktan gateway restart sonrası /health ok, app ilk açılışta kendi yerel kütüphanesini gateway diskine aynaladı (polyushka.mp3, 955 KB katalogda; rozet 'Gateway Kalıcı Müzik (4100)' görünüyor; uzantı rozeti temiz).
- [x] v1.186: GAZETE_MANIFEST_VERIFY "sayfalar alındı ama eşleşme yok" dalı kaynak başına en güncel görülen tarihi açıkça raporlar + DURMA korundu (fail-closed). Tanı kanıtı (25 Ekim gece): GazeteOku/tekal HÜRRİYET 24 Ekim 2026; Aydınlık storage yalnız 2026-10-24 (gateway dışı doğrudan çekişte aynı); GZT listesi JS-render, SSR'de tarih-image eşleşmesiz → kaynaklar günün sayılarını yayımlamamıştı. Kanıt: `npx vite build` ✓ (15.57s), rozet Chatgpt_1.186.

---

## DEVAM HATTI — yarın kaldığımız yerden (güncellendi: 29 Ekim v1.198)

**Son sürüm:** v1.198 — YORUMLA BAŞLIK AÇIKLAMA KURALI: büyük başlıklar artık
sadece okunmaz; her büyük başlık harfiyen 1 kez okunup hemen ardından 2-3 tam
cümleyle anlamlandırılır (olay/iddia + araştırma notunun kim/ne/kaynak katkısı +
vatandaş için önem; dayanak yalnız araştırma notu + görselden okunan metin,
uydurma yasak). Persona 50 yıllık medya editörü; gazete bölümü bütçesi 25-40 →
130-220 kelime (toplam 1300-1550 ve TTS istek sayısı aynen). Önceki: v1.197
(`bade55d`) — TTS GÜNLÜK KOTA DEFTERİ: canlı log + probe-v197-429body TTS 429-ların
günlük kota olduğunu kesinleştirdi (ücretsiz katman: model başına 10 istek/GÜN,
3 model = 30/gün; yenilenme ~10:00 TR). fetchWithRetry retryDelay okuyup
HTTP_FAIL_429;perDay=1 fırlatır; generateAudio günlük modeli deftere yazıp
beklemesiz canlı modele geçer; tüm modeller döndüyse istek açılmadan dürüst hata;
iş akışı BAŞINDA defter doluysa koşu analiz/görsel kotası yakılmadan durur
(fail-closed aynen). v1.196 (`4577b80`) — SON SÖZ
TTS KOTA TOPARLANMASI: denemeler arası 3/6 sn + 429'da 30 sn toparlanma denemesi,
fetchWithRetry HTTP_FAIL_429 durum koruması, finishReason tanı logu. v1.195
(`b6f7f41`) — PONYTAIL-AUDIT: 10 düzeltme
(2 MUST + 4 SHOULD + 4 NICE): media TTS fail-closed (502), readJson destroy, ölü
haber_saas_sistemiii.tsx silindi + README canlı kodu tarif ediyor, App.tsx ölü
3457 adayları/ölü sabitler kaldırıldı, veri yollarında silent→log, üç serviste
CORS allowlist (CORS_ORIGIN), package.json/README sürüm senkronu,
scripts/test-services.mjs (11/11 PASS), spawn-all sınırlı yeniden başlatma,
MAX_BODY_BYTES ortak sabit. Öncesinde v1.194
(`c7a6cae`) — BAŞLIK OKUMA/SESLENDİRME: gazete tıklama akışında
analyzeContentForImage prompt'una "önce oku (harfiyen, tek başlık/madde) → anla →
seslendir" kuralları; skor/rakam birebir; uydurma yasak; spokenText birleştirmesi
normalize. v1.193 — ELLE KAPAK YÜKLEME: grid/tekli karttan
amber "Kapak Yükle" butonu; IndexedDB persist (GAZETE_MANUAL_<tarih>_<ad>) + hydrate
ile yenilemeyi geçer; akış/karşılaştırma/Crop otomatik; sources 'Elle/Yükleme' dürüst
etiketi. v1.192 (`dcce10a`) — backend adayı gateway (ölü 3457 kök nedeni), kullanıcı
31 sırası + Günboyu çıkarıldı, Analiz +BİK, 429 başarıda kapı temizlik, 7 bilgi-log.
Çalışan ağ: app :5173 (`npm run start:web`), gateway :4100, analysis :4201,
media :4202 (`npm run start:all` — spawn-all web'i kapsamıyor).
Bekleyen canlı doğrulama: v1.194 başlık okuması Fotomaç tipi koşuda dinlenecek.

**v1.188 içeriği (uygulandı):**
0. **Takipten çıkarma:** Dokuz Sütun, Güneş, Yeni Yüzyıl → `GAZETE_EXCLUDED` (iç tanıma korunur, listede görünmez).
1. **Gri gazete kök nedeni [kesin tanı]:** GazeteOku + Aydınlık Cloudflare bot koruması (403 "Just a moment", Jina reader dahil challenge; dün 200 idi → IP bazlı geçici engel). Gateway `/proxy` → 503 `CF_CHALLENGE` işareti; App `botBlocked` kaynakları "bot koruması" olarak dürüst raporlar (fail-closed aynen).
2. **Gün-önbelleği:** doğrulanmış liste gateway `/api/gazete-manifest` POST ile `services/gateway/gazete/manifest-<tarih>.json` kaydı; bot koruması gününde GET ile **aynı günün kanıtı** devam eder (`.gitignore` girdisi eklendi — canlıda test için gateway restart ister). Matine esnetmesi: bugün TR saat ≥08:00 iken tamamlama eşiği 3→1.
3. **Medya analizi HABER_DOGRULANAMADI:** iki arıza üst üste — (a) `gemini-2.5-flash` **düşünme (thinking) token'ları** maxOutputTokens:2000'i yiyip boş-200 üretiyordu; (b) 429 kota yığını "internette kaynak bulunamadı" diye çarpıtılıyordu [probe kanıtı: üç varyant da HTTP 429 "You exceeded your current quota"]. `verifyNewsFromImage`: thinkingBudget:0 + 4000 token; finishReason/çıkışToken/düşünmeToken tanı logları; 429 → "API kota/ağ sınırı" dürüst mesajı; kota durumunda 2. deneme atlanır. Fail-closed kapı aynen korunur.

**26 Ekim ek işlemi (v1.189):**
6. **FlareSolverr:** GazeteOku/Aydınlık'taki interaktif Turnstile geçilemedi (headless + görünür + tabs_till_verify; probe kanıtları tasks/). Entegrasyon YAPILMADI (ölü kod); kullanıcı kaldırsın — sürek `flaresolverr.exe` (port 8191) kapatılabilir.
7. **evrensel.net 4. kaynak:** /gazete?date= parametresi seçili tarihi SSR ile veriyor → `Evrensel/kendi` kaynağı (minCount 1, yalnız Evrensel adı; tarih+MANŞETİ+dosya img zorunlu). Dünya/Tavır/Pencere CF açılınca otomatik; Analiz ve Nasıl Bir Ekonomi kartı hiçbir kaynakta yok (ayrı tartışma).
8. **v1.190 — 0 Bayt kök neden çözüldü:** MediaRecorder sessiz ölümü (26 Ekim BirGün koşusu, FAILED log) → RECORDER GUARD (onerror + track onended logları) + nextFrame canarisi (~5 sn state yoklaması; inaktifse RENDER_RECORDER_DEAD ile anında ve sebep adıyla durur) + finalize 0 Bayt hata mesajına ölüm kanıtı. Sessiz ölümün GERÇEK tetikleyicisi (track sonu mu / encoder hatası mı) bir sonraki üretim koşusunun GUARD satırı verecek; log satırı bize iletilirse kalıcı kök düzeltmeye yürü.

**Yarın yapılacaklar (öncelik sıralı):**
1. **ÇALIŞAN PROĞRA KURAL (kullanıcı direktifi 26 Ekim):** asla canlı sürecin varsa restart/stop yapma; sürüm uygulaması tamamen YENILLE/TİTLE kapali kullanıcıda mümkün (NİC programında başjar): Web tarayıcıda Ctrl+F5; ayrı pencere source aynı git pull ile alınır. Assistan yalnız commit+push yapar; kullanıcı yeniden başlatır.
1. **Kota toplarınca doğrula:** Gemini günlük kotası bugün doldu (prob 429); kota açılınca kullanıcı haber resmini yeniden verip gerçek üretimde `verifyNewsFromImage` doğrulaması izlenir; hâlâ boş-200 olursa loglardaki finishReason/usage satırları tanıyı doğrudan verecek.
2. **Kullanıcı doğrulaması:** Ctrl+F5 → rozet Chatgpt_1.188; gazete SEÇ ekranı sabah yenileme; bot koruması gününde "bot koruması" mesajı + gün-önbelleği devreye girmeli. Gateway restart (v1.188 kodu canlıda değil).
3. **Analiz ve Nasıl Bir Ekonomi:** 3 kaynakta da seçili tarih kanıtı YOK (probe-gzt-detay: hep 404/fallback; gazeteoku/ayd listelerinde ad yok) — bugünkü koşuda gri kalır; bu ikisi için 4. kaynak tartışması ayrı karar.
4. **Bilinen bekleyen küçük madde (acil değil):** MP4 kırmızı altyazı bandında cümle-ortaş kırıkları — cümle-sınırı bölme düzeltmesi (v1.189 adayı).
5. **⏰ Sabah 4 süreç elle başlatma:** START-Windows.bat / npm run start:all ile tek komut; istenirse Windows açılışına otomatik görev.

6. Git adayları (kalıcı): commit edilmeyi bekleyen iz görüntüsü yok; `OTONOM_1_105_Firefox.zip` ve `tasks/nefes-real-article.txt` bilinçli olarak untracked bırakıldı (kullanıcı verisi/analiz malzemesi).

