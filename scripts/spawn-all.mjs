// ============================================================================
// OTONOM v1.195 — TÜM SERVİSLERİ BAŞLAT (npm run start:all)
// analysis (4201) + media (4202) + gateway (4100) süreçlerini sırayla başlatır.
// v1.195: beklenmedik çıkışta sınırlı yeniden başlatma (MAX_RESTARTS × 3 sn arayla)
// — çöken servis eskisi gibi sessizce ölmez, arkadaşı güvenilir şekilde yeniden
// doğar; deneme tüklenirse açık log bırakır.
// web ayrı çalışır: npm run start:web  (vite:5173)
// Konfigürasyon: root .env (GATEWAY_PORT / ANALYSIS_PORT / MEDIA_PORT)
// ============================================================================
import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { fileURLToPath } from 'node:url';

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const SERVICES = [
  { name: 'analysis', script: join(rootDir, 'services', 'analysis', 'index.mjs') },
  { name: 'media', script: join(rootDir, 'services', 'media', 'index.mjs') },
  { name: 'gateway', script: join(rootDir, 'services', 'gateway', 'index.mjs') },
];
const MAX_RESTARTS = 3;
const RESTART_DELAY_MS = 3000;

const restartCounts = {};
let shuttingDown = false;

const spawnService = ({ name, script }) => {
  const child = spawn(process.execPath, ['--env-file=.env', script], {
    cwd: rootDir,
    stdio: ['ignore', 'inherit', 'inherit'],
  });
  console.log(`[spawn-all] ${name} başlatıldı (pid ${child.pid})`);
  child.on('exit', code => {
    console.log(`[spawn-all] ${name} kapandı (code ${code})`);
    if (shuttingDown) return;
    const count = (restartCounts[name] || 0) + 1;
    if (count <= MAX_RESTARTS) {
      restartCounts[name] = count;
      console.log(`[spawn-all] ${name} ${RESTART_DELAY_MS} ms sonra yeniden başlatılacak (deneme ${count}/${MAX_RESTARTS})`);
      setTimeout(() => {
        if (shuttingDown) return;
        spawnService({ name, script });
      }, RESTART_DELAY_MS);
    } else {
      console.log(`[spawn-all] ${name} için yeniden başlatma denemesi tükendi (${MAX_RESTARTS}); süreç ölü bırakıldı.`);
    }
  });
  return child;
};

const children = SERVICES.map(spawnService);

const shutdown = () => {
  shuttingDown = true;
  children.forEach(child => child.kill());
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

export const childrenForTest = children; // test/diag için pas
if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  // doğrudan çalıştırma modu: sürekli bekle
  setInterval(() => {}, 1 << 30);
}
