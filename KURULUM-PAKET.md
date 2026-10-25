# OTONOM — Taşınabilir Kurulum Paketi (Mac / Windows)

Bu kılavuz, programı **Mac veya Windows** olabilir herhangi bir bilgisayara
kopyalayıp çalıştırır hale getirmenin tam adımlarını anlatır.
Sürüm: **v1.186** · Maliyet: **sıfır** (yalnız ücretsiz API anahtarları).

Kısaca ne çalıştırılır:
| Parça | Ne yapar | Adres |
|---|---|---|
| `npm run start:all` | gateway + analysis + media mikro servisleri (tek komut) | 4100 / 4201 / 4202 |
| `npm run start:web` | arayüz (tarayıcı sayfası) | http://localhost:5173 |

Müzik kütüphanesi gateway'in **kalıcı disk deposuna** (`services/gateway/muzik/`)
yazılır; Firefox/Chrome uzantısı **gerekmez** (v1.185'te kaldırıldı).

---

## ADIM 0 — Node.js kurulumu (bir kez)

- **Mac:** Node.js LTS sürümünü indirip kurun: <https://nodejs.org/> (`.pkg` dosyası; kurulum sihirbazını takip edin).
- **Windows:** Aynı adresten "Windows Installer (.msi) — LTS" indirip kurun.
- Kontrol (Terminal / PowerShell'de):
  ```
  node --version    # 18, 20 veya üzeri görülmeli
  npm --version
  ```

Ayrıca **git** kurulu olmalı:
- **Mac:** `git --version` yazınca kurulum ekranı açılmadıysa Homebrew ile `brew install git`.
- **Windows:** `https://git-scm.com/download/win` (kurulumda varsayılan ayarlar yeterli).

---

## ADIM 1 — Projeyi bilgisayara indirin

Terminal (Mac) veya PowerShell (Windows) açın:

```bash
git clone https://github.com/serefkeser/OpenCodeProje.git
cd OpenCodeProje
```

Bir güncelleme gerektiğinde aynı klasörde `git pull` yazmanız yeterli.

---

## ADIM 2 — `.env` dosyasını hazırlayın (anahtarlarınız)

Şablonu `.env` adıyla kopyalayın:

```bash
# Mac:
cp .env.example .env
# Windows (PowerShell):
copy .env.example .env
```

Sonra `.env` dosyasını bir metin editörüyle açın ve **yalnız 5 API anahtar
satırını** kendi ücretsiz anahtarlarınızla doldurun:

```
GEMINI_API_KEY=...        (ai.google.dev — ücretsiz)
OPENROUTER_API_KEY=...
GROQ_API_KEY=...
NVIDIA_API_KEY=...
OPENCODE_API_KEY=...
```

Diğer tüm satırlar (portlar + model adları) önceden doldurulmuş; **dokunmayın**.

> **ÖNEMLİ:** `.env` dosyası anahtarlarınızı içerir; **asla git'e commit
> etmeyin** (zaten `.gitignore` içinde). Yalnız kendi bilgisayarınızda durur.

---

## ADIM 3 — Bağımlılıkları kurun (bir kez)

Proje klasöründe:

```bash
npm install
```

Bu, tüm 4 parçanın (gateway/analysis/media/web) bağımlılıklarını tek komutta
kurar (npm workspaces). İnternet bağlantısı gerektirir; 2–5 dakika sürebilir.

---

## ADIM 4 — Servisleri başlatın

Ayrıntılı adımda iki ayrı terminal kullanılır; ADIM 8'deki launcher iki komutu
birleştiren tek-tık seçenektir.

**Terminal 1 — servisler:**
```bash
npm run start:all
```
Çıktıda gateway (4100) / analysis (4201) / media (4202) başladı görülmeli.

**Terminal 2 — arayüz:**
```bash
npm run start:web
```
`VITE ready` benzeri satır görünene kadar bekleyin (~5-15 sn).

---

## ADIM 5 — Tarayıcıda açın

Tarayıcıda: **http://localhost:5173**

Doğrulama:
- Sol üst rozet: **OTONOM CHATGPT_1.186 • ONE-PAGE** (sürüm tutuyorsa kurulum tamamdır).
- Servis sağlıklı kontrolü (isterseniz): tarayıcıda `http://127.0.0.1:4100/health`
  → `analysis.up: true`, `media.up: true` görmelisiniz.

---

## ADIM 6 — Müzikleri aktarın (isteğe bağlı ama bir kez yapın)

1. Müzik panelinde **MÜZİK KLASÖRÜ SEÇ** düğmesine basın; müzik dosyalarınızın
   bulunduğu klasörü seçin (yalnız kök dizindeki mp3/m4a okunur, alt klasör taranmaz).
2. Aktarım bitince **YENİLE** düğmesine basın → panel rozeti **"Gateway Kalıcı
   Müzik (4100)" + parça sayısı** gösterir.
3. Müzikler artık `services/gateway/muzik/` klasöründe **kalıcı**dır: programı
   kapatıp açsanız da dururlar. Arayüz sildiğinde/eklediğinde bu depo güncellenir.

---

## ADIM 7 — Kapatma / yenileme

- Programı kapatmak: iki terminalde **Ctrl+C**.
- Yeniden başlatmak: ADIM 4'teki iki komutu tekrar çalıştırın.
- Kod güncellemesi: `git pull` → ADIM 4'e dön (npm install gerekirse zaten uyarır).

---

## ADIM 8 — Tek komutla başlatma (launcher)

Kök klasörde hazır iki başlatıcı var:

- **Windows:** `START-Windows.bat` dosyasına çift tıklayın — servisleri + arayüzü
  birlikte başlatır; pencere kapatıldığında her şey durur.
- **Mac:** Terminal'de `bash START-Mac.sh` (veya dosyaya çift tıklayıp "Run with Terminal").
- İkisi de `.env`'i otomatik kullanır, Ctrl+C / pencere kapatma ile temiz kapanır.

---

## Sık rastlanacak durumlar (sorumlu çözüm)

| Belirti | Neden | Çözüm |
|---|---|---|
| `EADDRINUSE 4100/4201/4202/5173` | Port başka programda meşgul | Programı zaten çalıştıran bir pencere açık: onu bulun/kapatın; ya da `.env`'te ilgili `*_PORT` değerini değiştirip ADIM 4'ü tekrarlayın. |
| Rozet Chatgpt_1.186 görünmüyor / sayfa eski | Sekme önbelleği | **Ctrl+F5** (Mac: Cmd+Shift+R) ile sert yenileyin. |
| "Gateway Kalıcı Müzik" rozet yok | İlk açılışta gateway biraz geç hazırlanmış olabilir | Müzik panelinde **YENİLE** düğmesine basın; hâlâ yoksa servislerin tümü çalışıyor mu bakın (ADIM 4 + `/health`). |
| 5173 açılmıyor | `start:web` penceresi kapandı/hata verdi | `npm run start:web`'i tekrar çalıştırın; çıktıdaki hatayı bize yapıştırın. |
| Gazete listesi doğrulanamadı | Kaynaklar o günkü sayıları henüz yayımlamamış olabilir (genelde gece yarısı) | Program bilinçli **durur** ve mesaj her kaynağın gördüğü en güncel tarihi söyler; birkaç saat sonra **SEÇ** ekranını yenileyin. Yanlış liste asla gösterilmez (fail-closed tasarım). |
| Anahtar hatası ("GEMINI ... yok" vb.) | `.env` boş/değer girilmemiş | ADIM 2'yi kontrol edin: 5 API anahtar satırı dolu olmalı. |

---

## Port / konfigürasyon nasıl bağlanır (geliştirici notu)

- Portlar tek doğruluk kaynağı olarak kök `.env`'ten okunur:
  `WEB_PORT=5173`, `GATEWAY_PORT=4100`, `ANALYSIS_PORT=4201`, `MEDIA_PORT=4202`.
- Arayüzün hangi gateway'e bağlanacağı **derleme zamanı sabiti**dir:
  `web/vite.config.js` kök `.env`'teki `GATEWAY_PORT`'u okuyup
  `__OTONOM_GATEWAY__` define'ı üretir. Yani gateway portunu değiştirirseniz
  **start:web'i yeniden başlatmak yeterli** (vite ayaklıyken restart etmeyin —
  değişiklik ancak yeni derlemede işler dur).
- Uçtan uca doğrulama betikleri (kurulumdan sonra bir kez):
  ```bash
  node tasks/probe-gateway-music.mjs    # müzik deposu 8 test
  node scripts/probe-scenes-chain.mjs   # analiz/sahne zinciri
  ```

---

## Yeni makinede ekstra farkındalık

- **Mac dosya yolu:** Müzik klasörü seçiminde Mac yolları (`/Users/...`) ile
  Windows yolları (`C:\Users\...`) farklıdır. `.env`'te `MUSIC_DIR` dolduracaksanız
  kendi makinenize uygun yolu yazın — veya hiç yazmayın: uygulama içinden
  **MÜZİK KLASÖRÜ SEÇ** düğmesiyle de aktarabilirsiniz.
- **Windows Defender / güvenlik duvarı:** İlk çalıştırmada güvenlik duvarı
  uyarısı çıkarsa "Özel ağlara izin ver" seçin — program yalnız localhost
  (127.0.0.1) üzerinden konuşur, dışa açık port açmaz.
- Node sürümü: 18 LTS veya üzeri önerilir (modern `--env-file` ve workspaces
  desteği için 20+ daha güvenli).
