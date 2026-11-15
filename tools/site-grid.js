#!/usr/bin/env node
'use strict';
/* ==========================================================================
   site-grid.js -- the two tables of the Approach pages, drawn from the data.

     node tools/site-grid.js            check: each page carries exactly the table this file draws
     node tools/site-grid.js --write    draw them

   A table of counts written by hand goes stale; these are drawn from the files that hold the figures:
     site/grid.html   <!-- grid:table -->      the coverage grid: doc/design/coverage-count.js --json (the placement file,
                                                the law, media.json and the fixtures) -- a row per channel, a column per activity
     site/media.html  <!-- channels:table -->  the ten channels and their properties: conformance/media.json
     index.html       <!-- ideas:table -->     the front page's plate of intent, the channels and the grid: the same two sources
     site/designers.html <!-- verbs:table -->  the verbs by activity, the designers' grammar: coverage-count.js
     site/adopt.html, site/audit.html <!-- release:table -->  the files of the release: build.zig.zon and build.zig
   The check is run by tools/site-facts.js, so one command fails when either page drifts from its data.
   ========================================================================== */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const ROOT = path.join(__dirname, '..');
const R = p => path.join(ROOT, p);

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

function gridTable() {
  const r = spawnSync(process.execPath, [R('doc/design/coverage-count.js'), '--json'], { encoding: 'utf8', maxBuffer: 1 << 26 });
  if (r.status !== 0 && !r.stdout) throw new Error('coverage-count.js failed: ' + r.stderr);
  const g = JSON.parse(r.stdout).grid;
  const cell = {};
  for (const c of g.cells) cell[c.activity + '|' + c.column] = c;
  /* a row per channel and a column per activity, so the table fits the page beside its left list. The word of an empty cell and
     the fixtures' count each sit in a span, so that on a narrow window the word gives way to its mark and the count takes its own
     line (site/stz.css, "the grid under width pressure"; the table component, doc/design/DESIGN-SYSTEM.md section 6.4) */
  const head = g.activities.map(a => `<th scope="col">${esc(a)}</th>`).join('');
  const rows = g.columns.map(c => {
    const tds = g.activities.map(a => {
      const x = cell[a + '|' + c];
      if (x.closed) return '<td class="g-closed"><span class="word">closed</span></td>';
      if (x.rules > 0) return `<td class="g-has"><b>${x.rules}</b> <span class="fix">· ${x.fixtures}</span></td>`;
      return `<td class="g-none"><span class="word">none</span>${x.fixtures > 0 ? ' <span class="fix">· ' + x.fixtures + '</span>' : ''}</td>`;
    }).join('');
    return `    <tr><th scope="row">${c === 'any' ? 'any channel' : esc(c)}</th>${tds}</tr>`;
  }).join('\n');
  return `<div class="scroll">
<table class="gridmap">
  <caption>The coverage grid: each channel, and what a user does there. A cell reads <b>rules written for it · fixtures on it</b>.</caption>
  <thead><tr><th scope="col">Channel</th>${head}</tr></thead>
  <tbody>
${rows}
  </tbody>
</table>
</div>`;
}

function channelsTable() {
  const m = JSON.parse(fs.readFileSync(R('conformance/media.json'), 'utf8'));
  const verbs = ['DISCOVER', 'UNDERSTAND', 'LOCATE', 'FOCUS', 'FILTER', 'COMPARE', 'READ', 'SCAN', 'SCROLL', 'ZOOM', 'SELECT', 'HIGHLIGHT', 'PREVIEW', 'MARK',
    'ACT', 'CONFIRM', 'CANCEL', 'UNDO', 'PAUSE', 'RESUME', 'RETRY', 'EXIT'];
  const absentCount = c => {
    const car = c.carries || {};
    const keep = new Set([...(car.native || []), ...(car.degraded || [])]);
    return car.default === 'absent' ? verbs.filter(v => !keep.has(v)).length : (car.absent || []).length;
  };
  const rows = m.media.map(c => {
    const p = c.properties;
    return `    <tr><th scope="row">${esc(c.id)}</th><td>${esc(c.title)}</td><td>${esc(p.persistence)}</td><td>${esc(p.seriality)}</td><td>${esc(p.election)}</td>` +
      `<td>${esc(p.bandwidth)}</td><td>${esc(p.retractability)}</td><td>${c.soleCarrier ? 'yes' : 'no'}</td><td>${absentCount(c)} of ${verbs.length}</td></tr>`;
  }).join('\n');
  return `<div class="scroll">
<table class="gridmap channels">
  <caption>The ten channels, by what each is made of, from <code>conformance/media.json</code>.</caption>
  <thead><tr><th scope="col">Channel</th><th scope="col">What it is</th><th scope="col">Rendering stays</th><th scope="col">Order</th><th scope="col">Attention</th><th scope="col">Per glance</th><th scope="col">Can be withdrawn</th><th scope="col">Alone is a whole interface</th><th scope="col">Verbs it cannot carry</th></tr></thead>
  <tbody>
${rows}
  </tbody>
</table>
</div>`;
}

/* The front page's plate of the three ideas (ZAYN-SITE-RETHINK-01 addendum, rule 4; the Principal, 2026-11-14: "The frontapage hides very
   important concepts like : intent-driven, grid as a systematic conceptual framework, channels covered not only gui"): the verbs a user uses,
   by activity; the ten channels, a screen being one; and the grid they make, a row per channel and a column per activity, each cell the
   number of rules written for it, an open cell a dot and a closed one a cross, each with its word for a reader that reads the markup.
   Drawn from coverage-count.js --json and conformance/media.json, like the two tables above. */
function ideasFigure() {
  const r = spawnSync(process.execPath, [R('doc/design/coverage-count.js'), '--json'], { encoding: 'utf8', maxBuffer: 1 << 26 });
  if (r.status !== 0 && !r.stdout) throw new Error('coverage-count.js failed: ' + r.stderr);
  const g = JSON.parse(r.stdout).grid;
  const m = JSON.parse(fs.readFileSync(R('conformance/media.json'), 'utf8'));
  const cell = {};
  for (const c of g.cells) cell[c.activity + '|' + c.column] = c;
  /* the verbs and the channels are pairs, so each is a table with its lines, never a list (the Principal, 2026-11-15: "i told you MANY
     TIMES that tabular data should be presented in tables or grids!!") */
  const verbs = g.activities.filter(a => g.verbs[a].length).map(a => `          <tr><th scope="row">${esc(a)}</th><td>${g.verbs[a].map(esc).join(', ')}</td></tr>`).join('\n');
  const chans = m.media.map(c => `          <tr><th scope="row">${esc(c.id)}</th><td>${esc(c.title)}</td></tr>`).join('\n');
  let has = 0, open = 0, shut = 0;
  const rows = g.columns.map(col => {
    const tds = g.activities.map(a => {
      const x = cell[a + '|' + col];
      if (x.closed) { shut++; return '<td class="g-closed"><span aria-hidden="true">×</span><span class="sr">closed</span></td>'; }
      if (x.rules > 0) { has++; return `<td class="g-has"><b>${x.rules}</b></td>`; }
      open++; return '<td class="g-none"><span aria-hidden="true">·</span><span class="sr">open</span></td>';
    }).join('');
    return `        <tr><th scope="row">${col === 'any' ? 'any channel' : esc(col)}</th>${tds}</tr>`;
  }).join('\n');
  const head = g.activities.map(a => `<th scope="col">${esc(a)}</th>`).join('');
  return `<figure class="plate ideas">
  <div class="plate-head"><h3>Intent, the channels and the grid</h3></div>
  <div class="ideas-grid">
    <div class="idea">
      <h4 class="label">1. Intent: what a user is doing</h4>
      <p class="note">A verb belongs to one activity. Perceive and trust hold no verb of their own.</p>
      <table class="pairs verbs">
        <thead><tr><th scope="col">Activity</th><th scope="col">Its verbs</th></tr></thead>
        <tbody>
${verbs}
        </tbody>
      </table>
    </div>
    <div class="idea">
      <h4 class="label">2. Channels: where it happens</h4>
      <p class="note">One declaration serves any of them, and a verb a channel cannot carry is refused.</p>
      <table class="pairs">
        <thead><tr><th scope="col">Channel</th><th scope="col">What it is</th></tr></thead>
        <tbody>
${chans}
        </tbody>
      </table>
    </div>
    <div class="idea">
      <h4 class="label">3. The grid: what the law covers</h4>
      <p class="note">A row is a channel and a column an activity; a cell holds the number of rules written for it.</p>
      <table class="mini">
        <thead><tr><th scope="col">Channel</th>${head}</tr></thead>
        <tbody>
${rows}
        </tbody>
      </table>
      <p class="note"><b>${has}</b> cells hold a rule, <b>${open}</b> are open (<span aria-hidden="true">·</span>) and <b>${shut}</b> are closed (<span aria-hidden="true">×</span>): the channel cannot carry that activity.</p>
    </div>
  </div>
</figure>`;
}

/* The designers' page's grammar (ZAYN-SITE-RETHINK-01 step 3): the verbs a user uses, by activity, from the same counts as the grid */
function verbsFigure() {
  const r = spawnSync(process.execPath, [R('doc/design/coverage-count.js'), '--json'], { encoding: 'utf8', maxBuffer: 1 << 26 });
  if (r.status !== 0 && !r.stdout) throw new Error('coverage-count.js failed: ' + r.stderr);
  const g = JSON.parse(r.stdout).grid;
  const rows = g.activities.filter(a => g.verbs[a].length).map(a => `    <tr><th scope="row">${esc(a)}</th><td>${g.verbs[a].map(esc).join(', ')}</td></tr>`).join('\n');
  return `<table class="pairs verbs">\n  <thead><tr><th scope="col">Activity</th><th scope="col">Its verbs</th></tr></thead>\n  <tbody>\n${rows}\n  </tbody>\n</table>`;
}

/* The files of the release the site offers (the Principal, 2026-11-15: "you must prioritse the use of zayn through a dedicated zayn CLI
   executable raeady to be donwalded not to build", and "this information should also be displayed in a grid!"): a row per file, drawn
   from the version in build.zig.zon and the targets `zig build release` publishes (release_targets in build.zig), so the table names
   the files that build writes and never an older name. */
const RELEASE_SYSTEMS = {
  /* x86-64 carries a non-breaking hyphen, so the name never breaks in two on a phone */
  'x86_64-windows': ['Windows', 'x86‑64'], 'x86_64-linux': ['Linux', 'x86‑64'],
  'aarch64-linux': ['Linux', 'Arm (aarch64)'], 'x86_64-macos': ['macOS', 'Intel'], 'aarch64-macos': ['macOS', 'Apple silicon']
};
function releaseTable() {
  const version = /\.version = "([^"]+)"/.exec(fs.readFileSync(R('build.zig.zon'), 'utf8'))[1];
  const b = fs.readFileSync(R('build.zig'), 'utf8').replace(/\r\n/g, '\n');
  const block = b.slice(b.indexOf('const release_targets'), b.indexOf('};', b.indexOf('const release_targets')));
  const targets = [...block.matchAll(/\.name = "([^"]+)"/g)].map(m => m[1]);
  const base = `https://github.com/mayouni/zayn/releases/download/v${version}/`;
  /* the system and its processor share a cell, and a file's name may break only after a hyphen, so the table fits a phone */
  const row = (sys, cpu, file) => `    <tr><th scope="row">${esc(sys)}, ${esc(cpu)}</th><td><a href="${base}${file}"><code>${esc(file).replace(/-/g, '-<wbr>')}</code></a></td></tr>`;
  const rows = targets.map(t => {
    const [sys, cpu] = RELEASE_SYSTEMS[t] || [t, ''];
    return row(sys, cpu, `zayn-${version}-${t}${t.endsWith('-windows') ? '.exe' : ''}`);
  });
  rows.push(row('A browser', 'WebAssembly', `zayn-${version}.wasm`));
  return `<table class="pairs release">
  <caption>Zayn ${esc(version)}, as published on <a href="https://github.com/mayouni/zayn/releases/tag/v${version}">its release page</a>.</caption>
  <thead><tr><th scope="col">System</th><th scope="col">The file</th></tr></thead>
  <tbody>
${rows.join('\n')}
  </tbody>
</table>
<p>Each file's SHA-256 hash is in <a href="${base}SHA256SUMS"><code>SHA256SUMS</code></a> beside it, and <a href="https://github.com/mayouni/zayn/blob/v${version}/doc/releases/v${version}.md">the release notes</a> say how to check one.</p>`;
}

const BLOCKS = [
  { file: 'site/grid.html', name: 'grid:table', make: gridTable },
  { file: 'site/media.html', name: 'channels:table', make: channelsTable },
  { file: 'index.html', name: 'ideas:table', make: ideasFigure },
  { file: 'site/designers.html', name: 'verbs:table', make: verbsFigure },
  { file: 'site/adopt.html', name: 'release:table', make: releaseTable },
  { file: 'site/audit.html', name: 'release:table', make: releaseTable }
];

function main(argv) {
  const write = argv.includes('--write');
  const problems = [];
  for (const b of BLOCKS) {
    const file = R(b.file);
    if (!fs.existsSync(file)) { problems.push(`${b.file}: missing`); continue; }
    const raw = fs.readFileSync(file, 'utf8');
    const crlf = raw.includes('\r\n');
    const text = raw.replace(/\r\n/g, '\n');
    const re = new RegExp(`<!-- ${b.name} -->[\\s\\S]*?<!-- /${b.name} -->`);
    if (!re.test(text)) { problems.push(`${b.file}: no <!-- ${b.name} --> fence`); continue; }
    const out = text.replace(re, () => `<!-- ${b.name} -->\n${b.make()}\n<!-- /${b.name} -->`);
    if (out !== text) {
      if (write) { fs.writeFileSync(file, crlf ? out.replace(/\n/g, '\r\n') : out); console.log('wrote  ' + b.file); }
      else problems.push(`${b.file}: the ${b.name} differs from the data it is drawn from (run tools/site-grid.js --write)`);
    }
  }
  if (problems.length) { problems.forEach(m => console.log('PROBLEM ' + m)); return 1; }
  console.log(write ? 'grid written' : `grid ok: ${BLOCKS.length} tables match their data`);
  return 0;
}
if (require.main === module) process.exitCode = main(process.argv.slice(2));
module.exports = { gridTable, channelsTable, ideasFigure, verbsFigure, releaseTable };
