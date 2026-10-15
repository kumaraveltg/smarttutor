// Run with:  node plotterDraw.test.mjs
// Draws onto a fake canvas that records every call, so no browser is needed.
import { drawGraph, fitView, anyOutside, equalize } from './plotterDraw.js';
import { parsePoints, compileExpression } from './mathParser.js';

let failed = 0;
const ok = (cond, msg) => { if (!cond) failed++; console.log(`${cond ? 'ok  ' : 'FAIL'}  ${msg}`); };

function fakeCtx() {
  const log = { arcs: 0, texts: [], fills: 0, closes: 0, lines: 0, moves: 0, alphaFills: 0 };
  let alpha = 1;
  const ctx = new Proxy({}, {
    get(target, prop) {
      if (prop === 'log') return log;
      if (prop === 'globalAlpha') return alpha;
      if (prop === 'arc') return () => { log.arcs++; };
      if (prop === 'fillText' || prop === 'strokeText') return (t) => { if (prop === 'fillText') log.texts.push(t); };
      if (prop === 'fill') return () => { log.fills++; if (alpha < 1) log.alphaFills++; };
      if (prop === 'closePath') return () => { log.closes++; };
      if (prop === 'lineTo') return () => { log.lines++; };
      if (prop === 'moveTo') return () => { log.moves++; };
      return () => {};
    },
    set(target, prop, value) { if (prop === 'globalAlpha') alpha = value; return true; },
  });
  return ctx;
}

const W = 800;
const H = 420;
const tri = parsePoints('A(-3,5), B(5,-2), C(5,6)').points;
const shape = { points: tri, mode: 'polygon', fill: true, labels: true, color: '#ea580c' };

// 1. the textbook triangle
{
  const view = fitView(tri, W, H, true);
  ok(!anyOutside(tri, view), 'fitView shows all three vertices');
  ok(view.xMin <= 0 && view.xMax >= 0 && view.yMin <= 0 && view.yMax >= 0, 'fitView keeps the origin in sight');
  const xr = view.xMax - view.xMin;
  const yr = view.yMax - view.yMin;
  ok(Math.abs(xr / W - yr / H) < 1e-9, 'equal axes: same units per pixel on both axes');

  const ctx = fakeCtx();
  drawGraph(ctx, W, H, view, [], [shape], null);
  ok(ctx.log.arcs === 3, `three vertex dots drawn (${ctx.log.arcs})`);
  ok(ctx.log.closes === 1, 'triangle outline is closed');
  ok(ctx.log.alphaFills === 1, 'triangle is filled with transparency');
  for (const label of ['A(-3, 5)', 'B(5, -2)', 'C(5, 6)']) ok(ctx.log.texts.includes(label), `label "${label}" drawn`);
  ok(ctx.log.texts.includes('X') && ctx.log.texts.includes('Y'), 'X and Y axis letters drawn');
}

// 2. modes and options
{
  const run = (s) => { const c = fakeCtx(); drawGraph(c, W, H, { xMin: -10, xMax: 10, yMin: -10, yMax: 10 }, [], [s], null); return c.log; };
  const noFill = run({ ...shape, fill: false });
  ok(noFill.alphaFills === 0 && noFill.closes === 1, 'polygon without fill: outline only');
  const line = run({ ...shape, mode: 'line' });
  ok(line.closes === 0 && line.alphaFills === 0, 'line mode: open, not closed or filled');
  const pts = run({ ...shape, mode: 'points', labels: false });
  const baseLines = (() => { const c = fakeCtx(); drawGraph(c, W, H, { xMin: -10, xMax: 10, yMin: -10, yMax: 10 }, [], [], null); return c.log.lines; })();
  ok(pts.arcs === 3 && pts.lines === baseLines && !pts.texts.some((t) => t.startsWith('A(')), 'points mode: only dots, no joining lines, no labels');
  const two = run({ ...shape, points: tri.slice(0, 2) });
  ok(two.closes === 0, 'polygon with only 2 points is not closed');
  const one = run({ ...shape, points: tri.slice(0, 1) });
  ok(one.arcs === 1 && one.texts.includes('A(-3, 5)'), 'single point: dot and label');
}

// 3. curves and vertical lines together with shapes
{
  const ctx = fakeCtx();
  const curves = [
    { fn: compileExpression('x^2'), color: '#2563eb', visible: true },
    { fn: null, vertical: 3, color: '#dc2626', visible: true },
    { fn: compileExpression('1/x'), color: '#16a34a', visible: false },
  ];
  let threw = false;
  try { drawGraph(ctx, W, H, { xMin: -10, xMax: 10, yMin: -10, yMax: 10 }, curves, [shape], 1.5); } catch (e) { threw = true; console.log(e); }
  ok(!threw, 'curves + vertical line + shape + hover dot draw without errors');
  ok(ctx.log.arcs === 3 + 1, `3 vertices + 1 hover dot (${ctx.log.arcs})`);
}

// 4. view helpers
{
  const v = equalize({ xMin: -10, xMax: 10, yMin: -3, yMax: 3 }, W, H);
  ok(Math.abs((v.xMax - v.xMin) / W - (v.yMax - v.yMin) / H) < 1e-9, 'equalize gives equal scale');
  const far = fitView([{ x: 100, y: -40 }], W, H, false);
  ok(far.xMax > 100 && far.yMin < -40, 'fitView grows to reach a far point');
  ok(anyOutside([{ x: 50, y: 0 }], { xMin: -10, xMax: 10, yMin: -10, yMax: 10 }), 'anyOutside spots a point beyond the view');
}

console.log(failed ? `\n${failed} FAILED` : '\nAll passed');
process.exit(failed ? 1 : 0);
