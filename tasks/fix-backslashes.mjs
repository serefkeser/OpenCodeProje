import fs from 'node:fs';
const p = 'web/src/App.tsx';
const B = String.fromCharCode(92); // \'
let s = fs.readFileSync(p, 'utf8');
const before = s;
// Bozuk: ch === '\'  (tek backslash + kesen alıntı)  →  ch === '\\'
s = s.replace("ch === '" + B + "') esc = true", "ch === '" + B + B + "') esc = true");
s = s.replace("out.endsWith('" + B + "')", "out.endsWith('" + B + B + "')");
fs.writeFileSync(p, s, 'utf8');
console.log('degisim var mi:', s !== before);
console.log('2913:', s.split('\n')[2912].trim().slice(0, 110));
console.log('2919:', s.split('\n')[2918].trim().slice(0, 110));
