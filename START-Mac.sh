#!/usr/bin/env bash
# ============================================================================
# OTONOM — Tek komutla başlat (Mac/Linux)
# Kullanım: bash START-Mac.sh   (veya dosyaya çift tıklayıp "Run with Terminal")
# Servisler (gateway 4100 + analysis 4201 + media 4202) ve web arayüz (5173)
# bu kabukta birlikte çalışır; Ctrl+C ile hepsi temiz kapanır.
# Gereksinim: Node LTS kurulu; proje kökünde .env dosyası hazır.
# ============================================================================
set -e
cd "$(dirname "$0")"

if ! command -v node >/dev/null 2>&1; then
  echo "[HATA] Node.js bulunamadı. Önce https://nodejs.org/ adresinden LTS sürümünü kurun." >&2
  exit 1
fi

if [ ! -f .env ]; then
  echo "[HATA] .env dosyası yok. '.env.example' dosyasını '.env' olarak kopyalayıp API anahtarlarınızı girin. Detay: KURULUM-PAKET.md" >&2
  exit 1
fi

if [ ! -d node_modules ]; then
  echo "[KURULUM] İlk çalıştırma: bağımlılıklar kuruluyor (npm install)..."
  npm install
fi

echo "[OTONOM] Servisler arka planda başlatılıyor..."
node --env-file=.env --import ./scripts/spawn-all.mjs &
SERVICES_PID=$!

cleanup() {
  echo ""
  echo "[OTONOM] Durduruluyor..."
  kill "$SERVICES_PID" 2>/dev/null || true
  wait "$SERVICES_PID" 2>/dev/null || true
  echo "[OTONOM] Kapatıldı."
}
trap cleanup EXIT INT TERM

echo "[OTONOM] Web arayüzü başlatılıyor (Ctrl+C hepsini kapatır)..."
echo "         Tarayıcıda açın: http://localhost:5173"
npm run start:web
