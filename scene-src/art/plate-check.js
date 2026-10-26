'use strict';
// Builds all five Pip's Dock plates from plate.js and checks that each one is a well-formed SVG document of
// reasonable size: root svg with viewBox/width/height 1920x1080, balanced tags, quoted attributes, no stray text,
// every url(#id) defined, no duplicate ids, no external refs, no undefined/NaN/null leaks. It also checks that all
// palettes share one key set and that the static geometry is identical in every phase (phase-only layers live in
// <g id="phase-..."> groups; colours/opacities are ignored for that comparison).
// Usage: node plate-check.js [--out <dir>]   (--out also writes plate-<phase>.svg there; exit 1 on any FAIL)
const fs = require('fs');
const path = require('path');
const { buildPlate } = require('./plate.js');

const PHASES = ['dawn', 'day', 'golden', 'dusk', 'night'];
const outAt = process.argv.indexOf('--out');
const outDir = outAt > -1 ? process.argv[outAt + 1] : null;
if (outDir) fs.mkdirSync(outDir, { recursive: true });

function checkTags(svg) {
  const problems = [], stack = [];
  const re = /<(\/?)([a-zA-Z][\w:-]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/g;
  let m, last = 0, count = 0;
  while ((m = re.exec(svg))) {
    const between = svg.slice(last, m.index);
    const top = stack[stack.length - 1];
    if (between.trim() && top !== 'text' && top !== 'title') problems.push('stray text before <' + m[1] + m[2] + '>: ' + between.trim().slice(0, 40));
    if (/[<>]/.test(between)) problems.push('stray < or > before <' + m[1] + m[2] + '>');
    last = re.lastIndex;
    const close = m[1] === '/', name = m[2], self = /\/\s*$/.test(m[3]);
    const attrs = self ? m[3].replace(/\/\s*$/, '') : m[3];
    if (close) {
      const open = stack.pop();
      if (open !== name) { problems.push('mismatched </' + name + '> (open: ' + open + ')'); break; }
    } else {
      count++;
      if (attrs.trim() && !/^(\s+[\w:-]+="[^"]*")+\s*$/.test(attrs)) problems.push('malformed attributes on <' + name + '>: ' + attrs.slice(0, 60));
      const names = (attrs.match(/\s([\w:-]+)=/g) || []).map(a => a.trim());
      if (new Set(names).size !== names.length) problems.push('duplicate attribute on <' + name + '>');
      if (!self) stack.push(name);
    }
  }
  if (svg.slice(last).trim()) problems.push('content after the closing tag');
  if (stack.length) problems.push('unclosed: ' + stack.join(', '));
  return { problems, count };
}

function stripPhaseLayers(svg) { // drop every <g id="phase-..."> ... </g> subtree (they may contain nested groups)
  let out = '', i = 0, m;
  const start = /<g id="phase-[^"]*"[^>]*>/g;
  while ((m = start.exec(svg))) {
    if (m.index < i) continue;
    out += svg.slice(i, m.index);
    const g = /<(\/?)g\b((?:[^>"']|"[^"]*")*)>/g;
    g.lastIndex = m.index;
    let depth = 0, k, end = svg.length;
    while ((k = g.exec(svg))) {
      if (k[1]) { if (--depth === 0) { end = g.lastIndex; break; } } else if (!/\/\s*$/.test(k[2])) depth++;
    }
    i = end;
    start.lastIndex = end;
  }
  return out + svg.slice(i);
}

function geometrySignature(svg) {
  return stripPhaseLayers(svg.replace(/<defs>[\s\S]*?<\/defs>/, '').replace(/<title>[\s\S]*?<\/title>/, ''))
    .replace(/\s(fill|stroke|opacity|stop-color|stop-opacity)="[^"]*"/g, '');
}

let bad = 0;
const sigs = {};
for (const phase of PHASES) {
  const problems = [];
  let svg = '';
  try { svg = buildPlate(phase); } catch (e) { problems.push('buildPlate threw: ' + e.message); }
  let count = 0;
  if (typeof svg !== 'string' || !svg) problems.push('buildPlate did not return a string');
  else {
    const root = /^<svg\b([^>]*)>/.exec(svg);
    if (!root) problems.push('document must start with <svg ...>');
    else {
      if (!/\sxmlns="http:\/\/www\.w3\.org\/2000\/svg"/.test(root[1])) problems.push('root needs xmlns');
      if (!/\sviewBox="0 0 1920 1080"/.test(root[1])) problems.push('root needs viewBox="0 0 1920 1080"');
      if (!/\swidth="1920"/.test(root[1]) || !/\sheight="1080"/.test(root[1])) problems.push('root needs width="1920" height="1080"');
    }
    if (!/<\/svg>\s*$/.test(svg)) problems.push('document must end with </svg>');
    const t = checkTags(svg);
    problems.push(...t.problems);
    count = t.count;
    if (/undefined|NaN|Infinity|null|\[object/.test(svg)) problems.push('leaked undefined/NaN/null/object into markup');
    if (/&(?!amp;|lt;|gt;|quot;|apos;|#\d+;|#x[0-9a-f]+;)/i.test(svg)) problems.push('unescaped &');
    if (/\son[a-z]+\s*=|href\s*=|url\((?!#)|<!ENTITY|<!DOCTYPE|<script|<image|<foreignObject/i.test(svg)) problems.push('script, event handler, external reference or entity found');
    const ids = (svg.match(/\sid="[^"]+"/g) || []).map(s => s.slice(5, -1));
    const idSet = new Set(ids);
    if (idSet.size !== ids.length) problems.push('duplicate ids: ' + ids.filter((v, i) => ids.indexOf(v) !== i).join(', '));
    for (const ref of svg.match(/url\(#[^)]+\)/g) || []) if (!idSet.has(ref.slice(5, -1))) problems.push('undefined reference ' + ref);
    const kb = Buffer.byteLength(svg) / 1024;
    if (kb < 20 || kb > 1500) problems.push('size ' + kb.toFixed(1) + ' KB outside 20-1500 KB');
    sigs[phase] = geometrySignature(svg);
    if (outDir) fs.writeFileSync(path.join(outDir, 'plate-' + phase + '.svg'), svg);
  }
  const kb = svg ? (Buffer.byteLength(svg) / 1024).toFixed(1) + ' KB' : '-';
  console.log((problems.length ? 'FAIL ' : 'ok   ') + phase.padEnd(7) + kb.padStart(10) + (count ? '  ' + count + ' elements' : '') +
    (problems.length ? '\n  - ' + [...new Set(problems)].slice(0, 12).join('\n  - ') : ''));
  if (problems.length) bad++;
}

// one key set for every palette
const pal = buildPlate.PALETTES || {};
const keys0 = Object.keys(pal[PHASES[0]] || {}).sort().join(',');
const palProblems = PHASES.filter(p => !pal[p] || Object.keys(pal[p]).sort().join(',') !== keys0)
  .map(p => p + ' palette keys differ from ' + PHASES[0]);
console.log((palProblems.length ? 'FAIL ' : 'ok   ') + 'palettes: ' + PHASES.length + ' phases share ' + keys0.split(',').length + ' keys' +
  (palProblems.length ? '\n  - ' + palProblems.join('\n  - ') : ''));
if (palProblems.length) bad++;

// same geometry in every phase
const geoProblems = [];
for (const p of PHASES.slice(1)) {
  const a = sigs[PHASES[0]], b = sigs[p];
  if (a == null || b == null) { geoProblems.push(p + ': no plate to compare'); continue; }
  if (a !== b) {
    let i = 0;
    while (i < a.length && a[i] === b[i]) i++;
    geoProblems.push(p + ' geometry differs from ' + PHASES[0] + ' near: ' + JSON.stringify(b.slice(Math.max(0, i - 40), i + 40)));
  }
}
console.log((geoProblems.length ? 'FAIL ' : 'ok   ') + 'geometry: static layers identical across phases' +
  (geoProblems.length ? '\n  - ' + geoProblems.join('\n  - ') : ''));
if (geoProblems.length) bad++;

process.exit(bad ? 1 : 0);
