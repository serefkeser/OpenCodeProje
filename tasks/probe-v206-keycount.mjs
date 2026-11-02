// v1.206 teşhis: FreeLLMAPI dashboard anahtar sayımı — DEĞERLER ASLA OKUNMAZ/YAZDIRILMAZ.
import { createRequire } from 'node:module';
const require = createRequire('C:/Users/skese/Downloads/files/freellmapi/package.json');
const Database = require('better-sqlite3');

const dosyalar = [
  'C:/Users/skese/Downloads/files/freellmapi/server/data/freeapi.db',
  'C:/Users/skese/Downloads/files/freellmapi/node_modules/@freellmapi/server/data/freeapi.db',
];
for (const dosya of dosyalar) {
  let db;
  try { db = new Database(dosya, { readonly: true }); } catch (e) { console.log(`${dosya} acilamadi: ${e.message}`); continue; }
  const rows = db.prepare('SELECT platform, status, enabled, COUNT(*) n FROM api_keys GROUP BY platform, status, enabled').all();
  const yeni = db.prepare('SELECT MAX(created_at) m FROM api_keys WHERE platform = ?').get('google');
  console.log(`== ${dosya.split('freellmapi/')[1]}`);
  rows.forEach(r => console.log(` - ${r.platform} [${r.status}, enabled=${r.enabled}]: ${r.n}`));
  console.log(` - en yeni google anahtari olusturma: ${yeni?.m || 'yok'}`);
  db.close();
}
