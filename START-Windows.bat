@echo off
rem ============================================================================
rem OTONOM - Tek komutla baslat (Windows)
rem Web arayuzu (5173) ayri bir pencerede, servisler (gateway 4100 + analysis
rem 4201 + media 4202) bu pencerede calisir. Ctrl+C veya bu pencerenin
rem kapatilmasi servisleri durdurur; web penceresi de otomatik kapatilir.
rem Gereksinim: Node LTS kurulu; projenin kok klasorunde .env dosyasi hazir.
rem ============================================================================
setlocal
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo [HATA] Node.js bulunamadi. Once https://nodejs.org/ adresinden LTS surumunu kurun.
  pause
  exit /b 1
)

if not exist ".env" (
  echo [HATA] .env dosyasi yok. ".env.example" dosyasini ".env" olarak kopyalayip API anahtarlarinizi girin. Detay: KURULUM-PAKET.md
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo [KURULUM] Ilk calistirma: bagimliliklar kuruluyor ^(npm install^)...
  call npm install || goto :hata
)

echo [OTONOM] Web arayuzu ayri pencerede baslatiliyor...
start "OTONOM-WEB" cmd /c "npm run start:web"

echo [OTONOM] Servisler bu pencerede calisiyor ^(gateway 4100 + analysis 4201 + media 4202^)...
echo [OTONOM] Tarayicida acin: http://localhost:5173
echo [OTONOM] Durdurmak icin bu pencerede Ctrl+C ^(veya pencereyi kapat^).
node --env-file=.env --import ./scripts/spawn-all.mjs

echo [OTONOM] Servisler durdu; web arayuz penceresi kapatiliyor...
taskkill /FI "WINDOWTITLE eq OTONOM-WEB*" >nul 2>nul
goto :son

:hata
echo [HATA] npm install basarisiz oldu. Ciktini kontrol edin.
pause
exit /b 1

:son
endlocal
