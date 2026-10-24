// Tur 4 — son Buffer izleri: log metinleri, stale UI, ölü kart, persist alanları
import { readFileSync, writeFileSync } from 'node:fs';
const path = 'web/src/App.tsx';
let src = readFileSync(path, 'utf8');
const problems = [];

const replaceAll = (oldStr, newStr, label) => {
  if (!src.includes(oldStr)) { problems.push(label + ' bulunamadı: ' + oldStr.slice(0, 70)); return; }
  src = src.split(oldStr).join(newStr);
};

// 1) Log metinleri
replaceAll('Eksik içerikle Son Söz/TTS/render ve Buffer kuyruğuna devam edilmeyecek.', 'Eksik içerikle Son Söz/TTS/render devam edilmeyecek.', 'L8667');
replaceAll(', otomatik Buffer paylaşımı kapalı.', '.', 'L9889');
replaceAll('. Otomatik Buffer paylaşımı kapalı.', '.', 'L10228/10230/13090/13664');
replaceAll('Seçilen gazetelerin işlemleri bitti; sıra durdu.', 'Seçilen gazetelerin işlemleri bitti; sıra durdu.', 'L13211-temel'); // no-op guard yok
replaceAll('Seçilen gazetelerin işlemleri bitti; sıra durdu. Buffer yayın durumu sorgulanmıyor; ertelenen görevler kalıcı kuyrukta tutuluyor.', 'Seçilen gazetelerin işlemleri bitti; sıra durdu.', 'L13271');
replaceAll('MP4 finalizasyonu ve indirme tamamlanır; önizleme bittikten sonra sıradaki gazete başlar. Buffer kuyruğu aranmaz.', 'MP4 finalizasyonu ve indirme tamamlanır; önizleme bittikten sonra sıradaki gazete başlar.', 'L13648');
replaceAll('; otomatik Buffer paylaşımı kapalı">', '">', 'L14206');
replaceAll('video → izle → indir → Buffer.', 'video → izle → indir.', 'L14276');
// v1.154 log metin izleri — Tur-1'de zaten temizlendi; varsa temizle (opsiyonel)
if (src.includes('otomatik Buffer paylaşımı=kapalı')) src = src.split('otomatik Buffer paylaşımı=kapalı').join('');
if (src.includes('otomatik_Buffer=kapalı')) src = src.split('otomatik_Buffer=kapalı').join('');

// 2) Ölü persist alanları (batch objeleri)
{
  const lines = src.split('\n');
  const marked = [];
  lines.forEach((l, i) => {
    if (l.includes('bufferFailed: batch.bufferFailed || [],')) marked.push(i);
    if (l.includes('bufferIntervalMinutes: 0,')) marked.push(i);
  });
  // büyükten küçüğe sil
  for (const i of marked.sort((a, b) => b - a)) lines.splice(i, 1);
  src = lines.join('\n');
}

// 3) Boş if/else kalıntısı (v1.143 alanları)
{
  const c = src.indexOf('// v1.143: Sabit paylaşım aralıkları kaldırıldı');
  if (c < 0) problems.push('L13531 yorum yok');
  else {
    const lines = src.slice(c).split('\n');
    // doğrula: sonraki 3 satır if(...){, } else {, }
    if (!/^if \(forceRestart \|\| saved/.test(lines[1].trim()) || !/^\} else \{$/.test(lines[2].trim()) || !/^\}$/.test(lines[3].trim())) {
      problems.push('L13531-13534 yapı beklenmedik: ' + lines[1].trim().slice(0, 50) + ' | ' + lines[2].trim() + ' | ' + lines[3].trim());
    } else {
      // yorumu zenginleştirip 3 boş satırı sil
      lines[0] = '// v1.173: sabit paylaşım aralıkları ve otomatik Buffer planlaması tamamen kaldırıldı.';
      lines.splice(1, 3);
      src = src.slice(0, c) + lines.join('\n');
    }
  }
}

// 4) BUFFER UZANTI AYARLARI bölümü (6 satır)
{
  const lines = src.split('\n');
  const i = lines.findIndex(l => l.includes('{/* BUFFER UZANTI AYARLARI */}'));
  if (i < 0) problems.push('L14096 bölüm yok');
  else {
    // i: yorum, i+1..i+4 div bloğu, i+5 boş — hepsini kes
    lines.splice(i, 6);
    src = lines.join('\n');
  }
}

// 5) previousVideoDispatchNotice ölü guard (3 satır: yorum + guard + if)
{
  const lines = src.split('\n');
  const i = lines.findIndex(l => l.includes('const previousVideoDispatchNotice'));
  if (i < 0) problems.push('L823 guard yok');
  else {
    if (!lines[i - 1].includes('önceki videoya ait olabilir')) problems.push('L822 yorum beklenmedik: ' + lines[i - 1].trim().slice(0, 60));
    else lines.splice(i - 1, 3);
    src = lines.join('\n');
  }
}

// 6) SATIŞIŞ: bufferFailed log birleşimi + canlı izleme BUFFER kartı
{
  const lines = src.split('\n');
  const gl = lines.findIndex(l => l.includes('(batch.failed.length || batch.bufferFailed.length) ?'));
  if (gl < 0) problems.push('L13739 yok');
  else {
    // satır: (batch.failed.length || batch.bufferFailed.length) ? 'warn' : 'success'
    lines[gl] = lines[gl].replace('(batch.failed.length || batch.bufferFailed.length) ?', "(batch.failed.length) ?").trimStart();
    // önceki satır: bufferFailed parçası içeren tek satır? round-4.2 zaten bufferFailed: satırlarını sildi ama burada log birleşimi:
    // 13738 satırı da '(batch.bufferFailed.length ? ` | Buffer hatalı...' — kontrol
    const prev = lines[gl - 1];
    if (prev.includes('Buffer hatalı')) lines.splice(gl - 1, 1);
    src = lines.join('\n');
  }
  const card = lines.findIndex(l => l.includes('ORT. BAŞLANGIÇ → BUFFER'));
  if (card < 0) problems.push('L14570 kart yok');
  else { lines.splice(card, 1); src = lines.join('\n'); }
}

if (problems.length) {
  console.error('TUR4 HATASI — dosya yazılmadı:\n' + problems.join('\n'));
  process.exit(1);
}
writeFileSync(path, src);
console.log('TUR4 OK — kalan satır: ' + src.split('\n').length);
