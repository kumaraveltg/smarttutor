import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { tryCompile, parsePoints, parseVerticalLine } from './mathParser';
import { drawGraph, equalize, fitView, anyOutside, fmt } from './plotterDraw';
import './FunctionPlotter.css';

/*
  FunctionPlotter: draw graphs for maths questions.
  - equations:  2x^2 - 3x + 1,  sin(x),  1/x,  x = 3 (vertical line)
  - points & shapes:  A(-3, 5), B(5, -2), C(5, 6)  joined and shaded like a textbook figure
  - no external libraries, draws on a <canvas>
  - drag to pan, mouse wheel to zoom, hover to read values, download as PNG

  Props
    initialFunctions  array of strings or { expr, color, visible }     default ['x^2']
    initialShapes     array of { points, mode, fill, labels, color }   default []
    initialView       { xMin, xMax, yMin, yMax }                       default -10..10
    initialDegrees    true = start in degrees instead of radians       default false
    height            canvas height in px                              default 420
    readOnly          hide the editing boxes (for showing a saved graph)
    onChange          called (debounced) with { functions, shapes, view, degrees }
                      so the parent can save the graph with a question
*/

const COLORS = ['#2563eb', '#dc2626', '#16a34a', '#9333ea', '#ea580c', '#0891b2'];
const MAX_FUNCTIONS = 6;
const MAX_SHAPES = 4;
const DEFAULT_VIEW = { xMin: -10, xMax: 10, yMin: -10, yMax: 10 };
const EXAMPLES = ['x^2', 'x^3 - 3x', 'sin(x)', '1/x', 'sqrt(x)', 'x = 3'];
const EXAMPLE_TRIANGLE = 'A(-3, 5), B(5, -2), C(5, 6)';
const MODES = [
  { value: 'polygon', label: 'Closed shape' },
  { value: 'line', label: 'Joined lines' },
  { value: 'points', label: 'Points only' },
];

export default function FunctionPlotter({
  initialFunctions = ['x^2'],
  initialShapes = [],
  initialView = DEFAULT_VIEW,
  initialDegrees = false,
  height = 420,
  readOnly = false,
  onChange,
}) {
  const idRef = useRef(0);
  const newId = () => ++idRef.current;

  const [rows, setRows] = useState(() =>
    initialFunctions.slice(0, MAX_FUNCTIONS).map((f, i) => {
      const o = typeof f === 'string' ? { expr: f } : f;
      return {
        id: newId(),
        text: o.expr || '',
        color: o.color || COLORS[i % COLORS.length],
        visible: o.visible !== false,
      };
    })
  );
  const [shapeRows, setShapeRows] = useState(() =>
    initialShapes.slice(0, MAX_SHAPES).map((s, i) => ({
      id: newId(),
      text: s.points || '',
      mode: s.mode || 'polygon',
      fill: s.fill !== false,
      labels: s.labels !== false,
      color: s.color || COLORS[(i + 3) % COLORS.length],
    }))
  );
  const [degrees, setDegrees] = useState(initialDegrees);
  const [equal, setEqual] = useState(true);
  const [view, setView] = useState(initialView);
  const [size, setSize] = useState({ w: 0 });
  const [cursor, setCursor] = useState(null);

  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const dragRef = useRef(null);
  const viewRef = useRef(view);
  viewRef.current = view;
  const equalRef = useRef(equal);
  equalRef.current = equal;

  const w = size.w;
  const h = height;

  // compile every equation (empty boxes are ignored, not errors)
  const curves = useMemo(
    () =>
      rows.map((r) => {
        if (!r.text.trim()) return { ...r, fn: null, vertical: null, error: null };
        const vertical = parseVerticalLine(r.text);
        if (vertical !== null) return { ...r, fn: null, vertical, error: null };
        const { fn, error } = tryCompile(r.text, { degrees });
        return { ...r, fn, vertical: null, error };
      }),
    [rows, degrees]
  );

  // read the points of every shape
  const shapes = useMemo(
    () => shapeRows.map((s) => ({ ...s, ...parsePoints(s.text) })),
    [shapeRows]
  );
  const allPoints = useMemo(() => shapes.flatMap((s) => s.points), [shapes]);
  const pointsKey = allPoints.map((p) => `${p.x},${p.y}`).join('|');

  // follow the width of the container
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return undefined;
    const update = () => setSize({ w: Math.max(200, Math.floor(el.clientWidth)) });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // keep axes equal when the size changes or the lock is switched on
  useEffect(() => {
    if (equal && w) setView((v) => equalize(v, w, h));
  }, [equal, w, h]);

  // when typed points fall outside the picture, zoom to show them
  useEffect(() => {
    if (!w || !allPoints.length) return;
    if (anyOutside(allPoints, viewRef.current)) {
      setView(fitView(allPoints, w, h, equalRef.current));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pointsKey, w, h]);

  // draw
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !w) return;
    const dpr = window.devicePixelRatio || 1;
    const bw = Math.round(w * dpr);
    const bh = Math.round(h * dpr);
    if (canvas.width !== bw || canvas.height !== bh) {
      canvas.width = bw;
      canvas.height = bh;
    }
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawGraph(ctx, w, h, view, curves, shapes, cursor ? cursor.x : null);
  }, [w, h, view, curves, shapes, cursor]);

  // tell the parent what to save (debounced, skipped on first render).
  // onChange is kept in a ref so an inline arrow from the parent cannot retrigger this effect.
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) { firstRun.current = false; return undefined; }
    const t = setTimeout(() => {
      if (!onChangeRef.current) return;
      onChangeRef.current({
        functions: rows
          .filter((r) => r.text.trim())
          .map((r) => ({ expr: r.text, color: r.color, visible: r.visible })),
        shapes: shapeRows
          .filter((s) => s.text.trim())
          .map((s) => ({ points: s.text, mode: s.mode, fill: s.fill, labels: s.labels, color: s.color })),
        view,
        degrees,
      });
    }, 400);
    return () => clearTimeout(t);
  }, [rows, shapeRows, view, degrees]);

  /* ----- zoom ----- */

  const zoomAt = useCallback((factor, fx, fy) => {
    // fx, fy = anchor as a fraction of the canvas (fy measured from the bottom)
    setView((v) => {
      const xr = v.xMax - v.xMin;
      const yr = v.yMax - v.yMin;
      const ax = v.xMin + fx * xr;
      const ay = v.yMin + fy * yr;
      const nxr = xr / factor;
      const nyr = yr / factor;
      return {
        xMin: ax - fx * nxr,
        xMax: ax + (1 - fx) * nxr,
        yMin: ay - fy * nyr,
        yMax: ay + (1 - fy) * nyr,
      };
    });
  }, []);

  // wheel needs a non-passive listener so the page does not scroll while zooming
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const onWheel = (e) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const fx = (e.clientX - rect.left) / rect.width;
      const fy = 1 - (e.clientY - rect.top) / rect.height;
      zoomAt(Math.exp(-e.deltaY * 0.0015), fx, fy);
    };
    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', onWheel);
  }, [zoomAt]);

  /* ----- pan + hover ----- */

  const onPointerDown = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { x: e.clientX, y: e.clientY, view: viewRef.current };
  };

  const onPointerMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const d = dragRef.current;
    if (d) {
      const xr = d.view.xMax - d.view.xMin;
      const yr = d.view.yMax - d.view.yMin;
      const dx = ((e.clientX - d.x) / rect.width) * xr;
      const dy = ((e.clientY - d.y) / rect.height) * yr;
      setView({
        xMin: d.view.xMin - dx,
        xMax: d.view.xMax - dx,
        yMin: d.view.yMin + dy,
        yMax: d.view.yMax + dy,
      });
      return;
    }
    const v = viewRef.current;
    setCursor({
      x: v.xMin + (mx / rect.width) * (v.xMax - v.xMin),
      y: v.yMax - (my / rect.height) * (v.yMax - v.yMin),
    });
  };

  const endDrag = () => { dragRef.current = null; };

  /* ----- equation rows ----- */

  const updateRow = (id, patch) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const removeRow = (id) => setRows((rs) => rs.filter((r) => r.id !== id));

  const nextColor = () => {
    const used = new Set([...rows, ...shapeRows].map((r) => r.color));
    return COLORS.find((c) => !used.has(c)) || COLORS[(rows.length + shapeRows.length) % COLORS.length];
  };

  const addRow = (text = '') =>
    setRows((rs) => (rs.length >= MAX_FUNCTIONS ? rs : [...rs, { id: newId(), text, color: nextColor(), visible: true }]));

  const addExample = (text) => {
    const empty = rows.find((r) => !r.text.trim());
    if (empty) updateRow(empty.id, { text });
    else addRow(text);
  };

  /* ----- shape rows ----- */

  const updateShape = (id, patch) =>
    setShapeRows((ss) => ss.map((s) => (s.id === id ? { ...s, ...patch } : s)));

  const removeShape = (id) => setShapeRows((ss) => ss.filter((s) => s.id !== id));

  const addShape = (text = '') =>
    setShapeRows((ss) =>
      ss.length >= MAX_SHAPES
        ? ss
        : [...ss, { id: newId(), text, mode: 'polygon', fill: true, labels: true, color: nextColor() }]
    );

  /* ----- view actions ----- */

  const setRange = (key, value) => {
    const v = { ...viewRef.current, [key]: value };
    if (v.xMin >= v.xMax || v.yMin >= v.yMax) return; // ignore impossible ranges
    if (key === 'xMin' || key === 'xMax') {
      setView(equalRef.current && w ? equalize(v, w, h) : v);
    } else {
      setEqual(false); // editing y by hand means the user wants a custom ratio
      setView(v);
    }
  };

  const resetView = () => setView(equal && w ? equalize(initialView, w, h) : initialView);
  const fitToPoints = () => { if (w && allPoints.length) setView(fitView(allPoints, w, h, equal)); };

  const downloadPng = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'graph.png';
      a.click();
      URL.revokeObjectURL(url);
    }, 'image/png');
  };

  const readout = cursor
    ? curves.filter((c) => c.fn && c.visible).map((c) => ({ id: c.id, color: c.color, y: c.fn(cursor.x) }))
    : [];

  return (
    <div className="fp-root">
      {!readOnly && (
        <div className="fp-functions">
          {curves.map((c) => (
            <div className="fp-row" key={c.id}>
              <input
                type="checkbox"
                className="fp-check"
                checked={c.visible}
                onChange={(e) => updateRow(c.id, { visible: e.target.checked })}
                style={{ accentColor: c.color }}
                title="Show / hide this graph"
                aria-label="Show or hide this graph"
              />
              <span className="fp-swatch" style={{ background: c.color }} />
              <input
                type="text"
                className={`fp-input${c.error ? ' fp-invalid' : ''}`}
                value={c.text}
                placeholder="e.g. y = 2x^2 - 3x + 1   or   x = 3"
                spellCheck={false}
                onChange={(e) => updateRow(c.id, { text: e.target.value })}
                aria-label="Equation"
              />
              <button
                type="button"
                className="fp-icon-btn"
                onClick={() => removeRow(c.id)}
                title="Remove"
                aria-label="Remove this equation"
              >
                ×
              </button>
              {c.error && <div className="fp-error">{c.error}</div>}
            </div>
          ))}

          {shapes.map((s) => (
            <div className="fp-shape" key={s.id}>
              <div className="fp-row">
                <span className="fp-swatch fp-square" style={{ background: s.color }} />
                <input
                  type="text"
                  className={`fp-input${s.error ? ' fp-invalid' : ''}`}
                  value={s.text}
                  placeholder="Points, e.g. A(-3, 5), B(5, -2), C(5, 6)"
                  spellCheck={false}
                  onChange={(e) => updateShape(s.id, { text: e.target.value })}
                  aria-label="Points"
                />
                <button
                  type="button"
                  className="fp-icon-btn"
                  onClick={() => removeShape(s.id)}
                  title="Remove"
                  aria-label="Remove these points"
                >
                  ×
                </button>
                {s.error && <div className="fp-error">{s.error}</div>}
              </div>
              <div className="fp-shape-opts">
                <select
                  value={s.mode}
                  onChange={(e) => updateShape(s.id, { mode: e.target.value })}
                  aria-label="How to join the points"
                >
                  {MODES.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
                {s.mode === 'polygon' && (
                  <label className="fp-toggle">
                    <input type="checkbox" checked={s.fill} onChange={(e) => updateShape(s.id, { fill: e.target.checked })} />
                    Shade inside
                  </label>
                )}
                <label className="fp-toggle">
                  <input type="checkbox" checked={s.labels} onChange={(e) => updateShape(s.id, { labels: e.target.checked })} />
                  Show names and coordinates
                </label>
              </div>
            </div>
          ))}

          <div className="fp-toolbar">
            <button type="button" className="fp-btn" onClick={() => addRow()} disabled={rows.length >= MAX_FUNCTIONS}>
              + Add equation
            </button>
            <button type="button" className="fp-btn" onClick={() => addShape()} disabled={shapeRows.length >= MAX_SHAPES}>
              + Add points / shape
            </button>
            <div className="fp-segment" role="group" aria-label="Angle unit">
              <button type="button" className={!degrees ? 'fp-on' : ''} onClick={() => setDegrees(false)}>Radians</button>
              <button type="button" className={degrees ? 'fp-on' : ''} onClick={() => setDegrees(true)}>Degrees</button>
            </div>
            <label className="fp-toggle">
              <input type="checkbox" checked={equal} onChange={(e) => setEqual(e.target.checked)} />
              Equal axes
            </label>
          </div>

          <div className="fp-examples">
            <span>Try:</span>
            {EXAMPLES.map((ex) => (
              <button type="button" key={ex} className="fp-chip" onClick={() => addExample(ex)}>
                {ex}
              </button>
            ))}
            <button type="button" className="fp-chip" onClick={() => addShape(EXAMPLE_TRIANGLE)} disabled={shapeRows.length >= MAX_SHAPES}>
              triangle ABC
            </button>
          </div>
        </div>
      )}

      <div className="fp-canvas-wrap" ref={wrapRef}>
        <canvas
          ref={canvasRef}
          className="fp-canvas"
          style={{ width: '100%', height: `${h}px` }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onPointerLeave={() => { endDrag(); setCursor(null); }}
        />
        <div className="fp-zoom">
          <button type="button" onClick={() => zoomAt(1.4, 0.5, 0.5)} aria-label="Zoom in">+</button>
          <button type="button" onClick={() => zoomAt(1 / 1.4, 0.5, 0.5)} aria-label="Zoom out">−</button>
          <button type="button" onClick={resetView} aria-label="Reset view" title="Reset view">⟲</button>
          {allPoints.length > 0 && (
            <button type="button" onClick={fitToPoints} aria-label="Fit to points" title="Fit to points">⤢</button>
          )}
        </div>
      </div>

      <div className="fp-readout">
        {cursor ? (
          <>
            <span>x = {fmt(cursor.x)}</span>
            {readout.map((r) => (
              <span key={r.id} style={{ color: r.color }}>y = {fmt(r.y)}</span>
            ))}
          </>
        ) : (
          <span className="fp-hint">Drag to move · scroll to zoom · hover to read values</span>
        )}
      </div>

      {!readOnly && (
        <div className="fp-ranges">
          <NumberField label="x min" value={view.xMin} onCommit={(n) => setRange('xMin', n)} />
          <NumberField label="x max" value={view.xMax} onCommit={(n) => setRange('xMax', n)} />
          <NumberField label="y min" value={view.yMin} onCommit={(n) => setRange('yMin', n)} />
          <NumberField label="y max" value={view.yMax} onCommit={(n) => setRange('yMax', n)} />
          <button type="button" className="fp-btn" onClick={downloadPng}>Download PNG</button>
        </div>
      )}
    </div>
  );
}

/* small number box that only commits on Enter / blur */
function NumberField({ label, value, onCommit }) {
  const [text, setText] = useState(fmt(value));
  const editing = useRef(false);

  useEffect(() => {
    if (!editing.current) setText(fmt(value));
  }, [value]);

  const commit = () => {
    editing.current = false;
    const n = parseFloat(text);
    if (Number.isFinite(n)) onCommit(n);
    else setText(fmt(value));
  };

  return (
    <label className="fp-field">
      <span>{label}</span>
      <input
        type="text"
        inputMode="decimal"
        value={text}
        onFocus={() => { editing.current = true; }}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
      />
    </label>
  );
}
