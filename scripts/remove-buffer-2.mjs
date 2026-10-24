// Tur 2 — kalan Buffer/posting kalıntıları (anchor Scanner based)
import { readFileSync, writeFileSync } from 'node:fs';
const path = 'web/src/App.tsx';
const src = readFileSync(path, 'utf8');
const lines = src.split('\n');
const trimmed = i => String(lines[i - 1] ?? '').trim();
const problems = [];

const cutRange = (s, e, label) => {
  if (!(s >= 1 && e >= s && e <= lines.length)) { problems.push(`range: ${label} s=${s} e=${e}`); return; }
  lines.splice(s - 1, e - s + 1);
};

// Konum bulucu (tarama tabanlı)
const pos = (needle, from = 1) => {
  const i = lines.findIndex((l, k) => k >= from - 1 && l.includes(needle));
  return i < 0 ? -1 : i + 1;
};
const posEnd = (needle, from = 1) => {
  for (let i = from; i <= lines.length; i++) if (lines[i - 1].includes(needle)) return i;
  return -1;
};

let cursor = 1;

// S1: refreshPostingDashboard..v1.114 yorum satırından önceki hizada tüm posterlar
const rStart = pos('const refreshPostingDashboard = async () => {', cursor);
const v114 = rStart < 0 ? -1 : posEnd('// v1.114: DURDUR', rStart + 5);
if (rStart < 0 || v114 < 0 || v114 - rStart < 5) { problems.push('S1 refreshPostingDashboard/v1.114'); rStart = -1; }
if (rStart > 0) cutRange(rStart, v114 - 1, 'S1');
cursor = Math.max(1, rStart);

// S2: BUFFER_AUTO_5MIN_ENABLED_KEY efekti (3 satır)
const b5m = pos('SafeStorage.setItem(BUFFER_AUTO_5MIN_ENABLED_KEY', cursor);
if (b5m > 0) {
  if (trimmed(b5m - 1) !== 'useEffect(() => {') problems.push(`S2 useEffect eksik @${b5m - 1}: ${trimmed(b5m - 1)}`);
  if (trimmed(b5m + 1) !== '}, [bufferAuto5MinEnabled]);') problems.push(`S2 kapanış eksik @${b5m + 1}: ${trimmed(b5m + 1)}`);
  else cutRange(b5m - 1, b5m + 1, 'S2');
} else problems.push('S2 buffer 5min yok');

// S3: shouldQueuePosting satırı
const sqp = pos('const shouldQueuePosting = AUTO_BUFFER_SHARING_ENABLED && shouldFinalizeMp4;', 1);
if (sqp > 0) cutRange(sqp, sqp, 'S3'); else problems.push('S3 shouldQueuePosting yok');

// S4: onPrepared bloğu Tur-1'de zaten kesildi; sağlamlaştırma: kalan referans yok.
const o = pos('onPrepared: shouldQueuePosting ? async (mediaUrl, fileName) => {', 1);
if (o > 0) problems.push('S4 onPrepared hâlâ mevcut — incele');

// S5: BUFFER_OPEN_OPTIONS butonu (tek satır)
const btn = pos("bufferExtensionRequest('BUFFER_OPEN_OPTIONS'", 1);
if (btn > 0) {
  if (!trimmed(btn).includes('</button>')) problems.push(`S5 buton beklenmeyen satır: ${trimmed(btn).slice(0, 60)}`);
  else cutRange(btn, btn, 'S5');
} else problems.push('S5 BUFFER_OPEN_OPTIONS yok');

// S6: BufferSocialIcon kullanım satırları (string değiştirme)
let out = lines.join('\n');
const replaces = [
  [`{log.socialService && <BufferSocialIcon service={log.socialService} size={14} />}`, ``],
  [`{log.socialService && <span className="shrink-0"><BufferSocialIcon service={log.socialService} size={12} /></span>}`, ``],
  [`['posting','GÖNDERİM'],`, ``],
];
for (const [oldStr, newStr] of replaces) {
  if (!out.includes(oldStr)) { problems.push('REPLACE yok: ' + oldStr.slice(0, 60)); continue; }
  out = out.split(oldStr).join(newStr);
}
lines.length = 0; lines.push(...out.split('\n'));

// S8: canlı izleme chip (postingSchedulerState) satırı
const chip = lines.findIndex(l => l.includes('postingSchedulerSt') && l.includes('shrink-0 rounded-full'));
if (chip >= 0) cutRange(chip + 1, chip + 1, 'S8'); else problems.push('S8 chip yok');

// S9: setActiveTab('posting') izleme butonu
const btn2 = lines.findIndex(l => l.includes("setActiveTab('posting')") && l.includes('refreshPostingDashboard'));
if (btn2 >= 0) cutRange(btn2 + 1, btn2 + 1, 'S9'); else problems.push('S9 izleme butonu yok');

// Son temizlik: 'Son başarılı yayın' / 'Sonraki işlem' satır bağlamları
const rp = lines.findIndex(l => l.includes('Son başarılı yayın'));
if (rp >= 0) {
  const end = lines.findIndex((l, k) => k > rp && l.includes('</footer>'));
  cutRange(rp + 1, Math.max(rp + 1, end + 1), 'footer');
} else {
  // Footer satır zaten gitti; 'Sonraki işlem' tek satır olabilir
  const nx = lines.findIndex(l => l.includes('Sonraki işlem') && l.includes('postingSchedulerState'));
  if (nx >= 0) cutRange(nx + 1, nx + 1, 'sonraki-islem');
}

if (problems.length) {
  console.error('TUR2 ANCHOR HATASI — dosya yazılmadı:\n' + problems.join('\n'));
  process.exit(1);
}

writeFileSync(path, lines.join('\n'));
console.log('TUR2 OK —' + ' kalan satır: ' + lines.length);
