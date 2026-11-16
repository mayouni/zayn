/* The "try it" box on the Build page: it hands the declaration to the verifier compiled to wasm (zayn-wasm.js) and shows the
   envelope it returns, one finding per line. It decides nothing itself: every verdict, code, message and citation comes from
   the wasm. Nothing leaves the page.

   The testbench (form.try.ide, site/testbench.html and the Designers page; the Principal, 2026-11-15: "add a testbench of the languuage
   in the browser, in the form of well designed simple IDE with code to left and output to right"): the code in the left pane, the
   report in the right, set out as the zayn command sets it out; it checks as you type, Ctrl+Enter checks at once, an example from the
   list replaces the code, and a finding's line selects that line in the code. */
(async () => {
  const form = document.getElementById('try-form');
  if (!form) return;
  const out = document.getElementById('try-result'), button = form.querySelector('button');
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; return e; };
  let zayn;
  try { zayn = await ZaynWasm.load(form.dataset.wasm); } catch (e) {
    out.replaceChildren(el('p', 'try-verdict bad', 'The verifier could not load in this browser: ' + e.message + '.'));
    return;
  }
  if (form.classList.contains('ide')) { ide(); return; }
  function ide() {
    const area = document.getElementById('try-source'), level = document.getElementById('try-level');
    const examples = document.getElementById('try-example'), file = form.querySelector('.ide-file');
    const lines = document.getElementById('try-lines');
    /* the height the code's own lines take, measured without the pane's least height, which then still applies */
    /* the code fills its pane's height (a stretched row), and its least height grows with its lines, so the code never scrolls inside */
    const floor = parseFloat(getComputedStyle(area).minHeight) || 0;
    const natural = () => {
      const s = area.style, keep = s.minHeight;
      s.minHeight = '0'; s.alignSelf = 'flex-start'; s.height = 'auto';
      const h = area.scrollHeight;
      s.alignSelf = ''; s.height = ''; s.minHeight = keep;
      return h;
    };
    const grow = () => { area.style.minHeight = Math.max(floor, natural() + 2) + 'px'; };
    /* the gutter numbers each line of the code; when a line is too long for the pane and wraps, a number would stand beside the
       wrong line, so the gutter steps aside until the lines fit again */
    const number = () => {
      if (!lines) return;
      const n = area.value.split('\n').length;
      lines.textContent = Array.from({ length: n }, (_, i) => i + 1).join('\n');
      lines.hidden = false;
      /* a line wraps when its width, in the code's own font, passes the width the pane gives it */
      const s = getComputedStyle(area), room = area.clientWidth - parseFloat(s.paddingLeft) - parseFloat(s.paddingRight);
      const pen = (number.pen ||= document.createElement('canvas').getContext('2d'));
      pen.font = `${s.fontWeight} ${s.fontSize} ${s.fontFamily}`;
      lines.hidden = area.value.split('\n').some(l => pen.measureText(l).width > room);
      grow();
    };
    const select = n => {
      const at = area.value.split('\n'), start = at.slice(0, n - 1).reduce((s, l) => s + l.length + 1, 0);
      area.focus(); area.setSelectionRange(start, start + (at[n - 1] || '').length);
    };
    function run() {
      const name = file ? file.textContent : 'declaration.zayn';
      const text = zayn.check(name, area.value, { level: +level.value });
      if (text === null) { out.replaceChildren(el('p', 'try-verdict bad', 'The verifier refused the request.')); return; }
      const r = JSON.parse(text), n = r.counts, parts = [];
      for (const d of r.diagnostics) {
        /* a link within the report's text, so a finding's place reads as part of its line (K17 exempts it, as WCAG 2.5.8 does) */
        const at = el('a', 'ide-line', `${name}:${d.span.line}`); at.href = '#try-source';
        at.setAttribute('aria-label', `${name}, line ${d.span.line}: select it in the code`);
        at.addEventListener('click', e => { e.preventDefault(); select(d.span.line); });
        parts.push(at, '  ', el('span', d.severity === 'error' ? 'bad' : 'dim', `${d.severity}  ${d.code}`), d.subject ? `  ${d.subject}` : '', '\n    ' + d.message + '\n');
        if (d.cites.length) parts.push(el('span', 'dim', '    cites ' + d.cites.join(', ')), '\n');
      }
      if (r.diagnostics.length) parts.push(`\n${n.errors} error(s), ${n.warnings} warning(s) at level ${r.level}`);
      else parts.push(el('span', 'good', 'clean'), ` · 0 violations at level ${r.level} against Zayn v${r.contract.constitution}`);
      const pre = el('pre', 'ide-report'); pre.append(...parts);
      out.replaceChildren(pre);
    }
    let timer = 0;
    const soon = () => { clearTimeout(timer); timer = setTimeout(run, 120); };
    area.addEventListener('input', () => { grow(); number(); soon(); });
    area.addEventListener('keydown', e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); run(); } });
    level.addEventListener('change', run);
    if (examples) examples.addEventListener('change', () => {
      const o = examples.selectedOptions[0];
      area.value = o.dataset.src.replace(/\\n/g, '\n');
      if (file) file.textContent = o.dataset.file;
      grow(); number(); run();
    });
    form.addEventListener('submit', e => { e.preventDefault(); run(); });
    button.disabled = false;
    grow(); number(); run();
  }
  function check() {
    const level = +document.getElementById('try-level').value;
    const text = zayn.check('this-page.zayn', document.getElementById('try-source').value, { level });
    if (text === null) { out.replaceChildren(el('p', 'try-verdict bad', 'The verifier refused the request.')); return; }
    const r = JSON.parse(text), n = r.counts;
    const verdict = r.diagnostics.length === 0
      ? `Clean: 0 violations at level ${r.level} against Zayn v${r.contract.constitution}.`
      : `${n.errors} error(s) and ${n.warnings} warning(s) at level ${r.level}.`;
    const list = el('ul');
    for (const d of r.diagnostics) {
      const li = el('li');
      li.append(el('b', null, `Line ${d.span.line} · ${d.severity} · ${d.code}`), document.createTextNode(` — ${d.message}`));
      if (d.cites.length) li.append(el('br'), document.createTextNode('Cites ' + d.cites.join(', ') + '.'));
      list.append(li);
    }
    out.replaceChildren(el('p', 'try-verdict ' + (n.errors ? 'bad' : 'good'), verdict), ...(r.diagnostics.length ? [list] : []));
  }
  form.addEventListener('submit', e => { e.preventDefault(); check(); });
  button.disabled = false;
  check();
})();

/* The plate on the front page (site/stz.css): a third state, the reader's own declaration, which the verifier compiled to wasm checks
   as it is typed. It starts as the declaration first written, and its answer is the envelope's own diagnostics, set out as the zayn
   command sets out its report. Without a script the plate shows its two real runs, and this state does not appear. */
(async () => {
  const plate = document.querySelector('figure.plate[data-wasm]');
  if (!plate) return;
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; return e; };
  const first = plate.querySelector('.state.first pre.shot');
  /* the declaration as written: site/stz.js sets each line of a shot in a span of its own, so the lines are read one by one */
  const lines = first ? [...first.querySelectorAll(':scope > .ln')].map(l => l.textContent) : [];
  const source = lines.length ? lines.join('\n') : first ? first.textContent.replace(/\s+$/, '') : '';
  const name = (/\/\/\s*(\S+\.zayn)/.exec(source) || [null, 'yours.zayn'])[1];
  const opt = el('label');
  const radio = el('input'); radio.type = 'radio'; radio.name = 'plate-state'; radio.value = 'own';
  opt.append(radio, document.createTextNode(' your own'));
  plate.querySelector('.switch').append(opt);
  const st = el('div', 'state own');
  const src = el('div', 'own-src');
  const lab = el('label', null, 'Edit the declaration, and the verifier answers as you type'); lab.htmlFor = 'own-source';
  const area = el('textarea'); area.id = 'own-source'; area.spellcheck = false; area.value = source;
  src.append(lab, area);
  const out = el('pre', 'own-out', 'The verifier is loading.'); out.setAttribute('role', 'status'); out.setAttribute('aria-live', 'polite');
  st.append(el('p', 'label l1', '1. You write what the user does'), src, el('p', 'label l2', '2. The verifier, in this page, answers'), out,
    el('p', 'gloss g1', 'Add or remove a verb, a field or a declaration: every change is checked at once.'),
    el('p', 'gloss g2', 'Nothing you type leaves the page. This verifier is built from the same code as the zayn command.'),
    el('p', 'label l3', '3. What a person meets'),
    el('p', 'story note', 'Zayn checks the declaration, and the screen stays yours to draw.'));
  plate.querySelector('.plate-grid').append(st);
  const cap = document.getElementById('plate-caption');
  if (cap) cap.append(' Choose ', el('b', null, 'your own'), ' above to edit the declaration: the verifier runs in this page.');
  let zayn;
  try { zayn = await ZaynWasm.load(plate.dataset.wasm); } catch (e) { out.textContent = 'The verifier could not load in this browser: ' + e.message + '.'; return; }
  let timer = 0;
  function check() {
    const text = zayn.check(name, area.value, { level: 2 });
    if (text === null) { out.textContent = 'The verifier refused the request.'; return; }
    const r = JSON.parse(text), n = r.counts, lines = [];
    for (const d of r.diagnostics) {
      const head = el('span');
      head.append(`${d.span.file}:${d.span.line}  `, el('span', d.severity === 'error' ? 'bad' : 'dim', `${d.severity}  ${d.code}`), d.subject ? `  ${d.subject}` : '');
      lines.push(head, '\n    ' + d.message + '\n');
      if (d.cites.length) lines.push(el('span', 'dim', '    cites ' + d.cites.join(', ')), '\n');
    }
    if (r.diagnostics.length) lines.push(`\n${n.errors} error(s), ${n.warnings} warning(s) at level ${r.level}`);
    else lines.push(el('span', 'good', 'clean'), ` · 0 violations at level ${r.level} against Zayn v${r.contract.constitution}`);
    out.replaceChildren(...lines);
  }
  area.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(check, 120); });
  check();
})();
