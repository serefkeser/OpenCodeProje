// Tum FreeLLMAPI DB adaylarinda google anahtari SAYIMI — degerler ASLA okunmaz/yazdirilmaz.
import { createRequire } from 'node:module';
const require = createRequire('C:/Users/skese/Downloads/files/freellmapi/package.json');
const Database = require('better-sqlite3');

const dosyalar = [
  'C:/Users/skese/Downloads/files/freellmapi/server/data/freeapi.db',
  'C:/Users/skese/Downloads/files/freellmapi/node_modules/@freellmapi/server/data/freeapi.db',
  'C:/Users/skese/AppData/Roaming/FreeLLMAPI/freeapi.db',
];

for (const f of dosyalar) {
  try {
    const db = new Database(f);
    const g = db.prepare("SELECT COUNT(*) n FROM api_keys WHERE platform='google'").get();
    console.log(`== ${f}`);
    console.log(`   google toplam: ${g.n}`);
    const satirlar = db.prepare("SELECT status, enabled, created_at, last_checked_at FROM api_keys WHERE platform='google' ORDER BY id").all();
    satirlar.forEach((r, i) => console.log(`   google #${i + 1} [status=${r.status}, enabled=${r.enabled}] created=${r.created_at} lastChecked=${r.last_checked_at}`));
    db.close();
  } catch (e) {
    console.log(`== ${f} acilamadi: ${e.message}`);
  }
}
