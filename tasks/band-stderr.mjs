import { spawnSync } from 'node:child_process';
const src = 'C:/Users/skese/Downloads/Nefes Gazetecılere halk desteğı!(1).mp4';
const r = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', src, '-af', 'highpass=f=300,lowpass=f=2700,astats=metadata=1:reset=2205,ametadata=print:key=lavfi.astats.Overall.RMS_level:file=-', '-f', 'null', '-'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const out = (r.stderr || '') + (r.stdout || '');
const lines = out.split('\n').map(s => s.trim());
let lastPts = null; const mine = [];
for (const s of lines) {
  const m = /pts_time:([0-9.]+)/.exec(s); if (m) { lastPts = parseFloat(m[1]); continue; }
  const rr = /lavfi\.astats\.Overall\.RMS_level=(-?[0-9.]+)/.exec(s);
  if (rr && lastPts != null) { mine.push([lastPts, parseFloat(rr[1])]); lastPts = null; }
}
const sec = {};
for (const [t, v] of mine) {
  if (!isFinite(v) || v < -100) continue;
  (sec[Math.floor(t)] ||= []).push(v);
}
for (const k of Object.keys(sec).map(Number).sort((a, b) => a - b)) {
  const arr = sec[k];
  console.log(`${k}s → pencere en-yüksek konuşma-bandı RMS ${Math.max(...arr).toFixed(1)} dB`);
}
