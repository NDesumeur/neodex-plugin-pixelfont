// PixelFont : dessiner sa police pixel art, lettre par lettre, et l'exporter en vraie police TrueType (.ttf) qu'on installe
// dans Windows, ou en planche PNG + JSON pour un jeu. La police .ttf est fabriquée ici, table par table (glyf, cmap, hmtx…),
// puis chargée par le navigateur lui-même pour l'aperçu : s'il l'accepte, Windows l'acceptera aussi.
const CSS = `
.pfGrid{display:grid;grid-template-columns:260px minmax(0,1fr) 280px;gap:12px}
@media (max-width:1100px){.pfGrid{grid-template-columns:minmax(0,1fr) 280px}.pfGrid>:first-child{grid-column:1/-1;order:3}}
@media (max-width:760px){.pfGrid{grid-template-columns:minmax(0,1fr)}.pfGrid>:first-child{order:3}}
.pfChars{display:grid;grid-template-columns:repeat(auto-fill,minmax(34px,1fr));gap:3px;max-height:520px;overflow:auto}
@media (max-width:1100px){.pfChars{max-height:260px}}
.pfCh{position:relative;padding:2px;background:var(--bg0);border:2px solid var(--line);cursor:var(--cp,pointer);display:flex;flex-direction:column;align-items:center}
.pfCh.on{border-color:var(--magenta)}
.pfCh canvas{image-rendering:pixelated;width:24px;height:30px}
.pfCh span{font:10px monospace;color:var(--muted)}
.pfCh.empty canvas{opacity:.25}
.pfEd{width:100%;max-width:340px;display:block;margin:0 auto;image-rendering:pixelated;background:#0b0816;border:2px solid var(--line);touch-action:none;cursor:crosshair}
.pfRow{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin:6px 0}
.pfRow .btn{width:auto;margin:0;padding:4px 10px}
.pfRow .f{width:auto;flex:1;min-width:0;margin:0}
.pfNum{width:60px!important;flex:none!important}
.pfBig{font:28px monospace;color:#fff;text-align:center;margin:4px 0}
.pfPrev{width:100%;display:block;image-rendering:pixelated;background:#0b0816;border:2px solid var(--line);margin-top:6px}
.pfOk{font-size:12px;margin-top:6px;color:#6ae06a}
.pfOk.bad{color:#ffd34f}
.pfTtf{font-size:26px;line-height:1.4;color:#fff;background:#0b0816;border:2px solid var(--line);padding:8px;margin-top:6px;word-break:break-word;min-height:60px}
`;
const CHARS = [...' !"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~àâäçéèêëîïôöùûüÿœæÀÂÄÇÉÈÊËÎÏÔÖÙÛÜŸŒÆ€«»’…°'];
// ---------- la fabrique de .ttf ----------
function buildTTF(font) {
  const {W, H, desc, spacing, glyphs, name} = font, U = 100, asc = H - desc, em = H * U;
  const order = CHARS.filter(c => c === ' ' || (glyphs[c] && glyphs[c].r.some(Boolean)));
  // glyphe 0 : .notdef, un rectangle creux
  const notdef = {w: Math.max(3, W - 2), r: Array.from({length: H}, (_, y) => y < H - desc - 1 && y > 1 ? (y === 2 || y === H - desc - 2 ? (1 << Math.max(3, W - 2)) - 1 : 1 | 1 << (Math.max(3, W - 2) - 1)) : 0)};
  const list = [notdef, ...order.map(c => glyphs[c] || {w: Math.round(W / 2), r: []})];
  const glyf = [], metrics = []; let maxPts = 0, maxCont = 0, xMin = 0, yMin = 0, xMax = 0, yMax = 0;
  for (const g of list) {
    const rects = []; for (let y = 0; y < H; y++) { const row = g.r[y] || 0; let x = 0; while (x < W) { if (row >> x & 1) { let e = x; while (e + 1 < W && row >> (e + 1) & 1) e++; rects.push([x, y, e + 1]); x = e + 1; } else x++; } }
    const adv = (g.w + spacing) * U;
    if (!rects.length) { glyf.push(new Uint8Array(0)); metrics.push([adv, 0]); continue; }
    const pts = []; for (const [x0, y, x1] of rects) { const top = (asc - y) * U, bot = (asc - y - 1) * U; pts.push([x0 * U, top], [x1 * U, top], [x1 * U, bot], [x0 * U, bot]); }  // sens des aiguilles d'une montre
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]), bb = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
    xMin = Math.min(xMin, bb[0]); yMin = Math.min(yMin, bb[1]); xMax = Math.max(xMax, bb[2]); yMax = Math.max(yMax, bb[3]);
    maxPts = Math.max(maxPts, pts.length); maxCont = Math.max(maxCont, rects.length);
    const b = new B(); b.i16(rects.length); bb.forEach(v => b.i16(v)); rects.forEach((_, i) => b.u16(i * 4 + 3)); b.u16(0); pts.forEach(() => b.u8(1));
    let px = 0; pts.forEach(([x]) => { b.i16(x - px); px = x; }); let py = 0; pts.forEach(([, y]) => { b.i16(y - py); py = y; });
    glyf.push(b.bytes()); metrics.push([adv, bb[0]]);
  }
  const glyfB = new B(), loca = new B(); for (const g of glyf) { loca.u32(glyfB.len); glyfB.raw(g); while (glyfB.len % 4) glyfB.u8(0); } loca.u32(glyfB.len);
  const n = list.length, advMax = Math.max(...metrics.map(m => m[0]));
  const head = new B(); head.u32(0x10000); head.u32(0x10000); head.u32(0); head.u32(0x5f0f3cf5); head.u16(0x000b); head.u16(em); head.u32(0); head.u32(0); head.u32(0); head.u32(0);
  [xMin, yMin, xMax, yMax].forEach(v => head.i16(v)); head.u16(0); head.u16(8); head.i16(2); head.i16(1); head.i16(0);
  const hhea = new B(); hhea.u32(0x10000); hhea.i16(asc * U); hhea.i16(-desc * U); hhea.i16(U); hhea.u16(advMax); hhea.i16(0); hhea.i16(0); hhea.i16(xMax); hhea.i16(1); hhea.i16(0); hhea.i16(0); for (let i = 0; i < 4; i++) hhea.i16(0); hhea.i16(0); hhea.u16(n);
  const maxp = new B(); maxp.u32(0x10000); maxp.u16(n); maxp.u16(maxPts); maxp.u16(maxCont); maxp.u16(0); maxp.u16(0); maxp.u16(2); for (let i = 0; i < 7; i++) maxp.u16(0); maxp.u16(0);
  const hmtx = new B(); metrics.forEach(([a, l]) => { hmtx.u16(a); hmtx.i16(l); });
  const codes = order.map((c, i) => [c.charCodeAt(0), i + 1]).sort((a, b) => a[0] - b[0]);
  const segs = []; for (const [c, gid] of codes) { const s = segs[segs.length - 1]; if (s && c === s[1] + 1 && gid - c === s[2]) s[1] = c; else segs.push([c, c, gid - c]); } segs.push([0xffff, 0xffff, 1]);
  const sc = segs.length, sr = 2 * 2 ** Math.floor(Math.log2(sc)), cm = new B();
  cm.u16(4); cm.u16(16 + sc * 8); cm.u16(0); cm.u16(sc * 2); cm.u16(sr); cm.u16(Math.floor(Math.log2(sc))); cm.u16(sc * 2 - sr);
  segs.forEach(s => cm.u16(s[1])); cm.u16(0); segs.forEach(s => cm.u16(s[0])); segs.forEach(s => cm.u16((s[2] + 65536) % 65536)); segs.forEach(() => cm.u16(0));
  const cmap = new B(); cmap.u16(0); cmap.u16(1); cmap.u16(3); cmap.u16(1); cmap.u32(12); cmap.raw(cm.bytes());
  const ps = (name || 'PixelFont').replace(/[^A-Za-z0-9-]/g, '').slice(0, 60) || 'PixelFont', fam = (name || 'PixelFont').slice(0, 60);
  const names = [[1, fam], [2, 'Regular'], [3, ps + '-Regular-1.0'], [4, fam + ' Regular'], [5, 'Version 1.0'], [6, ps + '-Regular']];
  const nm = new B(), strs = new B(); nm.u16(0); nm.u16(names.length); nm.u16(6 + names.length * 12);
  for (const [id, s] of names) { const off = strs.len; for (const ch of s) strs.u16(ch.charCodeAt(0)); nm.u16(3); nm.u16(1); nm.u16(0x409); nm.u16(id); nm.u16(strs.len - off); nm.u16(off); }
  nm.raw(strs.bytes());
  const os2 = new B(), avg = Math.round(metrics.reduce((a, m) => a + m[0], 0) / n);
  os2.u16(4); os2.i16(avg); os2.u16(400); os2.u16(5); os2.u16(0);
  [em * .6, em * .6, 0, em * .1, em * .6, em * .6, 0, em * .4, U, asc * U * .4].forEach(v => os2.i16(Math.round(v))); os2.i16(0);
  for (let i = 0; i < 10; i++) os2.u8(0); os2.u32(3); os2.u32(0); os2.u32(0); os2.u32(0); for (const ch of 'NDX ') os2.u8(ch.charCodeAt(0));
  os2.u16(0x40); os2.u16(Math.min(...codes.map(c => c[0]))); os2.u16(Math.min(0xffff, Math.max(...codes.map(c => c[0]))));
  os2.i16(asc * U); os2.i16(-desc * U); os2.i16(U); os2.u16(Math.max(yMax, asc * U)); os2.u16(Math.max(-yMin, desc * U)); os2.u32(1); os2.u32(0);
  os2.i16(Math.round(asc * U * .6)); os2.i16(asc * U); os2.u16(0); os2.u16(32); os2.u16(1);
  const post = new B(); post.u32(0x30000); post.u32(0); post.i16(-U); post.i16(U); post.u32(0); post.u32(0); post.u32(0); post.u32(0); post.u32(0);
  const tables = {'OS/2': os2, cmap, glyf: glyfB, head, hhea, hmtx, loca, maxp, name: nm, post};
  const tags = Object.keys(tables).sort(), nt = tags.length, out = new B(), es = Math.floor(Math.log2(nt));
  out.u32(0x10000); out.u16(nt); out.u16(16 * 2 ** es); out.u16(es); out.u16(nt * 16 - 16 * 2 ** es);
  let off = 12 + nt * 16; const bodies = tags.map(t => { const b = tables[t].bytes(); const rec = [t, sum(b), off, b.length]; off += (b.length + 3) & ~3; return [rec, b]; });
  bodies.forEach(([[t, cs, o, l]]) => { for (const ch of t) out.u8(ch.charCodeAt(0)); out.u32(cs); out.u32(o); out.u32(l); });
  let headAt = 0; bodies.forEach(([[t, , o], b]) => { if (t === 'head') headAt = o; out.raw(b); while (out.len % 4) out.u8(0); });
  const font8 = out.bytes(), adj = (0xb1b0afba - sum(font8)) >>> 0; new DataView(font8.buffer).setUint32(headAt + 8, adj);
  return font8;
}
function sum(b) { let s = 0; const n = Math.ceil(b.length / 4) * 4; for (let i = 0; i < n; i += 4) s = (s + ((b[i] || 0) << 24 | (b[i + 1] || 0) << 16 | (b[i + 2] || 0) << 8 | (b[i + 3] || 0))) >>> 0; return s; }
class B { constructor() { this.a = []; } get len() { return this.a.length; } u8(v) { this.a.push(v & 255); } u16(v) { this.u8(v >> 8); this.u8(v); } i16(v) { this.u16(v & 0xffff); } u32(v) { this.u16(v >>> 16); this.u16(v & 0xffff); } raw(b) { for (const x of b) this.a.push(x); } bytes() { return Uint8Array.from(this.a); } }
// une police de départ : on dessine chaque lettre avec une police du système, puis on garde les pixels assez sombres
function rasterize(family, W, H, desc) {
  const c = document.createElement('canvas'); c.width = W * 3; c.height = H; const g = c.getContext('2d', {willReadFrequently: true}), out = {};
  const size = Math.round((H - desc) * 1.1);  // assez petit pour que les accents des majuscules tiennent au-dessus
  for (const ch of CHARS) {
    g.clearRect(0, 0, c.width, H); g.fillStyle = '#000'; g.font = size + 'px ' + family; g.textBaseline = 'alphabetic'; g.fillText(ch, 0, H - desc);
    const d = g.getImageData(0, 0, c.width, H).data, r = Array(H).fill(0); let minX = 99, maxX = -1;
    for (let y = 0; y < H; y++) for (let x = 0; x < W * 3; x++) if (d[(y * c.width + x) * 4 + 3] > 110) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); }
    if (maxX < 0) { out[ch] = {w: Math.max(2, Math.round(W / 2)), r}; continue; }
    const w = Math.min(W, maxX - minX + 1);
    for (let y = 0; y < H; y++) for (let x = 0; x < w; x++) if (d[(y * c.width + x + minX) * 4 + 3] > 110) r[y] |= 1 << x;
    out[ch] = {w, r};
  }
  return out;
}
export default async function (ctx) {
  const view = ctx.view;
  if (!ctx.host) { view.textContent = "Ce plugin doit être approuvé par NeoDex pour s'ouvrir."; return; }
  const { el, toast } = ctx.host;
  ctx.host.addStyle(CSS);
  let data = null; try { data = await ctx.folder.read('pixelfont'); } catch {}
  const font = {name: data?.name || 'Ma police pixel', W: data?.W || 8, H: data?.H || 12, desc: data?.desc ?? 3, spacing: data?.spacing ?? 1, glyphs: data?.glyphs || null};
  if (!font.glyphs) font.glyphs = rasterize('monospace', font.W, font.H, font.desc);
  let curCh = data?.cur && CHARS.includes(data.cur) ? data.cur : 'A', sample = data?.sample || 'Portez ce vieux whisky au juge blond qui fume.\nTHE QUICK BROWN FOX 0123456789 !?', scale = data?.scale || 3;
  let saveT = 0; const save = () => { clearTimeout(saveT); saveT = setTimeout(() => ctx.folder.write('pixelfont', {...font, cur: curCh, sample, scale}).catch(() => {}), 500); };
  const glyph = c => font.glyphs[c] || (font.glyphs[c] = {w: Math.round(font.W / 2), r: Array(font.H).fill(0)});
  // ---------- l'interface ----------
  view.innerHTML = '';
  const wrap = el('div', 'appWrap'), head = el('div', 'agHead'), lay = el('div', 'pfGrid'), colL = el('div', 'sysCard px'), colM = el('div', 'sysCard px'), colR = el('div', 'sysCard px');
  head.append(el('span', 'label', 'PixelFont · police pixel art')); lay.append(colL, colM, colR); wrap.append(head, lay); view.append(wrap);
  const chars = el('div', 'pfChars'); colL.append(el('span', 'label', 'Caractères'), chars);
  const big = el('div', 'pfBig'), ed = el('canvas', 'pfEd'), eg = ed.getContext('2d'), tools = el('div', 'pfRow'), tools2 = el('div', 'pfRow'), wRow = el('div', 'pfRow');
  big.translate = false; ed.id = 'pf_editor';
  colM.append(big, ed, wRow, tools, tools2, el('p', 'hint', 'Clic gauche : dessiner · clic droit : effacer · flèches : changer de lettre.'));
  const prevTxt = el('textarea', 'f'), prev = el('canvas', 'pfPrev'), pg = prev.getContext('2d'), ttfBox = el('div', 'pfTtf'), ok = el('div', 'pfOk');
  prevTxt.rows = 3; prevTxt.value = sample; ok.id = 'pf_ttf'; ttfBox.translate = false; ttfBox.contentEditable = 'true'; ttfBox.spellcheck = false; ttfBox.textContent = 'Écris ici avec ta police !';
  const settings = el('div');
  colR.append(el('span', 'label', 'Police'), settings, el('span', 'label', 'Aperçu'), prevTxt, prev, el('span', 'label', 'La police .ttf'), ttfBox, ok);
  // ---------- l'éditeur ----------
  const CELL = 30;
  function drawEditor() {
    const g = glyph(curCh), W = font.W, H = font.H; ed.width = W * CELL + 1; ed.height = H * CELL + 1;
    eg.fillStyle = '#0b0816'; eg.fillRect(0, 0, ed.width, ed.height);
    eg.fillStyle = '#16122a'; eg.fillRect(0, 0, g.w * CELL, ed.height);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (g.r[y] >> x & 1) { eg.fillStyle = x < g.w ? '#ffffff' : '#7a6a9a'; eg.fillRect(x * CELL + 1, y * CELL + 1, CELL - 1, CELL - 1); }
    eg.fillStyle = '#2a2244'; for (let i = 0; i <= W; i++) eg.fillRect(i * CELL, 0, 1, ed.height); for (let i = 0; i <= H; i++) eg.fillRect(0, i * CELL, ed.width, 1);
    eg.fillStyle = '#ff4fb0'; eg.fillRect(0, (H - font.desc) * CELL - 1, ed.width, 3);
    eg.fillStyle = '#4fc3ff'; eg.fillRect(g.w * CELL - 1, 0, 3, ed.height);
    big.textContent = curCh === ' ' ? '␣' : curCh;
    wRow.replaceChildren(el('span', 'hint', 'Largeur'), btn('◀', () => setW(g.w - 1)), el('b', '', String(g.w)), btn('▶', () => setW(g.w + 1)), btn('Ajuster', () => { let m = 0; g.r.forEach(r => { for (let x = 0; x < font.W; x++) if (r >> x & 1) m = Math.max(m, x + 1); }); setW(m || Math.round(font.W / 2)); }, 'Largeur = dernière colonne dessinée'));
  }
  const btn = (t, f, title) => { const b = el('button', 'btn px', t); b.onclick = f; if (title) b.title = title; return b; };
  function setW(w) { glyph(curCh).w = Math.max(1, Math.min(font.W, w)); changed(); }
  let paint = -1;
  const cellAt = e => { const r = ed.getBoundingClientRect(); return [Math.floor((e.clientX - r.left) / r.width * ed.width / CELL), Math.floor((e.clientY - r.top) / r.height * ed.height / CELL)]; };
  const setPx = ([x, y], v) => { if (x < 0 || y < 0 || x >= font.W || y >= font.H) return; const g = glyph(curCh); const nr = v ? g.r[y] | 1 << x : g.r[y] & ~(1 << x); if (nr !== g.r[y]) { g.r[y] = nr; if (v && x >= g.w) g.w = x + 1; drawEditor(); } };
  ed.oncontextmenu = e => e.preventDefault();
  ed.onpointerdown = e => { pushUndo(); paint = e.button === 2 ? 0 : 1; try { ed.setPointerCapture(e.pointerId); } catch {} setPx(cellAt(e), paint); };
  ed.onpointermove = e => { if (paint >= 0) setPx(cellAt(e), paint); };
  ed.onpointerup = () => { if (paint >= 0) { paint = -1; changed(); } };
  // annuler : on garde les 50 derniers états de la lettre en cours
  const undo = [];
  const pushUndo = () => { undo.push([curCh, JSON.stringify(glyph(curCh))]); if (undo.length > 50) undo.shift(); };
  let clip = null;
  const op = (f, t, title) => btn(t, () => { pushUndo(); const g = glyph(curCh); f(g); changed(); }, title);
  const mask = () => (1 << font.W) - 1;
  tools.append(
    op(g => g.r = g.r.map(() => 0), 'Effacer'), op(g => g.r = g.r.map(r => ~r & ((1 << g.w) - 1)), 'Inverser'),
    op(g => g.r = g.r.map(r => { let o = 0; for (let x = 0; x < g.w; x++) if (r >> x & 1) o |= 1 << (g.w - 1 - x); return o; }), '⇋ Miroir'),
    op(g => g.r = g.r.map(r => r >> 1), '←', 'Décaler à gauche'), op(g => g.r = g.r.map(r => (r << 1) & mask()), '→', 'Décaler à droite'),
    op(g => g.r = [...g.r.slice(1), 0], '↑', 'Décaler vers le haut'), op(g => g.r = [0, ...g.r.slice(0, -1)], '↓', 'Décaler vers le bas'));
  tools2.append(btn('Copier', () => { clip = JSON.parse(JSON.stringify(glyph(curCh))); toast('Lettre copiée'); }), btn('Coller', () => { if (!clip) return; pushUndo(); font.glyphs[curCh] = JSON.parse(JSON.stringify(clip)); changed(); }),
    btn('↶ Annuler', () => { const u = undo.pop(); if (!u) return; font.glyphs[u[0]] = JSON.parse(u[1]); curCh = u[0]; changed(); }));
  // ---------- la liste des caractères ----------
  const thumbs = {};
  function drawChars() {
    chars.replaceChildren(...CHARS.map(c => { const b = el('div', 'pfCh'), cv = el('canvas'), s = el('span', '', c === ' ' ? '␣' : c); s.translate = false; b.title = 'U+' + c.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0'); b.dataset.ch = c; b.onclick = () => { curCh = c; save(); full(); }; b.append(cv, s); thumbs[c] = b; return b; }));
    CHARS.forEach(drawThumb);
  }
  function drawThumb(c) { const b = thumbs[c], cv = b.firstChild, g = font.glyphs[c], x2 = cv.getContext('2d'); cv.width = font.W; cv.height = font.H; x2.clearRect(0, 0, font.W, font.H); x2.fillStyle = '#fff';
    let any = false; if (g) for (let y = 0; y < font.H; y++) for (let x = 0; x < font.W; x++) if (g.r[y] >> x & 1) { x2.fillRect(x, y, 1, 1); any = true; }
    b.classList.toggle('empty', !any && c !== ' '); b.classList.toggle('on', c === curCh); }
  // ---------- les réglages ----------
  function drawSettings() {
    settings.replaceChildren();
    const nm = el('input', 'f'); nm.value = font.name; nm.maxLength = 40; nm.translate = false; nm.oninput = () => { font.name = nm.value; save(); ttfCheck(); };
    const num = (label, key, min, max, title) => { const r = el('div', 'pfRow'), i = el('input', 'f pfNum'); i.type = 'number'; i.min = min; i.max = max; i.value = font[key]; i.dataset.k = key; if (title) i.title = title;
      i.onchange = () => { const v = Math.max(min, Math.min(max, Math.round(+i.value) || min)); i.value = v; resize(key, v); }; r.append(el('span', 'hint', label), i); return r; };
    const r1 = el('div', 'pfRow'); r1.append(el('span', 'hint', 'Nom'), nm);
    const start = el('select', 'f'); start.append(el('option', '', 'Repartir d\'une police…')); for (const [v, t] of [['monospace', 'Chasse fixe'], ['sans-serif', 'Sans empattement'], ['serif', 'Avec empattement']]) { const o = el('option', '', t); o.value = v; start.append(o); }
    start.onchange = async () => { const v = start.value; start.selectedIndex = 0; if (!['monospace', 'sans-serif', 'serif'].includes(v)) return; if (!(await ctx.host.confirm?.('Remplacer toutes les lettres par celles de cette police ?') ?? true)) return; font.glyphs = rasterize(v, font.W, font.H, font.desc); undo.length = 0; changed(true); };
    settings.append(r1, num('Largeur max', 'W', 3, 16, 'Largeur de la grille d\'une lettre'), num('Hauteur', 'H', 5, 16), num('Sous la ligne', 'desc', 0, 6, 'Lignes sous la ligne de base (pour g, p, q, y…)'), num('Espace entre lettres', 'spacing', 0, 4), start);
    const exp = el('div', 'pfRow'); exp.append(btn('Exporter .ttf', exportTTF), btn('Planche PNG + JSON', exportPNG)); settings.append(exp);
  }
  function resize(key, v) {
    pushUndo(); const old = {...font}; font[key] = v;
    if (key === 'H' || key === 'desc') { const dy = (font.H - font.desc) - (old.H - old.desc); for (const g of Object.values(font.glyphs)) { const r = Array(font.H).fill(0); g.r.forEach((row, y) => { const ny = y + dy; if (ny >= 0 && ny < font.H) r[ny] = row; }); g.r = r; } }
    if (key === 'W') for (const g of Object.values(font.glyphs)) { g.r = g.r.map(r => r & ((1 << v) - 1)); g.w = Math.min(g.w, v); }
    changed(true);
  }
  // ---------- l'aperçu en pixels (dessiné directement) et la vraie police .ttf ----------
  function drawPreview() {
    const lines = sample.split('\n'), lh = font.H + 2, wOf = s => [...s].reduce((a, c) => a + (font.glyphs[c]?.w ?? Math.round(font.W / 2)) + font.spacing, 0);
    const pw = Math.max(40, ...lines.map(wOf)) + 4, ph = lines.length * lh + 4, avail = Math.max(1, Math.floor((colR.clientWidth - 30) / pw)), s = Math.max(1, Math.min(scale, avail));
    prev.width = pw * s; prev.height = ph * s; pg.fillStyle = '#0b0816'; pg.fillRect(0, 0, prev.width, prev.height); pg.fillStyle = '#fff';
    lines.forEach((l, li) => { let x = 2; for (const c of l) { const g = font.glyphs[c]; if (g) for (let y = 0; y < font.H; y++) for (let k = 0; k < g.w; k++) if (g.r[y] >> k & 1) pg.fillRect((x + k) * s, (2 + li * lh + y) * s, s, s); x += (g?.w ?? Math.round(font.W / 2)) + font.spacing; } });
  }
  prevTxt.oninput = () => { sample = prevTxt.value; save(); drawPreview(); };
  let ttfN = 0, ttfT = 0, lastFace = null;
  function ttfCheck() { clearTimeout(ttfT); ttfT = setTimeout(async () => {
    const id = ++ttfN; let bytes;
    try { bytes = buildTTF(font); const face = new FontFace('PixelFontApercu' + id, bytes.buffer); await face.load(); if (id !== ttfN) return;
      if (lastFace) document.fonts.delete(lastFace); document.fonts.add(face); lastFace = face;
      ttfBox.style.fontFamily = `'PixelFontApercu${id}', monospace`; ttfBox.style.fontSize = font.H * scale + 'px';
      ok.className = 'pfOk'; ok.replaceChildren(el('span', '', 'Police .ttf valide'), ' (' + Math.round(bytes.length / 1024 * 10) / 10 + ' ko, ', el('span', '', 'lue par le navigateur'), ') ✓'); }
    catch (e) { if (id !== ttfN) return; ok.className = 'pfOk bad'; ok.replaceChildren(el('span', '', 'La police .ttf est refusée :'), ' ' + (e.message || e)); }
  }, 300); }
  const download = (href, name) => { const a = el('a'); a.href = href; a.download = name; document.body.append(a); a.click(); a.remove(); };
  const fname = () => (font.name || 'police').replace(/[^\w-]+/g, '-').replace(/^-|-$/g, '') || 'police';
  function exportTTF() { const b = buildTTF(font); download(URL.createObjectURL(new Blob([b], {type: 'font/ttf'})), fname() + '.ttf'); toast('Double-clique sur le fichier pour l\'installer dans Windows'); }
  function exportPNG() {
    const cols = 16, rows = Math.ceil(CHARS.length / cols), c = document.createElement('canvas'), g = c.getContext('2d'); c.width = cols * font.W; c.height = rows * font.H; g.fillStyle = '#fff';
    const meta = {name: font.name, cellWidth: font.W, cellHeight: font.H, baseline: font.H - font.desc, spacing: font.spacing, columns: cols, chars: {}};
    CHARS.forEach((ch, i) => { const gl = font.glyphs[ch], ox = (i % cols) * font.W, oy = Math.floor(i / cols) * font.H; meta.chars[ch] = {x: ox, y: oy, w: gl?.w ?? Math.round(font.W / 2)}; if (gl) for (let y = 0; y < font.H; y++) for (let x = 0; x < font.W; x++) if (gl.r[y] >> x & 1) g.fillRect(ox + x, oy + y, 1, 1); });
    download(c.toDataURL('image/png'), fname() + '.png'); setTimeout(() => download(URL.createObjectURL(new Blob([JSON.stringify(meta, null, 1)], {type: 'application/json'})), fname() + '.json'), 300);
  }
  // ---------- le clavier ----------
  const onKey = e => { if (!view.isConnected) { document.removeEventListener('keydown', onKey); return; } if (/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName) || document.activeElement?.isContentEditable) return;
    const i = CHARS.indexOf(curCh); if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { curCh = CHARS[(i + (e.key === 'ArrowRight' ? 1 : -1) + CHARS.length) % CHARS.length]; save(); full(); e.preventDefault(); }
    else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { tools2.lastChild.click(); e.preventDefault(); } };
  document.addEventListener('keydown', onKey);
  ctx.onClose?.(() => { document.removeEventListener('keydown', onKey); if (lastFace) document.fonts.delete(lastFace); });
  function changed(all) { save(); if (all) { drawChars(); drawSettings(); } else drawThumb(curCh); drawEditor(); drawPreview(); ttfCheck(); }
  function full() { CHARS.forEach(c => thumbs[c]?.classList.toggle('on', c === curCh)); drawEditor(); thumbs[curCh]?.scrollIntoView?.({block: 'nearest'}); }
  drawChars(); drawSettings(); drawEditor(); drawPreview(); ttfCheck();
}
