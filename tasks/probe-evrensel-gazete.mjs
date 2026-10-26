// evrensel.net/gazete sayfasını gateway üzerinden çekip tarihli manşet kartlarını araştır
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
const dir = `${process.env.TEMP}/gazete-diag`;
const body = execFileSync('curl.exe', ['-sS', '-m', '40', `http://127.0.0.1:4100/proxy?url=${encodeURIComponent('https://www.evrensel.net/gazete')}`], { encoding: 'utf8', maxBuffer: 6 * 1024 * 1024 });
fs.writeFileSync(`${dir}/evrensel-net.html`, body, 'utf8');
const TRANS = s => s.replace(/ekim/gi, 'ekim');
const dates = [...new Set([...body.matchAll(/20\d\d[-/.]\d{1,2}[-/.]\d{1,2}/g)].map(m => m[0]))];
console.log('ISO tarih aday:', dates.slice(0, 10).join(' | ') || 'yok');
const imgHits = [...new Set([...body.matchAll(/(?:data-src|src)="([^"]*(?:gazete|manset)[^"]* Diana|[^"]*(?:gazete|manset)[^"]*")"/gi)].map(m => m[1]))];
console.log('img adi (gazete|manset):', imgHits.slice(0, 6).join('\n') || 'yok');
const hrefs = [...new Set([...body.matchAll(/href="(\/gazete[^"]*)"/gi)].map(m => m[1]))];
console.log('href /gazete...:', hrefs.slice(0, 8).join('\n') || 'yok');
// kart başlıkları
const h2 = [...body.matchAll(/<h2[^>]*>([\s\S]{0,80}?)<\/h2>/gi)].map(m => m[1].replace(/<[^>]+>/g, '').trim());
console.log('h2:', h2.slice(0, 10).join(' | ') || 'yok');
console.log('boyut:', body.length);
