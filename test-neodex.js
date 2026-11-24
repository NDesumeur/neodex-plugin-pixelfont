// lancé par le test « local » de NeoDex : la police .ttf acceptée par Chromium, une lettre effacée puis redessinée, la hauteur changée
module.exports = async ({ pj, sleep }) => {
  const ttf = () => pj(`document.getElementById('pf_ttf').textContent`);
  const waitOk = async what => { for (let i = 0; i < 30; i++) { await sleep(200); if (/valide/.test(await ttf())) return; } throw new Error(what + ' : ' + await ttf()); };
  await waitOk('police de départ');
  await pj(`document.querySelector('[data-ch="A"]').click(), 0`);
  await pj(`[...document.querySelectorAll('button')].find(b => b.textContent === 'Effacer').click(), 0`); await sleep(100);
  if (!await pj(`document.querySelector('[data-ch="A"]').classList.contains('empty')`)) throw new Error('A pas effacé');
  await pj(`(() => { const c = document.getElementById('pf_editor'), r = c.getBoundingClientRect(), k = r.width / c.width, o = (x, y) => ({clientX: r.left + (x * 30 + 15) * k, clientY: r.top + (y * 30 + 15) * k, button: 0, bubbles: true, pointerId: 1});
    c.dispatchEvent(new PointerEvent('pointerdown', o(1, 2))); for (let y = 3; y < 9; y++) c.dispatchEvent(new PointerEvent('pointermove', o(1, y))); c.dispatchEvent(new PointerEvent('pointerup', o(1, 8))); })(), 0`); await sleep(100);
  if (await pj(`document.querySelector('[data-ch="A"]').classList.contains('empty')`)) throw new Error('A pas redessiné');
  await waitOk('après le dessin');
  await pj(`(() => { const i = document.querySelector('[data-k=H]'); i.value = 10; i.dispatchEvent(new Event('change')); })(), 0`); await sleep(100);
  await waitOk('hauteur 10');
  const fam = await pj(`getComputedStyle(document.querySelector('.pfTtf')).fontFamily`);
  if (!/PixelFontApercu/.test(fam)) throw new Error('aperçu .ttf : ' + fam);
  await pj(`document.querySelector('[data-ch="g"]').click(), document.querySelector('.pfBig').scrollIntoView({block: 'start'}), 0`); await sleep(300);
  // le crénage : la paire AV rapprochée de 2 pixels dans la police .ttf, mesurée par le navigateur ; le WOFF est lu aussi
  const kw = await pj(`(async () => { try {
    const P = document.querySelector('.pfGrid').closest('.appWrap').parentNode.__pf, F = P.font, load = async (b, n) => { const f = new FontFace(n, b.buffer); await f.load(); document.fonts.add(f); return f; };
    const w = (fam, t) => { const c = document.createElement('canvas').getContext('2d'); c.font = '120px ' + fam; return c.measureText(t).width; };
    F.kern = {}; await load(P.buildTTF(F), 'KernA'); F.kern = {AV: -2}; await load(P.buildTTF(F), 'KernB');
    const a = w('KernA', 'AV'), b = w('KernB', 'AV'), em = F.H; const px = 120 / em;
    if (!(a - b > px * 1.5 && a - b < px * 2.5)) return {err: 'crénage mesuré : ' + a + ' → ' + b + ' (1 px = ' + px + ')'};
    const wf = await P.buildWOFF(P.buildTTF(F)); if (String.fromCharCode(...wf.slice(0, 4)) !== 'wOFF') return {err: 'en-tête woff'};
    await load(wf, 'KernW'); const c = w('KernW', 'AV'); if (Math.abs(c - b) > .5) return {err: 'woff : ' + c + ' au lieu de ' + b};
    P.changed(true); return {d: Math.round((a - b) / px * 10) / 10, woff: wf.length, ttf: P.buildTTF(F).length};
  } catch (e) { return {err: e.message}; } })()`);
  if (kw.err) throw new Error(kw.err);
  return 'crénage AV ' + kw.d + ' px mesuré, woff ' + kw.woff + ' o (ttf ' + kw.ttf + ' o) · ttf acceptée, lettre redessinée, hauteur changée ok';
};
