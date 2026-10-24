// Tur 3 — son kalıntılar: waitForVerifiedDownload (ölü), üretim kapısı kuyruk gözlemi, canlı izleme kartı
import { readFileSync, writeFileSync } from 'node:fs';
const path = 'web/src/App.tsx';
const lines = readFileSync(path, 'utf8').split('\n');
const t = i => String(lines[i - 1] ?? '').trim();
const pos = (needle, from = 1) => { for (let i = from; i <= lines.length; i++) if (lines[i - 1].includes(needle)) return i; return -1; };
const cut = (s, e, label) => {
  if (!(s >= 1 && e >= s && e <= lines.length)) { console.error(`MISS ${label} s=${s} e=${e}`); process.exit(1); }
  lines.splice(s - 1, e - s + 1);
  return true;
};
const problems = [];

// C1: waitForVerifiedDownload (1718-1734) — çağrı alanı yok, ölü kod
{
  const s = pos('const waitForVerifiedDownload = async (requested,', 1) >= 0 ? -1 : 0;
}
const wStart = pos('const waitForVerifiedDownload = async (', 1);
if (wStart < 0) problems.push('C1 başlangıç yok');
else {
  // fonksiyon artik ~17 satır; kapanış `};` satırını bul (izleyen _cooperativeMainThreadYield'e kadar)
  let end = -1;
  for (let i = wStart; i < lines.length; i++) {
    if (lines[i].includes('_cooperativeMainThreadYield')) { end = i; break; }
  }
  if (end < 0) problems.push('C1 bitiş yok');
  else cut(wStart, end - 2, 'C1'); // end-1 boş satır, end yorum/kod
  // doğrulama: silinen bölgenin hemen ardından eşittir fonksiyonu gelmeli
}

// C2: üretim kapısı yorumu (4 satır Buffer'lı) tek satıra
{
  const c = lines.findIndex(l => l.includes('Ortak üretim kapısı'));
  const f = lines.findIndex(l => l.includes('const waitForPreviousVideoPostingWindow = async'));
  if (c >= 0 && f > c) {
    const single = '// Ortak üretim kontrol kapısı: API geçici hata koruması (cooldown) sonrası bir sonraki videoya izin verir.';
    lines.splice(c, f - c, single);
  } else problems.push('C2 yorum/fonksiyon yok veya sıra ters');
}

// C3: kuyruk gözlem bloğu (DurablePostingQueue + 2. cooldown) 10802-10854
{
  const s = pos('let existingVideos = await DurablePostingQueue.listVideos();', 1);
  if (s < 0) problems.push('C3 başlangıç yok');
  else {
    const e = pos('if (!isCooldownGateActive()) return false;', s + 20);
    if (e < 0) problems.push('C3 kapanış yok');
    else cut(s, e, 'C3');
  }
}

// C4: kalıcı kuyruk yazımları (10858-10865 civarı) + eski yorumlar
{
  const s = pos('await DurablePostingQueue.updateVideo(previousVideoId, { interVideoCooldownCompletedAt', 1);
  if (s < 0) problems.push('C4 başlangıç yok');
  else {
    const e = pos("addSystemLog(`✓ ${previousVideo?.title || previousVideoId}: Buffer gönderim denemeleri", s - 3);
    if (e < 0) problems.push('C4 kapanış yok');
    else cut(s, e, 'C4');
  }
}

// C5: handleExecuteStart v1.154 Buffer-comment bloğu (3 satır: yorum soyu)
{
  const s = pos("addSystemLog('v1.154: yalnız üretim + seslendirme + MP4 indirme modu aktif", 1);
  if (s < 0) problems.push('C5 yok');
  else cut(s - 2, s, 'C5');
}

// C6: SafeStorage.removeItem('BUFFER_API_KEY')
{
  const s = lines.findIndex(l => l.includes("SafeStorage.removeItem('BUFFER_API_KEY')"));
  if (s < 0) problems.push('C6 yok');
  else cut(s + 1, s + 1, 'C6');
}

// C7: canlı izleme grid-cols-4 stats grid'i (liveMonitorVideos'suz hali kaldı)
{
  const s = lines.findIndex(l => l.includes('grid shrink-0 grid-cols-4 gap-1.5'));
  if (s < 0) problems.push('C7 yok');
  else {
    const e = pos('VİDEO</div>', s);
    const eEnd = pos('VİDEO</div>', s) + 0; // 3 satır: başlangıç div'i, kart, kapanış
    cut(s, s + 2, 'C7');
  }
}

if (problems.length) {
  console.error('TUR3 ANCHOR HATASI — dosya yazılmadı:\n' + problems.join('\n'));
  process.exit(1);
}

writeFileSync(path, lines.join('\n'));
console.log('TUR3 OK — kalan satır: ' + lines.length);
