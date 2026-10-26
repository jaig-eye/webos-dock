// Loopback dev server for the scene prototype: serves scene-proto/ and lets render.html save rendered plates.
// POST /save?name=plates/<phase>.jpg with a data: URL body writes that file (plates/ only).
// Usage: node scene-proto/tools/dev-server.js [port=5181]
const http = require('http');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const port = Number(process.argv[2] || 5181);
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.json': 'application/json', '.md': 'text/plain' };

http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  if (req.method === 'POST' && url.pathname === '/save') {
    const name = url.searchParams.get('name') || '';
    if (!/^(plates|icons)\/[a-z0-9-]+\.(jpg|png)$/.test(name)) { res.writeHead(400); res.end('bad name'); return; }
    let body = '';
    req.on('data', (c) => { body += c; if (body.length > 20e6) req.destroy(); });
    req.on('end', () => {
      const m = /^data:image\/(jpeg|png);base64,(.+)$/.exec(body);
      if (!m) { res.writeHead(400); res.end('bad body'); return; }
      fs.mkdirSync(path.join(root, path.dirname(name)), { recursive: true });
      fs.writeFileSync(path.join(root, name), Buffer.from(m[2], 'base64'));
      res.writeHead(200); res.end('saved ' + name);
      console.log('saved', name);
    });
    return;
  }
  let p = decodeURIComponent(url.pathname);
  if (p === '/') p = '/index.html';
  const file = path.join(root, p);
  if (!file.startsWith(root)) { res.writeHead(403); res.end(); return; }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(data);
  });
}).listen(port, '127.0.0.1', () => console.log('scene dev server on http://127.0.0.1:' + port));
