// Downloads the optional card logos into .downloads/ from two pinned sources, then run `node tools/build-logos.js`.
//   - Simple Icons 16.35.0 (CC0 icon data; the marks are their owners' trademarks)
//   - ln-dev7/logos-apps at commit 8bba11a (MIT code; the logos are their owners' trademarks, no licence granted)
// The repository ships without these files; fetch them for your own TV and don't redistribute them.
// Usage: node tools/fetch-logos.js
const https = require('https');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const SI = { dir: 'simple-icons-16.35.0', base: 'https://cdn.jsdelivr.net/npm/simple-icons@16.35.0/icons/', files: ['hbomax', 'appletv', 'tubi', 'crunchyroll'] };
const LA = { dir: 'logos-apps-8bba11a', base: 'https://raw.githubusercontent.com/ln-dev7/logos-apps/8bba11a4047d8f35f85a1c0728b4a68434384b3e/logos/',
  files: ['youtube-wordmark', 'netflix-wordmark', 'disney-plus', 'hulu', 'peacock', 'prime-video'] };

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) { res.resume(); reject(new Error(res.statusCode + ' ' + url)); return; }
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (c) => { body += c; if (body.length > 200000) res.destroy(new Error('too large')); });
      res.on('end', () => resolve(body));
    }).on('error', reject);
  });
}

(async () => {
  for (const src of [SI, LA]) {
    const dir = path.join(root, '.downloads', src.dir);
    fs.mkdirSync(dir, { recursive: true });
    for (const f of src.files) {
      try {
        fs.writeFileSync(path.join(dir, f + '.svg'), await get(src.base + f + '.svg'));
        console.log('ok  ', src.dir + '/' + f + '.svg');
      } catch (e) { console.log('fail', f, e.message); }
    }
  }
  console.log('Now run: node tools/build-logos.js');
})();
