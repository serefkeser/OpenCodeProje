# OTONOM — Yerel Haber Video Üretim Sistemi

**Sürüm:** `OTONOM 1.200` (`web/src/App.tsx` içindeki `APP_VERSION` tek doğruluk kaynağıdır)

Gemini Canvas uyumlu, **local-first** React uygulaması. Haber metnini otomatik olarak analiz eder, sahne sahne görsellerle destekler ve Canvas tabanlı video render ile son çıktıyı üretir. Firebase tamamen kaldırılmıştır; tüm veriler tarayıcıda (localStorage + IndexedDB) saklanır ve uygulama offline/standalone çalışır.

## Nasıl Çalışır?

Akış: `S1 → M1 analiz → 2 AI görsel → S2 → M2 analiz → 2 AI görsel → ...`

1. Haber metni yüklenir (veya AI analiz moduna göre haber/eleştiri/iddia/güzel söz/OCR seçilir).
2. Her sahne için AI metni analiz ederek senaryo çıkarır ve 2 adet AI görseli üretir.
3. Canvas render motoru, seslendirme (%80 hız) ve arka plan müziği (%20 varsayılan) ile videoyu üretir.
4. Biten video MP4 olarak yerel ortamda saklanır/indirilir.

## Özellikler

- 🗂️ **Modüler yap** — M1–M10 katmanları (aşağıdaki tablo)
- 🤖 **AI motoru** — Gemini 2.5 Flash (analiz + görsel + OCR)
- 🎬 **Canvas video render** — 30 FPS CFR, 4 Mbps, maksimum 10 blok
- 🔊 **Ses kontrolü** — seslendirme/müzik seviyeleri kullanıcı tarafından ayarlanabilir
- 💾 **Local-first** — SafeStorage (localStorage) + IndexedDB (AssetManager)
- 🔐 **Kullanıcı API anahtarı** — Ayarlar ekranından girilir, cihazda saklanır

## Çalıştırma

Uygulamanın canlı kodu `web/src/App.tsx`'tir (kökdeki eski `haber_saas_sistemiii.tsx` kopyası v1.195'te silindi; Gemini Canvas'a yapıştırmak için bu dosyanın içeriğini kullanabilirsiniz):

1. Doğru çalışmak için geçerli bir **Gemini API anahtarı** gerekir → uygulama içi Ayarlar'dan girin (tarayıcıda `GEMINI_API_KEY` altında saklanır) veya root `.env`'e yazın (gateway sunucuda tutar).
2. Çalıştırma: `npm run start:all` (gateway+analysis+media) + `npm run start:web` (vite:5173), tarayıcıdan `http://localhost:5173`.
3. Uygulama tamamen tarayıcı içinde çalışır; dış sunucu kurulumu gerekmez.

## Modüler Yapı

| Modül | Ad | Sorumluluk |
|---|---|---|
| M1 | Constants & Config | API anahtarları, bayraklar, sürüm bilgisi |
| M2 | Core Utilities | Storage, Audio, EventBus, logging, yardımcılar |
| M3 | Network | Fetch retry, görüntü/base64 işlemleri |
| M4 | Asset Manager | IndexedDB servisleri |
| M5 | Logic Engine | AI analiz (haber, eleştiri, iddia, güzel söz, OCR) |
| M6 | Media Synthesis | Görsel üretim servisleri |
| M7 | Ambient Audio | Atmosfer sesleri |
| M8 | Render Engine | Canvas video render |
| M9 | Workflow Coordinator | İş akış yöneticisi |
| M10 | App (React UI) | Ana component ve tüm UI |

## Varsayılan Ayarlar (seçki)

| Parametre | Değer |
|---|---|
| Seslendirme hızı | %80 |
| Arka plan müzik seviyesi | %29 |
| FPS | 30 (min. çıktı 23) |
| Video bitrate | 4 Mbps |
| Maksimum blok / özel sahne görseli | 10 / 5 |

## Sürüm Notu

Kod başlığındaki "SÜRÜM BAŞLIĞI" bölümü, `APP_VERSION` sabiti ve sürüm notları **birlikte** artırılır; menü rozeti `APP_VERSION.toBadge()` ile otomatik üretilir.
