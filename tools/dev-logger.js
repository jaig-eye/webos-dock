// Development logger: listens on this PC's LAN address, prints what a development build of Dock sends
// (errors, timings, weather, scene events) and appends it to dev-log.jsonl. Stop it with Ctrl+C.
// Usage: node tools/dev-logger.js <this PC's LAN address> [port=8765]   (and set debugLogger in home/js/config.js)
const http = require('http');
const fs = require('fs');
const path = require('path');

const host = process.argv[2];
if (!host) { console.error('usage: node tools/dev-logger.js <this PC LAN address> [port]'); process.exit(1); }
const port = Number(process.argv[3] || 8765);
const out = path.resolve(__dirname, '..', 'dev-log.jsonl');

http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
  let body = '';
  req.on('data', (c) => { if (body.length < 20000) body += c; });
  req.on('end', () => {
    res.writeHead(204); res.end();
    if (req.method !== 'POST' || req.url !== '/log') return;
    try {
      const e = JSON.parse(body);
      fs.appendFileSync(out, JSON.stringify(e) + '\n');
      console.log(`[r${e.run}] ${String(e.status).padEnd(4)} ${e.key}  ${String(e.detail).slice(0, 160)}`);
    } catch (err) { console.log('bad payload', body.slice(0, 80)); }
  });
}).listen(port, host, () => console.log(`spike logger on http://${host}:${port}/log -> ${out}`));
