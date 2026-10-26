// Checks SVG sprite files against STYLE.md: well-formed tags, root svg with viewBox/width/height, and no
// disallowed elements. Usage: node scene-proto/tools/check-svg.js <file.svg> [more...]   (exit 1 on any problem)
const fs = require('fs');
const ALLOWED = new Set(['svg', 'path', 'rect', 'circle', 'ellipse', 'polygon', 'polyline', 'line', 'g', 'defs',
  'linearGradient', 'radialGradient', 'stop', 'clipPath', 'title', 'desc']);
let bad = 0;
for (const f of process.argv.slice(2)) {
  const t = fs.readFileSync(f, 'utf8');
  const problems = [];
  const root = /<svg\b([^>]*)>/.exec(t);
  if (!root) problems.push('no <svg> root');
  else {
    if (!/viewBox="0 0 \d+(\.\d+)? \d+(\.\d+)?"/.test(root[1])) problems.push('root needs viewBox="0 0 W H"');
    if (!/\swidth="\d+/.test(root[1]) || !/\sheight="\d+/.test(root[1])) problems.push('root needs width and height');
  }
  const stack = [];
  const re = /<(\/?)([a-zA-Z][\w:-]*)([^>]*?)(\/?)>/g;
  let m;
  while ((m = re.exec(t))) {
    const [, close, name, , self] = m;
    if (!close && !ALLOWED.has(name)) problems.push('element not allowed: <' + name + '>');
    if (close) { const top = stack.pop(); if (top !== name) { problems.push('mismatched </' + name + '> (open: ' + top + ')'); break; } }
    else if (!self) stack.push(name);
  }
  if (stack.length) problems.push('unclosed: ' + stack.join(', '));
  if (/\son[a-z]+\s*=|href\s*=|url\((?!#)|<!ENTITY|<!DOCTYPE/i.test(t)) problems.push('event handler, href, external url or entity found');
  if (/\bfilter=|<filter|<mask|<image|<text|<style|<script|<animate|<set\b/i.test(t)) problems.push('filter/mask/image/text/style/script/animation not allowed in sprites');
  console.log((problems.length ? 'FAIL ' : 'ok   ') + f + (problems.length ? '\n  - ' + problems.join('\n  - ') : ''));
  if (problems.length) bad++;
}
process.exit(bad ? 1 : 0);
