# OTONOM CHANGELOG

Görsel ve okunabilir sürüm kaydı. Sürüm 4'lü yama ile artar:
**App.tsx ÖZET comment + `APP_VERSION` + `FIX_CHECKLIST` girdisi + `web/index.html` title** →
`
npx vite build` kanıtı → commit (Türkçe özel karakter yok) → push → **bu dosyaya da bir satır eklenir**.

Uygulama içinde sürüm rozetinden de görülür: **OTONOM Chatgpt_1.188 • ONE-PAGE**.
Kesin sürüm referansı `web/src/App.tsx` içinde `APP_VERSION`; burası insan-okuyan kopyasıdır.

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
