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
- [ ] F2: App.tsx yapraklar — PAYLAŞ/İPTAL butonları, Buffer paylaşım progress paneli, autoReview countdown (Buffer paylaşım metni), Gönderim Kuyruğu tab + kartları, Canlı İzleme buffer filtresi
- [ ] F3: App.tsx subsystemler — posting scheduler + kuyruk sabitleri, share flow + BufferBudget, createReviewedBufferFlow, sosyal helper blok (81–133)
- [ ] F4: v1.173 sürüm bump (başlık+APP_VERSION+not), vite build, commit+push
Not: Sürüm notlarındaki tarihî Buffer kayıtları silinmez (geçmiş dökümanı).

Sürüm kuralı: SÜRÜM BAŞLIĞI + APP_VERSION (1,172) + SÜRÜM NOTLARI birlikte artırılır.
Not: .env anahtarlar ASLA repoya yazılmaz.
