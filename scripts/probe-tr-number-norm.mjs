// v1.181 kanıt (simülasyon): binlik ayraç birleştirme kuralının davranışı.
// NOT: Bu probe App.tsx'teki _normalizeTurkishTtsText'i IMPORT EDEMEZ (React modülü);
// Kuralı birebir kopyalama ile sınar. Üretimdeki gerçek kanıt, app'in kendi
// "✓ FIX CHECKLIST v1.35: Türkçe TTS normalize edildi" önce/sonra günlük satırıdır.
const mergeRule = (s) => s.replace(/\b(\d{1,3})(?:[ .\u00A0\u202F](\d{3}))+(?![0-9])/g, (raw) => raw.replace(/[^0-9]/g, ''));
// _trIntegerToWords yerine yalnız birleşmeyi sınayan ham karşılaştırma (sayısal doğru olmalı):
const inputs = [
  ['yaklaşık 3 000 gazeteci katıldı', 'yaklaşık 3000 gazeteci katıldı'],
  ['85.450 TL açlık sınırı', '85450 TL açlık sınırı'],
  ['3 000 000 kişi etkilendi', '3000000 kişi etkilendi'],
  ['sadece 2026 yılı', 'sadece 2026 yılı'],           // ayraç yok → değişmemeli
  ['tarih 17.09.2026 ayrı işlenir', 'tarih 17.09.2026 ayrı işlenir'], // tarih kuralı önceden işlediğini varsay
];
let fail = 0;
for (const [input, expected] of inputs) {
  const out = mergeRule(input);
  const ok = out === expected;
  if (!ok) fail++;
  console.log(`${ok ? 'OK  ' : 'FAIL'} "${input}" → "${out}" (beklenen: "${expected}")`);
}
console.log(fail ? `SONUÇ: ${fail} hata` : 'SONUÇ: binlik birleştirme duruşu doğru ✓');
process.exit(fail ? 1 : 0);
