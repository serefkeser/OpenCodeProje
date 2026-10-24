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
