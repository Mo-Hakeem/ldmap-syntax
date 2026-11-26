import { ParsedMap } from './parser';

export function getMapWebviewContent(parsed: ParsedMap, fileName: string): string {
  const payload = JSON.stringify({ fileName, ...parsed }).replace(/<\//g, '<\\/');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';">
<style>
  :root { color-scheme: dark light; }
  * { box-sizing: border-box; }
  html, body { height: 100%; margin: 0; }
  body {
    font-family: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif);
    font-size: 12px;
    background: var(--vscode-editor-background, #1e1e1e);
    color: var(--vscode-editor-foreground, #d4d4d4);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .mono {
    font-family: var(--vscode-editor-font-family, 'Cascadia Code', Consolas, monospace);
  }
  #toolbar {
    display: flex; gap: 8px; align-items: center; flex-wrap: wrap;
    padding: 8px 12px;
    background: var(--vscode-editorWidget-background, #252526);
    border-bottom: 1px solid var(--vscode-panel-border, #3c3c3c);
    flex: 0 0 auto;
  }
  #title { font-weight: 600; font-size: 13px; margin-right: 4px; }
  input[type="text"], button {
    background: var(--vscode-input-background, #3c3c3c);
    color: var(--vscode-input-foreground, #d4d4d4);
    border: 1px solid var(--vscode-input-border, #555);
    padding: 3px 8px; border-radius: 3px; font: inherit;
  }
  input[type="text"] { width: 240px; }
  input[type="text"]:focus, button:focus {
    outline: 1px solid var(--vscode-focusBorder, #007fd4);
    outline-offset: -1px;
  }
  button { cursor: pointer; }
  button:hover { filter: brightness(1.15); }
  #tabs {
    display: flex; gap: 2px; padding: 6px 12px 0;
    background: var(--vscode-editorWidget-background, #252526);
    border-bottom: 1px solid var(--vscode-panel-border, #3c3c3c);
    flex: 0 0 auto;
  }
  .tab {
    padding: 6px 12px; border: 1px solid transparent; border-bottom: none;
    border-radius: 4px 4px 0 0; background: transparent;
    color: var(--vscode-descriptionForeground, #999); cursor: pointer;
  }
  .tab:hover { color: var(--vscode-editor-foreground, #d4d4d4); }
  .tab.active {
    background: var(--vscode-editor-background, #1e1e1e);
    color: var(--vscode-editor-foreground, #fff);
    border-color: var(--vscode-panel-border, #3c3c3c);
    font-weight: 600;
  }
  .badge {
    display: inline-block; margin-left: 5px; padding: 0 5px;
    border-radius: 8px; font-size: 10px;
    background: rgba(128,128,128,0.22);
  }
  #content { flex: 1 1 auto; overflow: auto; padding: 12px; }
  .cards {
    display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 10px; margin-bottom: 14px;
  }
  .card {
    background: var(--vscode-editorWidget-background, #252526);
    border: 1px solid var(--vscode-panel-border, #3c3c3c);
    border-radius: 5px; padding: 10px 12px;
  }
  .card-head { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 6px; }
  .card-title { font-weight: 600; font-size: 13px; }
  .card-sub { color: var(--vscode-descriptionForeground, #999); font-size: 11px; }
  .bar-bg {
    height: 8px; border-radius: 4px; overflow: hidden;
    background: rgba(128,128,128,0.2); margin: 6px 0;
  }
  .bar-fill { height: 100%; border-radius: 4px; transition: width 0.2s ease; }
  .bar-ok { background: #2ea043; }
  .bar-warn { background: #d29922; }
  .bar-crit { background: #f85149; }
  table { width: 100%; border-collapse: collapse; }
  th, td {
    text-align: left; padding: 5px 8px;
    border-bottom: 1px solid var(--vscode-panel-border, #2d2d2d);
    vertical-align: top;
  }
  th {
    position: sticky; top: 0; z-index: 1;
    background: var(--vscode-editorWidget-background, #252526);
    color: var(--vscode-descriptionForeground, #aaa);
    font-weight: 600; font-size: 11px; user-select: none;
  }
  th.sortable { cursor: pointer; }
  th.sortable:hover { color: var(--vscode-editor-foreground, #fff); }
  tr.sec-row { cursor: pointer; }
  tr.sec-row:hover { background: var(--vscode-list-hoverBackground, #2a2d2e); }
  .num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .addr { color: var(--vscode-textLink-foreground, #569cd6); white-space: nowrap; }
  .sec-name { color: var(--vscode-symbolIcon-structForeground, #c586c0); font-weight: 600; }
  .pill {
    display: inline-block; padding: 1px 6px; border-radius: 3px; font-size: 10px;
    background: rgba(86, 156, 214, 0.16); color: var(--vscode-textLink-foreground, #9cdcfe);
  }
  .fill-tag { color: var(--vscode-descriptionForeground, #888); font-style: italic; }
  .sub-wrap { background: rgba(128,128,128,0.05); padding: 6px 12px 10px 26px; }
  .sub-table td { padding: 3px 8px; font-size: 11px; border-bottom-color: rgba(128,128,128,0.12); }
  .sym-chip {
    display: inline-block; margin: 1px 4px 1px 0; padding: 0 5px;
    border-radius: 3px; font-size: 10px;
    background: rgba(181, 206, 168, 0.14); color: var(--vscode-debugTokenExpression-number, #b5cea8);
  }
  .mini-bar {
    display: inline-block; height: 6px; border-radius: 3px;
    background: var(--vscode-textLink-foreground, #569cd6); vertical-align: middle;
  }
  .muted { color: var(--vscode-descriptionForeground, #888); }
  .right { margin-left: auto; display: inline-flex; gap: 8px; align-items: center; }
</style>
</head>
<body>
<div id="toolbar">
  <span id="title" class="mono"></span>
  <input id="search" type="text" placeholder="Filter sections, objects, symbols...">
  <label><input type="checkbox" id="hideZero" checked> Hide 0-size &amp; debug</label>
  <span class="right">
    <button id="openRawBtn" type="button" title="View raw syntax-highlighted .map text">Open Raw Text</button>
  </span>
</div>
<div id="tabs"></div>
<div id="content"></div>

<script>
const vscode = typeof acquireVsCodeApi === 'function' ? acquireVsCodeApi() : null;
let DATA = ${payload};
let activeTab = 'overview';
let objSort = { key: 'total', dir: -1 };
let expanded = new Set();

const titleEl = document.getElementById('title');
const searchEl = document.getElementById('search');
const hideZeroEl = document.getElementById('hideZero');
const tabsEl = document.getElementById('tabs');
const contentEl = document.getElementById('content');

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function hex(n) {
  return '0x' + (n >>> 0).toString(16).toUpperCase().padStart(8, '0');
}
function fmtBytes(n) {
  if (n >= 1048576) return n.toLocaleString() + ' B (' + (n / 1048576).toFixed(2) + ' MiB)';
  if (n >= 1024) return n.toLocaleString() + ' B (' + (n / 1024).toFixed(1) + ' KiB)';
  return n.toLocaleString() + ' B';
}
function fmtShort(n) {
  if (n >= 1048576) return (n / 1048576).toFixed(2) + ' MiB';
  if (n >= 1024) return (n / 1024).toFixed(1) + ' KiB';
  return n + ' B';
}

function renderTabs() {
  const tabs = [
    { id: 'overview', label: 'Memory & Sections', count: DATA.outputSections.length },
    { id: 'objects', label: 'Object Files', count: DATA.objects.length },
    { id: 'symbols', label: 'Symbols', count: DATA.symbols.length },
    { id: 'discarded', label: 'Discarded', count: DATA.discarded.length },
  ];
  if (DATA.archiveMembers.length || DATA.crossRefs.length) {
    tabs.push({ id: 'xref', label: 'Archives & XRef', count: DATA.archiveMembers.length + DATA.crossRefs.length });
  }
  tabsEl.innerHTML = tabs.map(t =>
    '<button class="tab' + (activeTab === t.id ? ' active' : '') + '" data-tab="' + t.id + '">' +
      esc(t.label) + '<span class="badge">' + t.count.toLocaleString() + '</span>' +
    '</button>'
  ).join('');
}

function renderOverview(q, hideZero) {
  let html = '';
  const realRegions = DATA.regions.filter(r => r.name !== '*default*');
  if (realRegions.length) {
    html += '<div class="cards">';
    for (const r of realRegions) {
      const pct = r.length > 0 ? Math.min(100, (r.used / r.length) * 100) : 0;
      const cls = pct > 90 ? 'bar-crit' : pct > 75 ? 'bar-warn' : 'bar-ok';
      const free = Math.max(0, r.length - r.used);
      html += '<div class="card">' +
        '<div class="card-head"><span class="card-title mono">' + esc(r.name) + '</span>' +
        '<span class="card-sub mono">' + hex(r.origin) + ' (' + fmtShort(r.length) + ') ' + esc(r.attributes) + '</span></div>' +
        '<div class="bar-bg"><div class="bar-fill ' + cls + '" style="width:' + pct.toFixed(1) + '%"></div></div>' +
        '<div class="card-head" style="margin:0;"><span class="mono">' + fmtShort(r.used) + ' used (' + pct.toFixed(1) + '%)</span>' +
        '<span class="card-sub mono">' + fmtShort(free) + ' free</span></div>' +
      '</div>';
    }
    html += '</div>';
  }

  const secs = DATA.outputSections.filter(s => {
    if (hideZero && (s.size === 0 || s.name.startsWith('.debug_') || s.name === '.comment' || s.name === '.ARM.attributes')) return false;
    if (!q) return true;
    if (s.name.toLowerCase().includes(q) || (s.region || '').toLowerCase().includes(q)) return true;
    return s.inputs.some(inp =>
      inp.name.toLowerCase().includes(q) ||
      inp.file.toLowerCase().includes(q) ||
      inp.symbols.some(sym => sym.name.toLowerCase().includes(q))
    );
  });

  html += '<table><thead><tr>' +
    '<th>Output Section</th><th>Region</th><th class="num">VMA</th><th class="num">LMA</th><th class="num">Size</th><th class="num">Inputs</th>' +
    '</tr></thead><tbody>';

  for (let idx = 0; idx < secs.length; idx++) {
    const s = secs[idx];
    const key = s.name + '@' + s.addr;
    const isOpen = expanded.has(key) || (q.length > 0 && secs.length <= 20);
    html += '<tr class="sec-row" data-sec="' + esc(key) + '">' +
      '<td class="mono sec-name">' + (isOpen ? '&#9662; ' : '&#9656; ') + esc(s.name) + '</td>' +
      '<td>' + (s.region ? '<span class="pill mono">' + esc(s.region) + '</span>' : '<span class="muted">-</span>') + '</td>' +
      '<td class="num mono addr">' + hex(s.addr) + '</td>' +
      '<td class="num mono muted">' + (s.lma !== undefined ? hex(s.lma) : '-') + '</td>' +
      '<td class="num mono">' + fmtBytes(s.size) + '</td>' +
      '<td class="num muted">' + s.inputs.length + '</td>' +
    '</tr>';

    if (isOpen && s.inputs.length) {
      const inputs = s.inputs.filter(inp => {
        if (!q) return true;
        return s.name.toLowerCase().includes(q) ||
          inp.name.toLowerCase().includes(q) ||
          inp.file.toLowerCase().includes(q) ||
          inp.symbols.some(sym => sym.name.toLowerCase().includes(q));
      });
      html += '<tr><td colspan="6" class="sub-wrap"><table class="sub-table"><thead><tr>' +
        '<th>Input Section</th><th class="num">Address</th><th class="num">Size</th><th>Object / Archive</th><th>Symbols</th>' +
        '</tr></thead><tbody>';
      for (const inp of inputs.slice(0, 500)) {
        const syms = inp.symbols.map(sym => '<span class="sym-chip mono">' + esc(sym.name) + '</span>').join('');
        html += '<tr>' +
          '<td class="mono ' + (inp.isFill ? 'fill-tag' : '') + '">' + esc(inp.name) + '</td>' +
          '<td class="num mono addr">' + hex(inp.addr) + '</td>' +
          '<td class="num mono">' + inp.size.toLocaleString() + ' B</td>' +
          '<td class="mono">' + esc(inp.file) + '</td>' +
          '<td>' + syms + '</td>' +
        '</tr>';
      }
      if (inputs.length > 500) {
        html += '<tr><td colspan="5" class="muted">... +' + (inputs.length - 500) + ' more input sections (use filter to narrow)</td></tr>';
      }
      html += '</tbody></table></td></tr>';
    }
  }
  html += '</tbody></table>';
  return html;
}

function renderObjects(q) {
  const rows = DATA.objects
    .filter(o => !q || o.file.toLowerCase().includes(q))
    .slice()
    .sort((a, b) => {
      const av = a[objSort.key], bv = b[objSort.key];
      if (typeof av === 'string') return av.localeCompare(bv) * objSort.dir;
      return (av - bv) * objSort.dir;
    });
  const maxTot = rows.reduce((m, r) => Math.max(m, r.total), 1);
  const arrow = (k) => objSort.key === k ? (objSort.dir < 0 ? ' &#9662;' : ' &#9652;') : '';

  let html = '<table><thead><tr>' +
    '<th class="sortable" data-sort="file">Object / Archive' + arrow('file') + '</th>' +
    '<th class="sortable num" data-sort="text">Code (.text)' + arrow('text') + '</th>' +
    '<th class="sortable num" data-sort="rodata">.rodata' + arrow('rodata') + '</th>' +
    '<th class="sortable num" data-sort="data">.data' + arrow('data') + '</th>' +
    '<th class="sortable num" data-sort="bss">.bss' + arrow('bss') + '</th>' +
    '<th class="sortable num" data-sort="total">Total' + arrow('total') + '</th>' +
    '<th>Share</th>' +
    '</tr></thead><tbody>';

  for (const o of rows) {
    const w = Math.max(2, Math.round((o.total / maxTot) * 120));
    html += '<tr>' +
      '<td class="mono">' + esc(o.file) + '</td>' +
      '<td class="num mono">' + o.text.toLocaleString() + '</td>' +
      '<td class="num mono">' + o.rodata.toLocaleString() + '</td>' +
      '<td class="num mono">' + o.data.toLocaleString() + '</td>' +
      '<td class="num mono">' + o.bss.toLocaleString() + '</td>' +
      '<td class="num mono"><strong>' + fmtBytes(o.total) + '</strong></td>' +
      '<td><span class="mini-bar" style="width:' + w + 'px"></span></td>' +
    '</tr>';
  }
  html += '</tbody></table>';
  return html;
}

function renderSymbols(q) {
  const rows = DATA.symbols.filter(s =>
    !q || s.name.toLowerCase().includes(q) || s.section.toLowerCase().includes(q) || s.file.toLowerCase().includes(q)
  );
  let html = '<div class="muted" style="margin-bottom:6px;">Showing ' + Math.min(rows.length, 2000).toLocaleString() + ' of ' + rows.length.toLocaleString() + ' matching symbols</div>';
  html += '<table><thead><tr><th class="num">Address</th><th>Symbol</th><th>Section</th><th class="num">Section Size</th><th>Object File</th></tr></thead><tbody>';
  for (const s of rows.slice(0, 2000)) {
    html += '<tr>' +
      '<td class="num mono addr">' + hex(s.addr) + '</td>' +
      '<td class="mono"><strong>' + esc(s.name) + '</strong></td>' +
      '<td class="mono sec-name">' + esc(s.section) + '</td>' +
      '<td class="num mono">' + s.size.toLocaleString() + ' B</td>' +
      '<td class="mono muted">' + esc(s.file) + '</td>' +
    '</tr>';
  }
  html += '</tbody></table>';
  return html;
}

function renderDiscarded(q) {
  const rows = DATA.discarded.filter(d => !q || d.name.toLowerCase().includes(q) || d.file.toLowerCase().includes(q));
  let html = '<div class="muted" style="margin-bottom:6px;">Total discarded by linker: <strong>' + fmtBytes(DATA.discardedBytes) + '</strong> across ' + DATA.discarded.length.toLocaleString() + ' input sections</div>';
  html += '<table><thead><tr><th>Section</th><th class="num">Size</th><th>Object File</th></tr></thead><tbody>';
  for (const d of rows.slice(0, 2000)) {
    html += '<tr><td class="mono">' + esc(d.name) + '</td><td class="num mono">' + d.size.toLocaleString() + ' B</td><td class="mono muted">' + esc(d.file) + '</td></tr>';
  }
  html += '</tbody></table>';
  return html;
}

function renderXref(q) {
  let html = '';
  if (DATA.archiveMembers.length) {
    const am = DATA.archiveMembers.filter(a => !q || a.member.toLowerCase().includes(q) || a.referencedBy.toLowerCase().includes(q) || a.symbol.toLowerCase().includes(q));
    html += '<h3>Archive Members Included (' + am.length + ')</h3>';
    html += '<table><thead><tr><th>Archive Member</th><th>Referenced By</th><th>Symbol</th></tr></thead><tbody>';
    for (const a of am.slice(0, 1000)) {
      html += '<tr><td class="mono">' + esc(a.member) + '</td><td class="mono">' + esc(a.referencedBy) + '</td><td class="mono">' + esc(a.symbol) + '</td></tr>';
    }
    html += '</tbody></table>';
  }
  if (DATA.crossRefs.length) {
    const xr = DATA.crossRefs.filter(x => !q || x.symbol.toLowerCase().includes(q) || x.definedIn.toLowerCase().includes(q));
    html += '<h3 style="margin-top:16px;">Cross Reference Table (' + xr.length + ')</h3>';
    html += '<table><thead><tr><th>Symbol</th><th>Defined In</th><th>Referenced In</th></tr></thead><tbody>';
    for (const x of xr.slice(0, 1000)) {
      html += '<tr><td class="mono"><strong>' + esc(x.symbol) + '</strong></td><td class="mono">' + esc(x.definedIn) + '</td><td class="mono muted">' + esc(x.referencedIn.join(', ')) + '</td></tr>';
    }
    html += '</tbody></table>';
  }
  return html;
}

function render() {
  titleEl.textContent = DATA.fileName;
  renderTabs();
  const q = searchEl.value.trim().toLowerCase();
  const hideZero = hideZeroEl.checked;
  if (activeTab === 'overview') contentEl.innerHTML = renderOverview(q, hideZero);
  else if (activeTab === 'objects') contentEl.innerHTML = renderObjects(q);
  else if (activeTab === 'symbols') contentEl.innerHTML = renderSymbols(q);
  else if (activeTab === 'discarded') contentEl.innerHTML = renderDiscarded(q);
  else contentEl.innerHTML = renderXref(q);
}

tabsEl.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-tab]');
  if (!btn) return;
  activeTab = btn.dataset.tab;
  render();
});

contentEl.addEventListener('click', (e) => {
  const secRow = e.target.closest('tr[data-sec]');
  if (secRow) {
    const k = secRow.dataset.sec;
    if (expanded.has(k)) expanded.delete(k);
    else expanded.add(k);
    render();
    return;
  }
  const sortTh = e.target.closest('th[data-sort]');
  if (sortTh) {
    const k = sortTh.dataset.sort;
    if (objSort.key === k) objSort.dir *= -1;
    else { objSort.key = k; objSort.dir = k === 'file' ? 1 : -1; }
    render();
  }
});

searchEl.addEventListener('input', render);
hideZeroEl.addEventListener('change', render);
document.getElementById('openRawBtn').addEventListener('click', () => {
  if (vscode) vscode.postMessage({ type: 'openRaw' });
});

window.addEventListener('message', (e) => {
  const msg = e.data;
  if (msg && msg.type === 'update' && msg.payload) {
    DATA = msg.payload;
    render();
  }
});

render();
</script>
</body>
</html>`;
}
