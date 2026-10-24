import fs from 'node:fs';
const h = fs.readFileSync('tasks/nefes-probe-page.html', 'utf8');
const m = [...h.matchAll(/<meta[^>]+(?:property|name)=["'](og:image|og:title|twitter:image)["'][^>]+content=["']([^"']+)["']/gi)];
for (const x of m) console.log(x[1], '=', x[2].slice(0, 200));
