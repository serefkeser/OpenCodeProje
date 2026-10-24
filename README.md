# OTONOM — Yerel Haber Video Üretim Sistemi

**Sürüm:** `OTONOM Chatgpt_1.171` (`haber_saas_sistemiii.tsx` başlığındaki sürüm rozetiyle senkron)

Gemini Canvas uyumlu, **local-first** tek dosyalık React uygulaması. Haber metnini otomatik olarak analiz eder, sahne sahne görsellerle destekler ve Canvas tabanlı video render ile son çıktıyı üretir. Firebase tamamen kaldırılmıştır; tüm veriler tarayıcıda (localStorage + IndexedDB) saklanır ve uygulama offline/standalone çalışır.

## Nasıl Çalışır?

Akış: `S1 → M1 analiz → 2 AI görsel → S2 → M2 analiz → 2 AI görsel → ...`

1. Haber metni yüklenir (veya AI analiz moduna göre haber/eleştiri/iddia/güzel söz/OCR seçilir).
2. Her sahne için AI metni analiz ederek senaryo çıkarır ve 2 adet AI görseli üretir.
3. Canvas render motoru, seslendirme (%80 hız) ve arka plan müziği (%20 varsayılan) ile videoyu üretir.
4. Biten video sosyal kanallara (Buffer entegrasyonu) paylaşılabilir: X, Instagram, LinkedIn, TikTok, Facebook, YouTube, Pinterest, Bluesky, Threads.

## Özellikler

- 🗂️ **Modüler yap** — M1–M10 katmanları (aşağıdaki tablo)
- 🤖 **AI motoru** — Gemini 2.5 Flash (analiz + görsel + OCR)
- 🎬 **Canvas video render** — 30 FPS CFR, 4 Mbps, maksimum 10 blok
- 🔊 **Ses kontrolü** — seslendirme/müzik seviyeleri kullanıcı tarafından ayarlanabilir
- 💾 **Local-first** — SafeStorage (localStorage) + IndexedDB (AssetManager)
- 📤 **Sosyal paylaşım** — Buffer kanal aşamaları ve limit kontrolleri
- 🔐 **Kullanıcı API anahtarı** — Ayarlar ekranından girilir, cihazda saklanır

## Çalıştırma

Uygulama **tek** `haber_saas_sistemiii.tsx` dosyasıdır ve Gemini Canvas uyumlu olacak şekilde tasarlanmıştır:

1. Doğru çalışmak için geçerli bir **Gemini API anahtarı** gerekir → uygulama içi Ayarlar'dan girin (tarayıcıda `GEMINI_API_KEY` altında saklanır).
2. Dosyayı Gemini Canvas'a yapıştırın veya kendi ortamınızda React/TypeScript derleme hattınıza ekleyin.
3. Uygulama tamamen tarayıcı içinde çalışır; sunucu kurulumu gerekmez.

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
