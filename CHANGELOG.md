# OTONOM CHANGELOG

Görsel ve okunabilir sürüm kaydı. Sürüm 4'lü yama ile artar:
**App.tsx ÖZET comment + `APP_VERSION` + `FIX_CHECKLIST` girdisi + `web/index.html` title** →
`
npx vite build` kanıtı → commit (Türkçe özel karakter yok) → push → **bu dosyaya da bir satır eklenir**.

Uygulama içinde sürüm rozetinden de görülür: **OTONOM Chatgpt_1.187 • ONE-PAGE**.
Kesin sürüm referansı `web/src/App.tsx` içinde `APP_VERSION`; burası insan-okuyan kopyasıdır.

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
