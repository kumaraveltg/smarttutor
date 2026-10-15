// Drawing helpers for FunctionPlotter. Plain JS (no React) so they can be tested on their own.

export function niceStep(raw) {
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  const f = raw / pow;
  const nice = f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10;
  return nice * pow;
}

export function fmt(v) {
  if (!Number.isFinite(v)) return 'undefined';
  if (v !== 0 && (Math.abs(v) >= 1e6 || Math.abs(v) < 1e-4)) return v.toExponential(2);
  return String(parseFloat(v.toPrecision(5)));
}

// keep the same scale on both axes so circles look like circles
export function equalize(view, w, h) {
  const xr = view.xMax - view.xMin;
  const yr = (xr * h) / w;
  const cy = (view.yMin + view.yMax) / 2;
  return { ...view, yMin: cy - yr / 2, yMax: cy + yr / 2 };
}

// a view that shows every point (and the origin) with some room around them
export function fitView(points, w, h, equal) {
  const xs = [0];
  const ys = [0];
  points.forEach((p) => { xs.push(p.x); ys.push(p.y); });
  let xMin = Math.min(...xs);
  let xMax = Math.max(...xs);
  let yMin = Math.min(...ys);
  let yMax = Math.max(...ys);
  const padX = Math.max(xMax - xMin, 2) * 0.18;
  const padY = Math.max(yMax - yMin, 2) * 0.18;
  xMin -= padX; xMax += padX; yMin -= padY; yMax += padY;
  if (equal) {
    const cx = (xMin + xMax) / 2;
    const cy = (yMin + yMax) / 2;
    const nxr = Math.max(xMax - xMin, ((yMax - yMin) * w) / h);
    const nyr = (nxr * h) / w;
    return { xMin: cx - nxr / 2, xMax: cx + nxr / 2, yMin: cy - nyr / 2, yMax: cy + nyr / 2 };
  }
  return { xMin, xMax, yMin, yMax };
}

export function anyOutside(points, view) {
  return points.some((p) => p.x < view.xMin || p.x > view.xMax || p.y < view.yMin || p.y > view.yMax);
}

/*
  curves: [{ fn, vertical, color, visible }]       fn = f(x) or null, vertical = x value or null/undefined
  shapes: [{ points:[{name,x,y}], mode, fill, labels, color }]   mode = 'points' | 'line' | 'polygon'
*/
export function drawGraph(ctx, w, h, view, curves, shapes, cursorX) {
  const xr = view.xMax - view.xMin;
  const yr = view.yMax - view.yMin;
  const sx = w / xr;
  const sy = h / yr;
  const toPx = (x) => (x - view.xMin) * sx;
  const toPy = (y) => h - (y - view.yMin) * sy;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);

  // grid lines (minor, then major)
  const step = niceStep(xr / Math.max(2, w / 90));
  const stepY = niceStep(yr / Math.max(2, h / 70));
  const drawLines = (stepX, stepYY, color) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let k = Math.ceil(view.xMin / stepX); k <= Math.floor(view.xMax / stepX); k++) {
      const px = Math.round(toPx(k * stepX)) + 0.5;
      ctx.moveTo(px, 0);
      ctx.lineTo(px, h);
    }
    for (let k = Math.ceil(view.yMin / stepYY); k <= Math.floor(view.yMax / stepYY); k++) {
      const py = Math.round(toPy(k * stepYY)) + 0.5;
      ctx.moveTo(0, py);
      ctx.lineTo(w, py);
    }
    ctx.stroke();
  };
  if ((step * sx) / 5 >= 8 && (stepY * sy) / 5 >= 8) drawLines(step / 5, stepY / 5, '#f1f5f9');
  drawLines(step, stepY, '#dbe2ea');

  // axes
  const axisX = Math.min(Math.max(toPx(0), 0), w);
  const axisY = Math.min(Math.max(toPy(0), 0), h);
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, axisY);
  ctx.lineTo(w, axisY);
  ctx.moveTo(axisX, 0);
  ctx.lineTo(axisX, h);
  ctx.stroke();

  // axis numbers
  ctx.fillStyle = '#475569';
  ctx.font = '12px system-ui, sans-serif';
  ctx.textAlign = 'center';
  const labelBelow = axisY < h - 20;
  for (let k = Math.ceil(view.xMin / step); k <= Math.floor(view.xMax / step); k++) {
    if (k === 0) continue;
    const v = Number((k * step).toPrecision(12));
    if (toPx(v) < 14 || toPx(v) > w - 14) continue; // would be cut off at the edge
    ctx.textBaseline = labelBelow ? 'top' : 'bottom';
    ctx.fillText(fmt(v), toPx(v), labelBelow ? axisY + 4 : axisY - 4);
  }
  const labelLeft = axisX > 44;
  ctx.textAlign = labelLeft ? 'right' : 'left';
  ctx.textBaseline = 'middle';
  for (let k = Math.ceil(view.yMin / stepY); k <= Math.floor(view.yMax / stepY); k++) {
    if (k === 0) continue;
    const v = Number((k * stepY).toPrecision(12));
    if (toPy(v) < 8 || toPy(v) > h - 8) continue;
    ctx.fillText(fmt(v), labelLeft ? axisX - 6 : axisX + 6, toPy(v));
  }
  if (view.xMin <= 0 && view.xMax >= 0 && view.yMin <= 0 && view.yMax >= 0) {
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.fillText('0', axisX - 5, axisY + 4);
  }

  // X and Y letters at the ends of the axes, like the textbook
  ctx.font = 'italic 600 13px system-ui, sans-serif';
  ctx.fillStyle = '#334155';
  ctx.textAlign = 'right';
  ctx.textBaseline = axisY > 22 ? 'bottom' : 'top';
  ctx.fillText('X', w - 6, axisY > 22 ? axisY - 5 : axisY + 5);
  ctx.textAlign = axisX < w - 24 ? 'left' : 'right';
  ctx.textBaseline = 'top';
  ctx.fillText('Y', axisX < w - 24 ? axisX + 6 : axisX - 6, 4);

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, w, h);
  ctx.clip();

  // shapes: filled polygon, joined lines, points, labels
  for (const s of shapes || []) {
    if (!s.points || !s.points.length) continue;
    const P = s.points.map((p) => ({ ...p, px: toPx(p.x), py: toPy(p.y) }));
    const closed = s.mode === 'polygon' && P.length >= 3;

    if (s.mode !== 'points' && P.length >= 2) {
      ctx.beginPath();
      P.forEach((p, i) => (i ? ctx.lineTo(p.px, p.py) : ctx.moveTo(p.px, p.py)));
      if (closed) ctx.closePath();
      if (closed && s.fill) {
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = s.color;
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      ctx.strokeStyle = s.color;
      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';
      ctx.stroke();
    }

    ctx.fillStyle = s.color;
    for (const p of P) {
      ctx.beginPath();
      ctx.arc(p.px, p.py, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    if (s.labels) {
      const cx = P.reduce((a, p) => a + p.px, 0) / P.length;
      const cy = P.reduce((a, p) => a + p.py, 0) / P.length;
      ctx.font = '600 13px system-ui, sans-serif';
      ctx.lineJoin = 'round';
      for (const p of P) {
        let dx = p.px - cx;
        let dy = p.py - cy;
        let len = Math.hypot(dx, dy);
        if (len < 1) { dx = 1; dy = -1; len = Math.SQRT2; } // single point: label up and to the right
        ctx.textAlign = dx > 0.3 * len ? 'left' : dx < -0.3 * len ? 'right' : 'center';
        ctx.textBaseline = dy > 0.3 * len ? 'top' : dy < -0.3 * len ? 'bottom' : 'middle';
        const text = `${p.name}(${fmt(p.x)}, ${fmt(p.y)})`;
        const lx = p.px + (dx / len) * 9;
        const ly = p.py + (dy / len) * 9;
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#ffffff';
        ctx.strokeText(text, lx, ly);
        ctx.fillStyle = '#0f172a';
        ctx.fillText(text, lx, ly);
      }
    }
  }

  // curves and vertical lines
  ctx.lineWidth = 2.25;
  ctx.lineJoin = 'round';
  const samples = Math.max(2, Math.ceil(w * 2));
  for (const c of curves) {
    if (!c.visible) continue;
    ctx.strokeStyle = c.color;

    if (c.vertical != null) {
      const px = toPx(c.vertical);
      ctx.beginPath();
      ctx.moveTo(px, 0);
      ctx.lineTo(px, h);
      ctx.stroke();
      continue;
    }
    if (!c.fn) continue;

    ctx.beginPath();
    let pen = false;
    let prevPy = 0;
    for (let i = 0; i <= samples; i++) {
      const x = view.xMin + (i / samples) * xr;
      const y = c.fn(x);
      if (!Number.isFinite(y)) { pen = false; continue; }
      const py = Math.max(-1e6, Math.min(1e6, toPy(y)));
      const px = (i / samples) * w;
      if (!pen || Math.abs(py - prevPy) > h * 2) { // gap or asymptote: lift the pen
        ctx.moveTo(px, py);
        pen = true;
      } else {
        ctx.lineTo(px, py);
      }
      prevPy = py;
    }
    ctx.stroke();
  }

  // dots on the curves under the cursor
  if (cursorX != null) {
    for (const c of curves) {
      if (!c.fn || !c.visible) continue;
      const y = c.fn(cursorX);
      if (!Number.isFinite(y)) continue;
      const py = toPy(y);
      if (py < -10 || py > h + 10) continue;
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = c.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(toPx(cursorX), py, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }
  ctx.restore();
}
