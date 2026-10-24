// v1.181 kanıt: gemini-3.8-flash-tts ÇIPLAK WAV döndürüyor mu? Yeni RIFF
// çözümleme algoritması (generateAudio'dakiyle aynı satırlar) bu WAV'ı doğru
// çözer mi? — RIFF tespiti, fmt alanları, data chunk aralığı,… hepsi gerçek istekle.
const base = 'https://generativelanguage.googleapis.com/v1beta';
const r = await fetch(`${base}/models/gemini-3.8-flash-tts:generateContent?key=${process.env.GEMINI_API_KEY}`, {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ contents: [{ parts: [{ text: 'Yaklaşık üç bin gazeteci Habere göre katıldı.' }] }], generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Aoede' } } } } }),
  signal: AbortSignal.timeout(90000),
});
console.log('HTTP', r.status, '| mime:', r.ok ? (await r.json()).candidates?.[0]?.content?.parts?.[0]?.inlineData?.mimeType : '(hata)');
if (!r.ok) process.exit(1);
const mime = (await (await r.clone()).json()).candidates?.[0]?.content?.parts?.[0]?.inlineData?.mimeType;
const d = await r.json().catch(() => null) || JSON.parse(await r.text());
const b64 = d.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
const bin = atob(b64);
const pcmBytes = new Uint8Array(bin.length);
for (let i = 0; i < bin.length; i++) pcmBytes[i] = bin.charCodeAt(i);

const isRiff = pcmBytes.length > 44 && pcmBytes[0] === 0x52 && pcmBytes[1] === 0x49 && pcmBytes[2] === 0x46 && pcmBytes[3] === 0x46;
console.log('RIFF tespiti:', isRiff ? 'EVET (çıplak WAV)' : 'HAYIR (L16 raw PCM)');
if (!isRiff) process.exit(0);

const headerView = new DataView(pcmBytes.buffer, pcmBytes.byteOffset, pcmBytes.byteLength);
let off = 12, dataStart = -1, dataLen = 0, audioFormat = -1, numChannels = 1, sampleRate = 0, bits = 16;
while (off + 8 <= pcmBytes.length) {
  const chunkId = String.fromCharCode(pcmBytes[off], pcmBytes[off + 1], pcmBytes[off + 2], pcmBytes[off + 3]);
  const chunkSize = headerView.getUint32(off + 4, true);
  if (chunkId === 'fmt ') {
    audioFormat = headerView.getUint16(off + 8, true);
    numChannels = headerView.getUint16(off + 10, true);
    sampleRate = headerView.getUint32(off + 12, true);
    bits = headerView.getUint16(off + 22, true);
  } else if (chunkId === 'data') { dataStart = off + 8; dataLen = Math.min(chunkSize, pcmBytes.length - off - 8); break; }
  off += 8 + chunkSize + (chunkSize & 1);
}
const dur = dataLen / (sampleRate * numChannels * (bits / 8));
console.log(`fmt: format=${audioFormat} ch=${numChannels} rate=${sampleRate} bits=${bits}`);
console.log(`data: başlangıç=${dataStart} uzunluk=${dataLen}B (${(dataLen / 1024).toFixed(0)}KB) → süre ${dur.toFixed(2)} sn`);
console.log('dataStart hizada mı?', dataStart === 44 ? 'EVET (standart 44 byte başlık)' : `HAYIR (${dataStart} — chunk başlıkları atlandı, doğru davranış)`);
console.log('ESKİ BUG\'DA OLACAKTI: bu ' + Math.min(44, pcmBytes.length) + ' başlık baytının tamamı ilk ~22 PCM örneği gibi yorumlanıp ses başına cızırtı basılacaktı.');
console.log(isRiff && sampleRate === 24000 && dataStart >= 44 && dataLen > 1000 ? 'SONUÇ: kanıt OLUMSUZ DEĞİL — WAV çözümleme kabaca doğru ✓' : 'SONUÇ: BEKLENMEDİK — elle bakın');
