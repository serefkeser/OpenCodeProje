import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// OTONOM v1.172 — web mikro servis ayakı.
// Root .env'i okur; GATEWAY_PORT/WEB_PORT konfigürasyondan gelir (hardcode yasak).
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const webPort = Number(env.WEB_PORT || 5173);
  const gatewayPort = Number(env.GATEWAY_PORT || 4100);
  return {
    plugins: [react()],
    server: { port: webPort, strictPort: true },
    define: {
      // Tek doğruluk kaynağı: root .env → derleme zamanı sabiti.
      __OTONOM_GATEWAY__: JSON.stringify(`http://127.0.0.1:${gatewayPort}`),
    },
  };
});
