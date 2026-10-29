# OTONOM CHANGELOG

Görsel ve okunabilir sürüm kaydı. Sürüm 4'lü yama ile artar:
**App.tsx ÖZET comment + `APP_VERSION` + `FIX_CHECKLIST` girdisi + `web/index.html` title** →
`
npx vite build` kanıtı → commit (Türkçe özel karakter yok) → push → **bu dosyaya da bir satır eklenir**.

Uygulama içinde sürüm rozetinden de görülür: **OTONOM Chatgpt_1.188 • ONE-PAGE**.
Kesin sürüm referansı `web/src/App.tsx` içinde `APP_VERSION`; burası insan-okuyan kopyasıdır.

---

## v1.199 — (29 Ekim 2026, TEŞHİS: SON SÖZ FAIL-STOP ARTIK GERÇEK NEDENİ TAŞIR)
**Kullanıcı FAILED raporu: "Son Söz seslendirmesi üretilemedi" — ama ayrıntıda neden yoktu.**

- **Kök neden:** fail-stop mesajı generic; `generateAudio` sebebi (günlük kota / RPM penceresi / canlı model yok / 45 sn zaman aşımı / yetkilendirme) yalnız günlüğe yazıyor, hata metnine taşımıyor.
- **Düzeltme:** `_ttsLastFailure` modül değişkeni — her null dönüş noktasında dürüst neden kaydeder (gün-kota + yenileme saati, zincirde canlı model kalmadı, tüm denemeler + son hata); başarıda temizlenir; Son Söz fail-stop artık `Neden: ...` içerir.
- **Davranış aynen:** sessiz atlama yok, fail-closed korunur; render yine durur — yalnız teşhis şeffaflığı.
- **Kanıt:** `npx vite build` ✓.

## v1.198 — (29 Ekim 2026, PROMPT: YORUMLA BAŞLIKLARI AÇIKLAMA KURALI)
**Kullanıcı talebi: gazete videosunda büyük başlıklar sadece okunmasın; her başlık 2-3 cümleyle açıklansın; anlatıcı 50 yıllık medya editörü tonunda olsun.**

- **Persona:** YORUMLA anlatı promptu artık "50 yıllık gazete sırasında yetişmiş medya editörü" kimliğiyle yazıyor; ses yine kadın spiker Aoede.
- **Kural:** Her büyük başlık için ayrılmaz iki adım — (1) harfiyen 1 kez oku, (2) hemen ardından 2-3 tam cümleyle anlamlandır (olay/iddia + araştırma notunun kim/ne/kaynak katkısı + vatandaş için önem). Başlık listeletmek yasak; dayanak yalnız araştırma notu + görselden okunan metin; uydurma yasak (fail-closed aynen).
- **Kelime bütçesi:** gazete bölümü 25-40 → 130-220 kelime; toplam 1300-1550 hedefi ve TTS istek sayısı aynen (yalnız metin dağılımı değişti).
- **Genişletme:** tekrar-üretim promptu "yalnız başlığı okuyup geçen hiçbir bölüm kalmasın" zorunluluğu aldı.
- **Kanıt:** `npx vite build` ✓.

## v1.197 — (29 Ekim 2026, BUGFIX: TTS GÜNLÜK KOTA DEFTERİ + HIZLI DÜRÜST DURUŞ)
**Canlı log + prob kök nedeni kesinleştirdi: TTS 429'lar günlük kota — ücretsiz katmanda model başına 10 istek/GÜN (3 model = 30/gün), yenilenme ~10:00 TR.**

- **Kanıt:** 429 gövdesi `quotaId: GenerateRequestsPerDayPerProjectPerModel-FreeTier`, `quotaValue: "10"`, `retryDelay: "33699s"` (9 sa 21 dk) — `tasks/probe-v197-429body.out.txt`.
- **Anlamı:** bekleyerek toparlanamaz; dünkü çoklu koşular bütçeyi tüketti. 30 sn'lik toparlanma denemesi (v1.196) bu pencerede beyhudeler.
- **Düzeltme:** (1) `fetchWithRetry` son 429'da gövdeden `retryDelay` okur → `HTTP_FAIL_429;retryDelay=Xs;perDay=1`; (2) `generateAudio` günlük sinyalde modeli **TTS günlük kota defterine** yazar (localStorage, anahtar parmak iziyle bağlı) ve beklemeden sonraki canlı modele geçer; tüm modeller döndüyse istek hiç açılmadan dürüst hata; (3) **iş akışı başlangıç kapısı:** ses isteyen video koşusu, defter doluysa analiz/görsel kotası yakılmadan baştan durur; (4) RPM penceresi (≤5 dk) için 3/6 sn + 30 sn davranışı korunur.
- **Fail-closed aynen:** sessiz atlama yok; her düşüş sebep adıyla günlükte.
- **Kanıt:** `probe-v197-429body`, `npx vite build` ✓.

## v1.196 — (28 Ekim 2026, BUGFIX: SON SÖZ TTS KOTA TOPARLANMASI)
**Kullanıcı FAILED raporu: "Son Söz seslendirmesi üretilemedi; video render durduruldu."**

- **Kök neden (kanıt):** koşu Son Söz'e kadar geldi → önceki tüm TTS/analiz/görsel çağrıları başarılı, gateway sağlıklı; 3 dk sonra `probe-v196-tts` üç TTS modelini de PASS etti (178/148/141 KB) → arıza penceresi RPM kota dibi. Son Söz koşunun **son** TTS'i olduğu için 6 hızlı deneme (fetchWithRetry iç bekleme ~1-2 sn + zincir arası 0 sn) aynı dakika penceresinde 429'a çarptı; generic hata mesajı 429 durumunu yutuyordu.
- **Düzeltme:** (1) `generateAudio` denemeler arası 3/6 sn bekleme + 429 sinyalinde 30 sn bekleyip 4. toparlanma denemesi; (2) `fetchWithRetry` tükenen 429/5xx penceresinde son durumu korur (`HTTP_FAIL_429`) — bilgi kaybı kapanır; (3) boş TTS yanıtında finishReason/blockReason tanı logu. **Fail-closed aynen:** toparlanma da düşerse Son Söz yine dürüstçe fail-stop yapar.
- **Kanıt:** probe-v196-tts (3× PASS), `npx vite build` ✓.

## v1.195 — (28 Ekim 2026, PONYTAIL-AUDIT: 10 DÜZELTME)
**Kullanıcı onayı: audit bulgularının hepsi sırasıyla uygulandı (2 MUST + 4 SHOULD + 4 NICE).**

- **MUST:** media TTS fail-closed (boş ses yanıtı artık 502, `ok:true+audio:null` sessiz düşüşü kaldırıldı); media readJson 50 MB üstünde destroy+return (bellek şişmesi fix).
- **SHOULD:** ölü kök kopya `haber_saas_sistemiii.tsx` (2.49 MB) silindi, README canlı kodu tarif ediyor; App.tsx'teki ölü `localhost:3457` adayları + ölü `GAZETE_PROXY_ENDPOINTS`/`OTONOM_BACKEND` sabitleri kaldırıldı; veri yollarında (job durumu, müzik kütüphanesi, elle kapak) `ErrorHandler.silent` → `ErrorHandler.log` (arızalar sistem günlüğünde); CORS allowlist (`CORS_ORIGIN`, varsayılan localhost/127.0.0.1:5173) — drive-by kota tüketimi kapanır.
- **NICE:** package.json/README sürüm senkronu (1.195.0); `scripts/test-services.mjs` 11 ışın smoke test (kota harcamaz); spawn-all çökmede sınırlı yeniden başlatma (3 sn × 3); `MAX_BODY_BYTES` ortak sabit.
- **Kanıt:** node --check ×3, `node scripts/test-services.mjs` 11/11 PASS, `npx vite build` ✓.
- **Aynen:** YORUMLA/gazete/render/cache/recorder akışları değişmedi.

## v1.194 — (28 Ekim 2026, BUGFIX: BAŞLIK OKUMA/SESLENDİRME)
**Kullanıcı talebi: haberleri okurken yanlış cümle kuruluyor; önce oku, anla, sonra seslendir; %100 doğru, kafadan uydurma yok.**

- **Kök neden:** gazete kartına tıklama akışında `analyzeContentForImage` şeması
  `gazeteBasliklari` isterdi ama prompt'ta başlık çıkarma kuralı YOKTU; model iki
  başlığı tek maddeye yazabiliyor, `aciklama`'ya uydurma bağlam koyabiliyordu.
  Seslendirme metni `baslik + '. ' + aciklama` birebir birleştiriliyordu.
- **Düzeltme:** sysPrompt'a "GAZETE BAŞLIK OKUMA VE SESLENDİRME KURALLARI" —
  (A) her başlık TEK TEK harfiyen; iki başlığı birleştirme YASAK, (B) skor/rakam/
  isim birebir, (C) kesik başlıkta uydurma yasak, (D) her madde tek başlık,
  (E) `aciklama` yalnız görselde yazan spotla sınırlı (yoksa boş), (F) sonra anla
  ve seslendir — akıcı tam cümleler, başlıklar kendi cümlesinde kalır.
- **Kod tarafı:** `spokenText` birleştirmesi normalize edildi (fazla nokta/boşluk
  temizliği; boş açıklamada yalnız başlık okunur). Karşılaştırma manşet okuma
  prompt'una "her başlık TEK madde" eklendi.

Kanıt: `npx vite build` ✓ (4.68 s); canlı doğrulama kullanıcı koşusuyla (Fotomaç
tipi tek gazete akışı) yapılacak.

---

## v1.193 — (27 Ekim 2026, özellik: ELLE KAPAK YÜKLEME)
**Kullanıcı talebi: çekilemeyen gazetelere elle kapak yükleme; diğer gazeteler gibi davranış.**

- **Grid karta 3. ikon (amber, UploadCloud)** + tekli görünümde "Kapak Yükle" butonu —
  placeholder kartlarda da görünür; hangi gazeteyse o yüklendikten sonra düzgün akış alır.
- **Persist:** IndexedDB (`AssetManagerService.saveMedia('GAZETE_MANUAL_<tarih>_<ad>')`) —
  yenileme/oturum sonrası kapak `hydrateManualGazeteCovers` ile geri gelir.
  GAZETE_CACHE localStorage dataURL yasağı aynen korunur.
- **Akış:** kapak `applyManualGazeteCover` ile candidate head'e girer (revision++,
  placeholder sona düşer). Tık→video akışı `_gazeteImageLock`, çift-karşılaştırma,
  Crop, Tam Sayfa Ekle — **kod değişikliği olmadan** o kapağı kullanır.
- **Dürüstlük:** sources'a `Elle/Yükleme`, system log + amber vurgu; kapak kullanıcı
  beyanıdır, "kaynakta doğrulanmış" denmez. Kapak yüklendiği tarihe bağlanır.
  Doğrulama: image/*, 8 KB min, 12 MB max, compressImage max 1080px.

Kanıt: `npx vite build` ✓ (5.27 s); tık/akış canlı süreçte kullanıcı onayı ile doğrulanabilir.

---

## v1.192 — (27 Ekim 2026, BUGFIX+İSTEK paketi)
**"Yeni Asya ve Milli Gazete gelmemiş" kök nedeni + kullanıcı sıralama/Analiz/BİK + hızlandırma.**

- **Kök neden (kanıt):** `fetchViaOtonomGazeteBackend` aday çözücüsü gateway'i tanımıyordu —
  `REACT_APP_BACKEND_URL` tanımsız, aday listesi pratikte yalnız ölü `localhost:3457`;
  gerçek gateway (127.0.0.1:4100) yalnız vite define `__OTONOM_GATEWAY__`'de. BİK gövdesi
  gateway `/proxy`'den **8.16 sn**'de geliyor [probe-v192-latency] ama taşıma penceleri
  (4.5/5.0/1.6 sn) yetişemez → 13:35 manifest "BİK/İlkSayfalar:0/gövde-alınamadı";
  dijitalbasin Jina/markdown'a düşer → `.publication-name` yok → extract 0.
  Çözüm: aday çözer `__OTONOM_GATEWAY__` (root .env GATEWAY_PORT; hardcode yok) +
  `backendTimeoutMs` seçeneği + BİK/DijitalBasin rescue'da `backendFirst` 16 sn.
- **Takip listesi:** kullanıcının verdiği 31 gazete sırasıyla dizildi; **Günboyu** çıkarıldı
  (`GAZETE_EXCLUDED` + v1.188 örneği). SEÇ ekranı + `stableGazeteOrder` otomatik uyar.
- **Analiz gazetesi:** BİK'ten gelir (`bik: true` — BİK 20/20 alt-tarihli ANALİZ kartı kanıtlı).
- **Hızlandırma:** HTTP 429 koruması — geçici nedenle silahlanan 3 dk kapı, istek BETS
  başarılı döndüğünde temizlenir (401/403 kapısı açılmaz). Önceki koşuda kapı 14:19:57'ye
  silahlı kalmıştı.
- **7 bilgilendirme warn→info** (v1.150 KİT ×2, SAHNE KİLİDİ, v1.84 CAPTURE, v1.83 ×2,
  MP4 hızlı-mod atlandı, FFmpeg exit(0)) — davranış değişmez. MP4 SON KONTROL decoder
  gerçek doğrulama (donuk kare engeli) — dokunulmadı.

Kanıt: `tasks/probe-v192-live.elastic.mjs`, `tasks/probe-v192-latency.mjs`,
`manifest-2026-10-26.json` 13:35 durumu; `npx vite build` ✓.

---

## v1.191 — (26 Ekim 2026 akşam, kükreş)
**Kullanıcı kaynak teklifi: BİK + dijitalbasin — 6 gazete isim+kapak entegrasyonu.**

- **BİK İlk Sayfalar (`kapsam=yaygin`):** 20 kart SSR'de; figcaption = gazete adı,
  alt = "GG Ay Yıl - ... tarihli X gazetesi ilk sayfası" tarih kanıtı [kanıt: 20/20
  tarihli, KORKUSUZ/MİLLİ GAZETE/YENİ ASYA dahil]. **4. ana kaynak** (minCount 15).
  Ayrıca Cumhuriyet/Sözcü/Hürriyet/Karar/BirGün/Dünya/Türkiye... bu kaynaktan gelen
  Gelir; ayrıca Cumhuriyet/Sözcü/Hürriyet/Karar/BirGün/Dünya/Türkiye... adları BİK'ten
  doğrulanır; Korkusuz/Milli Gazete/Yeni Asya kapakları BİK tam çözünürlük sayfasıdır.
- **dijitalbasin:** Read/331 Evrensel, Read/504 Gazete Pencere, Read/321 Diriliş
  Postası — SSR `publication-name`+`publication-date` [kanıt: 3× 26 Ekim 2026];
  kapak `GetPublicationDisplay?publicationId=` JPEG. Kart-başına tarih eşleşmesi
  ZORUNLU; eşleşmezse ne ad ne kapak verilir (fail-closed aynen).
- **Yan etkisi:** Pencere (kendi sitesi CF'de) dijitalbasin'den canlı gelir; BİK
  CF-blok günlerinde ana kaynak olabilir. Mevcut kaynaklar ve fail-closed mantığı
  şaşmaz; asistan canlı süreçlere dokunmaz (kullanıcı yenileme yapar).

Kanıt: `tasks/probe-v191-*.mjs`, `tasks/probe-bik-count.mjs`, `tasks/probe-db-count.mjs`; `npx vite build` ✓.

---

## v1.190 — (26 Ekim 2026 akşam)
**"Video oluşturulamadı (0 Bayt)" kök nedeni çözüldü: sessiz MediaRecorder ölümü artık kanıtlı yakalanır.**

- **Teşhis (kullanıcı FAILED logu kanıtı):** 26 Ekim 12:55 BirGün üretiminde MediaRecorder
  finalize'den **ÖNCE** sessizce inaktif olmuş (render sırasında recorder.stop() çağıran
  kod yolu yok; onerror/onstop/track-onended izleyici hiç kurulmamıştı) → 265.21 sn boyunca
  ölü kayda çizim yapıldı → finalize'de `state=inactive` + **0 parça** → belirsiz
  "0 Bayt" hatası (kayıt büyük olasılıkla ilk dakikada kırılmıştı: hiç byte boyutlu
  dilim dönmemiş).
- **RECORDER GUARD (kalıcı çözüm):**
  - `recorder.onerror` + video/auto track `onended` gözleyicileri → ölüm **sebep +
    saniye + parça sayısı** ile loglanır (bir daha sessiz ölüm olmaz).
  - `nextFrame` canarisi her ~5 sn `recorder.state` yoklar → inaktifse render **ANINDA**
    `RENDER_RECORDER_DEAD` ile durur; ölü kayda dakikalar harcanmaz.
  - 0 Bayt hata mesajı artık ölüm kanıtını taşır ("RECORDER GUARD: ... sn'de kırıldı").
  - Fail-closed aynen: boş/ölü video asla kabul edilmez, sessiz düşüş yok.
- **Dokunulmayanlar:** render planı, ses miksajı, GOLDEN MASTER (kare-mad) testi,
  Timer-Worker watchdog, gazete kaynakları (v1.188/1.189 yolları) — hepsi şaşmaz.

Kanıt: kullanıcı FAILED logu (142 satır) + executeRender kod taraması + `npx vite build` ✓.

---

## v1.189 — (26 Ekim 2026)
**GazeteOku/Aydınlık Turnstile denendi, geçilemedi → evrensel.net 4. kaynak eklendi.**

- **FlareSolverr denemesi [kesin ölçüm]:** headless + görünür mod + `tabs_till_verify` —
  iki site de **interaktif Turnstile** istiyor; FlareSolverr hiçbir varyantta geçemedi
  (0 kart, clearance cookie yok; README de "captcha solvers çalışmıyor" diyor). App
  entegrasyonu yapılmadı (ölü kod); kullanıcının kaldırması önerilir.
- **Başarılı yol:** `evrensel.net/gazete?date=YYYY-MM-DD` seçili tarihi **SSR ile**
  veriyor (bugün kanıtlandı: 2026-10-26 + 80 manşet gövdesi + MANŞETİ bölümü).
  `fetchVerifiedGazeteManifest` 4. kaynak eklendi: **Evrensel/kendi** (minCount 1;
  yalnız kendi adını besler; **tarih + MANŞETİ + dosya görseli** zorunlu — tarih
  eşleşmezse ad verilmez, fail-closed aynen).
- Dünya / Tavır / Gazete Pencere: toplama sitelerdeki CF engeli kalktığında otomatik
  döner (geçici IP engeli). Analiz ve Nasıl Bir Ekonomi: bugün hiçbir kaynakta kart
  yok — ayrı 4. kaynak tartışması sürer.

Künye: kanıt prob'ları `tasks/probe-flaresolverr.mjs`, `tasks/probe-flare-tabs.mjs`,
`tasks/probe-evrensel-*.mjs`; `npx vite build` ✓.

---

## v1.188 — (25 Ekim 2026)
**İki paket: (a) gri gazetelerin kalıcı çözümü + takipten 3 çıkarma, (b) medya analizi `HABER_DOGRULANAMADI` kök nedeni.**

**Gri gazeteler [kesin tanı — 25 Ekim]:** GazeteOku + Aydınlık kaynakları bu makineden
**Cloudflare bot koruması (403 "Just a moment")** döndürmeye başladı (Jina reader dahil
aynı challenge; dün 200 idi → IP bazlı geçici engel). Kapı doğru DURDU ama mesaj
"yayınlanmamış olabilir" diye görünüyordu. Çözüm üç katman:
- `services/gateway/index.mjs /proxy`: CF meydan okuma sayfası → **503 `CF_CHALLENGE`**; 403 → `PROXY_UPSTREAM_FORBIDDEN`
- `App.tsx fetchVerifiedGazeteManifest`: `botBlocked` kaynaklar mesajda **"bot koruması"** olarak gerçek adıyla raporlanır (fail-closed aynen; yanlış/eski liste yine gösterilmez)
- **Gün-önbelleği:** doğrulanmış liste `/api/gazete-manifest` POST ile `services/gateway/gazete/manifest-<tarih>.json`'a yazılır; kaynaklar engellendiğinde GET ile **aynı günün kanıtı** devam eder (gerçekten yanlış tarihten koruma; `.gitignore` girdisi eklendi)
- **Matine esnetmesi:** bugün (TR takvimi) saat ≥08:00 iken tamamlama eşiği 3→1; geçmiş tarih/gece aynen 3
- Takipten çıkarıldı: **Dokuz Sütun, Güneş, Yeni Yüzyıl** (`GAZETE_EXCLUDED`)

**Medya analizi haber doğrulama:** görsel verildiğinde `verifyNewsFromImage` istekleri
200 dönüp **grounding boş** geliyordu → `HABER_DOGRULANAMADI`. Tanı: (1)
`gemini-2.5-flash` **thinking token'ları `maxOutputTokens:2000` bütçesini yiyip**
metni 0'a düşürüyor (200 + boş içerik); (2) kota döneminde **HTTP 429** yığını
probda üç varyantta da doğrulandı (`You exceeded your current quota`) — bu
"kaynak bulunamadı" diye çarpıtılıyordu. Çözüm: `thinkingBudget:0` +
`maxOutputTokens:4000`; başarısız denemede `finishReason`/çıktı/düşünme token
logları; **429 → "API kota/ağ sınırı" dürüst mesajı** + kota durumunda 2. deneme
atlanır. Fail-closed kapı aynen: kaynak yoksa üretim yine DURUR.

Künye: kanıt prob'ları `tasks/probe-gri-gazete*.mjs`, `tasks/probe-gzt-detay.mjs`,
`tasks/probe-haber-verify.mjs`; `node --check` gateway ✓; `npx vite build` ✓.

---

## v1.187 — `4aeb74c` (26 Ekim 2026)
**Kullanıcı talebi: gazeteler eksik kaldığında diğer kaynaklardan tamamlanması.**
`fetchVerifiedGazeteManifest`: çapak korundu — en az **BİR** kaynak kendi eşiğini
(GazeteOku 20 / GZT 20 / Aydınlık 15) tutmalı; hiçbiri tutmazsa süreç durur
(v1.186 mesajıyla per-kaynak tarihi bildirir; fail-closed aynen).
Daha önce eşiği tutmayan kaynak **tamamen** dışlanıyordu; artık **3+ adı+tarih
kanıtlı** ad üreten kısmi kaynaklar birleşime katılır → eksik gazeteler diğer
kaynaklardan tamamlanır. Kanıt: `npx vite build` ✓ (4.90s), rozet Chatgpt_1.187.

## v1.186 — `167c504` (26 Ekim 2026)
**Gazete doğrulama hatası artık kaynak başına en güncel tarihi raporlar.**
`GAZETE_MANIFEST_VERIFY` "sayfalar alındı ancak eşleşme yok" dalı mesajda her
kaynağın gördüğü en güncel tarihi verir (örn. "GazeteOku en fazla 24 Ekim 2026
tarihli içerik sundu", "GZT 25 Ekim başlığı sundu ama liste JS ile yükleniyor")
ve DURUR — eski/yarım liste gösterilmez. Tanı kanıtı: 25 Ekim gece (olumlu
dönem yok) — GazeteOku kartları HÜRRİYET 24 Ekim 2026; Aydınlık
storage/newspapers yalnız 2026-10-24 (gateway dışı doğrudan çekişte aynı);
GZT SSR listesiz. Kaynaklar o saatte günün sayılarını yayımlamamıştı; kapı
fail-closed doğru davranışı gösterdi.

## v1.185 — `10271a4` (25 Ekim 2026)
**Uzantı bağımsızlık: müzik kütüphanesi gateway disk deposuna taşındı.**
Firefox uzantısı (OTONOM_1_105) tamamen gereksiz oldu. Gateway (4100)
`/api/music` kalıcı depo klasörü (`services/gateway/muzik/` — katalog.json +
`<id>.audio`). Yerel IndexedDB birincil önbellek; gateway kapalıysa açık WARN,
sessiz düşme yok. Kanıt: `probe-gateway-music.mjs` 8/8 PASS.

## v1.184 — `f06885e` (25 Ekim 2026)
**TTS null → sessiz kalma düzeltmesi.** Kapak clickbait ve sahne anlatım TTS
null döndüğünde tek yeniden deneme; yine null ise açık ERROR (sessiz yutma
yok). Render, sesi olmayan sahneyi açık WARN ile geçer. Kanıt: konuşma-bandı
RMS haritası.

## v1.183 — canlı izleme panoya başına sürüm ekleme (`OTONOM Chatgpt_1.183 — canlı izleme logları`)

## v1.182 — analiz zinciri boş sahne döndürünce tek yeniden deneme (NO_SCENES fail-closed korunur)

## v1.181 — TR TTS binlik ayraç birleştirme ("3 000" → "üç bin") + kapak silüet yedeği + Gemini TTS 3.8 WAV başlığı (cızırtı) çözümü

## v1.180 — analiz zinciri kesik JSON onarımı + canlı izleme çöken metrik kartı kaldırma

## v1.179 — Gemini kota bitince kendi analysis zincirine otomatik devir + canlı izleme HATA/LİMİT beyaz sayfa çöküş düzeltmesi

## v1.178 — BGM sessiz başarısızlık instrumentation + TTS kotasız model zincir (3.1 → 3.8 → 3.8-lite)

## v1.177 — Kapak görseli yokken tamamen boş kare yerine şablon kapak çizimi

## v1.176 — Yerel gateway `/proxy` (SSRF guard) + görsel indirme yolu

## v1.175 — Gemini model emekliye ayrılma + google_search JSON şema uyumu

## v1.174 — Ücretsiz görsel arama yedeği (Wikipedia / Wikimedia)

## v1.173 — Buffer paylaşım katmanı koddan tamamen çıkarıldı (MP4 yerelde saklanır/indirilir)

## v1.171 — MP4 otomatik onarım döngüsü (10 adımlı strateji sadeleşme)

## v1.170 — MP4 süre kilidi + müzik tail'e (donmuş son karede müzik devam etmesin)

## Önceki sürümler (1.169 → 1.102 arası)
Çift döngüsü (42-video sıra), süreç defteri kalıcı ilerleme, ses kapıları,
okunabilir dosya adları, önizleme-ended kapısı vb. — tam metin `web/src/App.tsx`
`FIX_CHECKLIST` dizisinde; geliştirici geçmişi için `git log --oneline`.

---

## Taşınabilir paket — `e1a5e6d` (26 Ekim 2026)
App davranış değişikliği değildir, dağıtım imkânı: `.env.example` (21 anahtar,
API adları boş), `KURULUM-PAKET.md` (Mac + Windows 8 adım), `START-Windows.bat`
ve `START-Mac.sh` tek-komut launcher. `.env` git'e ASLA girmez; müzik deposu
(`services/gateway/muzik/`) de commit edilmez, yeni makinede ADIM 6 ile
yeniden aktarılır.
