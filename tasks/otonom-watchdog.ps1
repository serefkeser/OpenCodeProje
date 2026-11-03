# OTONOM servis betcbcznx (v1.207 opsiyonel kurulum; uygulama koduna dokunmaz)
# Gorev: 4100 /health kontrolu; kapaliysa start:all penceresiz baslat; sonucu logla.
# Kanita dayali desen: HTTP (Invoke-WebRequest) probu netstat regex'ten guvenilir.
$ErrorActionPreference = 'SilentlyContinue'
$root = 'C:\Users\skese\Downloads\files\OpenCodeProje'
$log = Join-Path $root ('tasks\watchdog-' + (Get-Date -Format 'yyyyMMdd') + '.log')

function Log([string]$m) {
  Add-Content -Path $log -Value ("[" + (Get-Date -Format 'HH:mm:ss') + "] " + $m) -ErrorAction SilentlyContinue
}

try {
  $r = Invoke-WebRequest 'http://127.0.0.1:4100/health' -UseBasicParsing -TimeoutSec 8
  if ($r.StatusCode -eq 200) {
    Log 'OK gateway saglikli - dokunulmadi'
    exit 0
  }
} catch {}

Log 'FAIL gateway kapali - start:all baslatiliyor'
Start-Process -FilePath 'npm.cmd' -ArgumentList 'run', 'start:all' -WorkingDirectory $root -WindowStyle Hidden
exit 0
