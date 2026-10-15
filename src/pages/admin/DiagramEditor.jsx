import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

const W = 640
const H = 400
const INK = '#1e293b'
const FONT = 'Arial, sans-serif'
const LETTERS = 'ABCDEFGH'

// ---- small geometry helpers -------------------------------------------------
const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y })
const add = (a, b, k = 1) => ({ x: a.x + b.x * k, y: a.y + b.y * k })
const len = (a) => Math.hypot(a.x, a.y)
const unit = (a) => {
  const l = len(a) || 1
  return { x: a.x / l, y: a.y / l }
}
const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })
const centroid = (pts) => ({
  x: pts.reduce((s, p) => s + p.x, 0) / pts.length,
  y: pts.reduce((s, p) => s + p.y, 0) / pts.length,
})

// angle at corner i of a polygon
function corner(pts, i) {
  const n = pts.length
  const v = pts[i]
  const a = pts[(i + n - 1) % n]
  const b = pts[(i + 1) % n]
  const u1 = unit(sub(a, v))
  const u2 = unit(sub(b, v))
  const dot = Math.max(-1, Math.min(1, u1.x * u2.x + u1.y * u2.y))
  return {
    v, a, b, u1, u2,
    deg: (Math.acos(dot) * 180) / Math.PI,
    cross: u1.x * u2.y - u1.y * u2.x,
  }
}

// ---- shape templates (points as fractions of a w x h box) -------------------
const T = {
  triangle: { name: 'Triangle', w: 150, h: 120, f: [[0.5, 0], [1, 1], [0, 1]] },
  equilateral: { name: 'Equilateral', w: 130, h: (130 * Math.sqrt(3)) / 2, f: [[0.5, 0], [1, 1], [0, 1]] },
  rtriangle: { name: 'Right triangle', w: 120, h: 110, f: [[0, 0], [0, 1], [1, 1]] },
  rect: { name: 'Rectangle', w: 160, h: 90, f: [[0, 0], [1, 0], [1, 1], [0, 1]] },
  square: { name: 'Square', w: 100, h: 100, f: [[0, 0], [1, 0], [1, 1], [0, 1]] },
  parallelogram: { name: 'Parallelogram', w: 170, h: 90, f: [[0.25, 0], [1, 0], [0.75, 1], [0, 1]] },
  trapezium: { name: 'Trapezium', w: 170, h: 90, f: [[0.25, 0], [0.75, 0], [1, 1], [0, 1]] },
}
const OTHER = [
  { kind: 'circle', name: 'Circle' },
  { kind: 'line', name: 'Line' },
  { kind: 'arrow', name: 'Arrow' },
  { kind: 'text', name: 'Text' },
]

function Icon({ kind }) {
  const p = { fill: 'none', stroke: INK, strokeWidth: 2, strokeLinejoin: 'round' }
  const t = T[kind]
  return (
    <svg width="30" height="30" viewBox="0 0 30 30">
      {t && (
        <polygon
          points={t.f.map(([x, y]) => `${3 + x * 24},${3 + (y * 24 * t.h) / Math.max(t.w, t.h) * (t.w / t.h) * (t.h / t.w)}`).join(' ')}
          {...p}
        />
      )}
      {kind === 'circle' && <circle cx="15" cy="15" r="11" {...p} />}
      {kind === 'line' && <line x1="4" y1="24" x2="26" y2="6" {...p} />}
      {kind === 'arrow' && (
        <g {...p}>
          <line x1="4" y1="15" x2="26" y2="15" />
          <polyline points="19,8 26,15 19,22" />
        </g>
      )}
      {kind === 'text' && <text x="15" y="23" textAnchor="middle" fontSize="22" fill={INK}>A</text>}
    </svg>
  )
}

export default function DiagramEditor({ onDone, onClose }) {
  const [shapes, setShapes] = useState([])
  const [selected, setSelected] = useState(null)
  const [selVertex, setSelVertex] = useState(null)
  const [editing, setEditing] = useState(null) // { x, y, value, commit }
  const svgRef = useRef(null)
  const drag = useRef(null)
  const nextId = useRef(1)
  const cancelEdit = useRef(false)

  const sel = shapes.find((s) => s.id === selected)

  const upd = (id, f) => setShapes((all) => all.map((s) => (s.id === id ? f(s) : s)))

  function point(e) {
    const r = svgRef.current.getBoundingClientRect()
    return { x: ((e.clientX - r.left) * W) / r.width, y: ((e.clientY - r.top) * H) / r.height }
  }

  // ---- adding shapes --------------------------------------------------------
  function addShape(kind, at = { x: W / 2, y: H / 2 }) {
    const id = nextId.current++
    let s
    if (T[kind]) {
      const t = T[kind]
      const ox = at.x - t.w / 2
      const oy = at.y - t.h / 2
      s = {
        id, kind, type: 'poly',
        pts: t.f.map(([fx, fy]) => ({ x: ox + fx * t.w, y: oy + fy * t.h })),
        vlabels: t.f.map((_, i) => LETTERS[i]),
        elabels: t.f.map(() => ''),
        angles: {},
      }
    } else if (kind === 'circle') {
      s = { id, kind, type: 'circle', pts: [at, { x: at.x + 55, y: at.y }], text: '' }
    } else if (kind === 'text') {
      s = { id, kind, type: 'text', pts: [at], text: 'Text' }
    } else {
      s = { id, kind, type: kind, pts: [{ x: at.x - 70, y: at.y }, { x: at.x + 70, y: at.y }], text: '' }
    }
    setShapes((all) => [...all, s])
    setSelected(id)
    setSelVertex(null)
  }

  // ---- dragging -------------------------------------------------------------
  function startDrag(e, s, mode, idx = null) {
    e.stopPropagation()
    setSelected(s.id)
    setSelVertex(mode === 'vertex' ? idx : null)
    drag.current = { id: s.id, mode, idx, start: point(e), orig: s.pts.map((p) => ({ ...p })), kind: s.kind, type: s.type }
  }

  function onMove(e) {
    const d = drag.current
    if (!d) return
    const pt = point(e)
    const dx = pt.x - d.start.x
    const dy = pt.y - d.start.y
    if (d.mode === 'move') {
      upd(d.id, (s) => ({ ...s, pts: d.orig.map((p) => ({ x: p.x + dx, y: p.y + dy })) }))
      return
    }
    // dragging one corner
    if (d.kind === 'rect' || d.kind === 'square') {
      const opp = d.orig[(d.idx + 2) % 4]
      let w = pt.x - opp.x
      let h = pt.y - opp.y
      if (d.kind === 'square') {
        const m = Math.max(Math.abs(w), Math.abs(h))
        w = Math.sign(w || 1) * m
        h = Math.sign(h || 1) * m
      }
      const x2 = opp.x + w
      const y2 = opp.y + h
      const x0 = Math.min(opp.x, x2)
      const x1 = Math.max(opp.x, x2)
      const y0 = Math.min(opp.y, y2)
      const y1 = Math.max(opp.y, y2)
      upd(d.id, (s) => ({ ...s, pts: [{ x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 }, { x: x0, y: y1 }] }))
    } else {
      upd(d.id, (s) => ({
        ...s,
        pts: s.pts.map((p, i) => (i === d.idx ? { x: d.orig[i].x + dx, y: d.orig[i].y + dy } : p)),
      }))
    }
  }

  const endDrag = () => { drag.current = null }

  // ---- editing text in place ------------------------------------------------
  function startEdit(x, y, value, commit) {
    cancelEdit.current = false
    setEditing({ x, y, value, commit })
  }
  function finishEdit(value) {
    if (editing && !cancelEdit.current) editing.commit(value)
    setEditing(null)
  }

  // ---- changing a corner angle ----------------------------------------------
  // keeps the length of the next side and turns it to the new angle
  function setCornerAngle(deg) {
    if (!sel || selVertex == null || !(deg > 0 && deg < 180)) return
    const n = sel.pts.length
    const c = corner(sel.pts, selVertex)
    const l = len(sub(c.b, c.v))
    const base = Math.atan2(c.u1.y, c.u1.x)
    const dir = c.cross >= 0 ? 1 : -1
    const ang = base + (dir * deg * Math.PI) / 180
    const nb = { x: c.v.x + l * Math.cos(ang), y: c.v.y + l * Math.sin(ang) }
    upd(sel.id, (s) => ({ ...s, pts: s.pts.map((p, i) => (i === (selVertex + 1) % n ? nb : p)) }))
  }

  function toggleAngle() {
    upd(sel.id, (s) => {
      const a = { ...s.angles }
      if (a[selVertex]) delete a[selVertex]
      else a[selVertex] = { text: '' }
      return { ...s, angles: a }
    })
  }

  function remove() {
    setShapes((all) => all.filter((s) => s.id !== selected))
    setSelected(null)
    setSelVertex(null)
  }

  useEffect(() => {
    function onKey(e) {
      if (editing || e.target.tagName === 'INPUT') return
      if ((e.key === 'Delete' || e.key === 'Backspace') && selected) remove()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  // ---- drawing one shape ----------------------------------------------------
  const label = (x, y, text, onEdit, size = 16, key) => (
    <text
      key={key}
      x={x} y={y + size / 3}
      textAnchor="middle" fontSize={size} fontFamily={FONT} fill={INK}
      style={{ cursor: 'text', userSelect: 'none' }}
      onPointerDown={(e) => e.stopPropagation()}
      onDoubleClick={onEdit}
    >
      {text}
    </text>
  )

  function drawShape(s) {
    const stroke = { fill: 'none', stroke: INK, strokeWidth: 2, strokeLinejoin: 'round' }
    const grab = (e) => startDrag(e, s, 'move')
    const pick = (e) => { e.stopPropagation(); setSelected(s.id) }

    if (s.type === 'poly') {
      const c = centroid(s.pts)
      const n = s.pts.length
      return (
        <g onPointerDown={grab} style={{ cursor: 'move' }}>
          <polygon points={s.pts.map((p) => `${p.x},${p.y}`).join(' ')} {...stroke} fill="transparent" />

          {/* angle marks */}
          {Object.entries(s.angles).map(([k, a]) => {
            const i = Number(k)
            const q = corner(s.pts, i)
            const r = Math.min(26, 0.4 * Math.min(len(sub(q.a, q.v)), len(sub(q.b, q.v))))
            const isRight = Math.abs(q.deg - 90) < 0.6 && !a.text
            const bis = len(add(q.u1, q.u2)) < 0.01 ? { x: -q.u1.y, y: q.u1.x } : unit(add(q.u1, q.u2))
            const lp = add(q.v, bis, r + 14)
            const txt = a.text || `${Math.round(q.deg)}°`
            const edit = () => startEdit(lp.x, lp.y, a.text, (val) => upd(s.id, (sh) => ({ ...sh, angles: { ...sh.angles, [i]: { text: val.trim() } } })))
            if (isRight) {
              const sq = Math.min(14, r)
              const p1 = add(q.v, q.u1, sq)
              const p3 = add(q.v, q.u2, sq)
              const p2 = add(p1, q.u2, sq)
              return <polyline key={k} points={`${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y}`} {...stroke} strokeWidth="1.5" onDoubleClick={edit} />
            }
            const p1 = add(q.v, q.u1, r)
            const p2 = add(q.v, q.u2, r)
            return (
              <g key={k}>
                <path d={`M ${p1.x} ${p1.y} A ${r} ${r} 0 0 ${q.cross > 0 ? 1 : 0} ${p2.x} ${p2.y}`} {...stroke} strokeWidth="1.5" />
                {label(lp.x, lp.y, txt, edit, 14)}
              </g>
            )
          })}

          {/* corner names */}
          {s.pts.map((p, i) => {
            const o = add(p, unit(sub(p, c)), 16)
            return label(o.x, o.y, s.vlabels[i], () =>
              startEdit(o.x, o.y, s.vlabels[i], (val) =>
                upd(s.id, (sh) => ({ ...sh, vlabels: sh.vlabels.map((v, j) => (j === i ? val : v)) })),
              ), 16, `v${i}`)
          })}

          {/* side labels */}
          {s.pts.map((p, i) => {
            const m = mid(p, s.pts[(i + 1) % n])
            const o = add(m, unit(sub(m, c)), 14)
            return s.elabels[i]
              ? label(o.x, o.y, s.elabels[i], () =>
                  startEdit(o.x, o.y, s.elabels[i], (val) =>
                    upd(s.id, (sh) => ({ ...sh, elabels: sh.elabels.map((v, j) => (j === i ? val : v)) })),
                  ), 14, `e${i}`)
              : null
          })}
        </g>
      )
    }

    if (s.type === 'circle') {
      const r = len(sub(s.pts[1], s.pts[0]))
      const ed = () => startEdit(s.pts[0].x, s.pts[0].y, s.text, (val) => upd(s.id, (sh) => ({ ...sh, text: val })))
      return (
        <g onPointerDown={grab} onDoubleClick={ed} style={{ cursor: 'move' }}>
          <circle cx={s.pts[0].x} cy={s.pts[0].y} r={r} {...stroke} fill="transparent" />
          {s.text && label(s.pts[0].x, s.pts[0].y, s.text, ed)}
        </g>
      )
    }

    if (s.type === 'line' || s.type === 'arrow') {
      const [a, b] = s.pts
      const ang = Math.atan2(b.y - a.y, b.x - a.x)
      const hd = (k) => `${b.x - 12 * Math.cos(ang + k)},${b.y - 12 * Math.sin(ang + k)}`
      const m = mid(a, b)
      const nrm = unit({ x: -(b.y - a.y), y: b.x - a.x })
      const lp = add(m, nrm, -14)
      const ed = () => startEdit(lp.x, lp.y, s.text, (val) => upd(s.id, (sh) => ({ ...sh, text: val })))
      return (
        <g onPointerDown={grab} onDoubleClick={ed} style={{ cursor: 'move' }}>
          <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="transparent" strokeWidth="14" />
          <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} {...stroke} />
          {s.type === 'arrow' && <polyline points={`${hd(0.45)} ${b.x},${b.y} ${hd(-0.45)}`} {...stroke} />}
          {s.text && label(lp.x, lp.y, s.text, ed)}
        </g>
      )
    }

    // free text
    const p = s.pts[0]
    const ed = () => startEdit(p.x, p.y, s.text, (val) => upd(s.id, (sh) => ({ ...sh, text: val || 'Text' })))
    return (
      <g onPointerDown={grab} onDoubleClick={ed} style={{ cursor: 'move' }}>
        <text x={p.x} y={p.y + 6} textAnchor="middle" fontSize="20" fontFamily={FONT} fill={INK} style={{ userSelect: 'none' }}>
          {s.text}
        </text>
        <rect x={p.x - Math.max(20, s.text.length * 6)} y={p.y - 14} width={Math.max(40, s.text.length * 12)} height="28" fill="transparent" />
      </g>
    )
  }

  // ---- saving as a PNG --------------------------------------------------------
  function finish() {
    setSelected(null)
    setEditing(null)
    requestAnimationFrame(() => {
      const clone = svgRef.current.cloneNode(true)
      clone.querySelector('[data-ui]')?.remove()
      clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
      clone.setAttribute('width', W)
      clone.setAttribute('height', H)
      const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
      bg.setAttribute('width', W)
      bg.setAttribute('height', H)
      bg.setAttribute('fill', '#ffffff')
      clone.insertBefore(bg, clone.firstChild)
      const url = URL.createObjectURL(
        new Blob([new XMLSerializer().serializeToString(clone)], { type: 'image/svg+xml;charset=utf-8' }),
      )
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = W * 2
        canvas.height = H * 2
        canvas.getContext('2d').drawImage(img, 0, 0, W * 2, H * 2)
        URL.revokeObjectURL(url)
        canvas.toBlob((blob) => {
          if (blob) onDone(new File([blob], `diagram-${Date.now()}.png`, { type: 'image/png' }))
        }, 'image/png')
      }
      img.src = url
    })
  }

  const info = sel?.type === 'poly' && selVertex != null ? corner(sel.pts, selVertex) : null

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', zIndex: 50 }} className="flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl max-h-full overflow-auto p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-800">Draw a maths diagram</h2>
          <button type="button" onClick={onClose} className="text-slate-500 hover:text-slate-700 text-xl leading-none">×</button>
        </div>

        <p className="text-xs text-slate-500">
          Drag a shape onto the white area. Drag a blue dot to change a corner. Double-click any letter or number to type on it.
          Click a corner dot, then use <b>∠ Mark angle</b>.
        </p>

        <div className="flex flex-wrap gap-2">
          {[...Object.keys(T).map((k) => ({ kind: k, name: T[k].name })), ...OTHER].map((item) => (
            <button
              key={item.kind}
              type="button"
              draggable
              title={item.name}
              onDragStart={(e) => e.dataTransfer.setData('text/plain', item.kind)}
              onClick={() => addShape(item.kind)}
              className="flex flex-col items-center gap-1 border border-slate-300 rounded-md px-2 py-1 text-xs text-slate-600 hover:bg-slate-50 cursor-grab"
            >
              <Icon kind={item.kind} />
              {item.name}
            </button>
          ))}
        </div>

        <div style={{ position: 'relative' }}>
          <svg
            ref={svgRef}
            viewBox={`0 0 ${W} ${H}`}
            style={{ width: '100%', display: 'block', background: '#fff', border: '1px solid #cbd5e1', borderRadius: 6, touchAction: 'none' }}
            onPointerMove={onMove}
            onPointerUp={endDrag}
            onPointerLeave={endDrag}
            onPointerDown={() => { setSelected(null); setSelVertex(null) }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              const kind = e.dataTransfer.getData('text/plain')
              if (T[kind] || OTHER.some((o) => o.kind === kind)) addShape(kind, point(e))
            }}
          >
            {shapes.map((s) => <g key={s.id}>{drawShape(s)}</g>)}

            {/* handles and helpers: not part of the saved picture */}
            <g data-ui="1">
              {sel && sel.type === 'poly' && sel.pts.map((p, i) => {
                const n = sel.pts.length
                const m = mid(p, sel.pts[(i + 1) % n])
                const o = add(m, unit(sub(m, centroid(sel.pts))), 14)
                return !sel.elabels[i] && (
                  <g
                    key={`add${i}`}
                    style={{ cursor: 'text' }}
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={() =>
                      startEdit(o.x, o.y, '', (val) =>
                        upd(sel.id, (sh) => ({ ...sh, elabels: sh.elabels.map((v, j) => (j === i ? val : v)) })),
                      )
                    }
                  >
                    <circle cx={o.x} cy={o.y} r="8" fill="#fff" stroke="#94a3b8" strokeDasharray="2 2" />
                    <text x={o.x} y={o.y + 4} textAnchor="middle" fontSize="12" fill="#64748b">+</text>
                  </g>
                )
              })}
              {sel && sel.pts.map((p, i) => {
                if (sel.type === 'text') return null
                const isCircleCenter = sel.type === 'circle' && i === 0
                return (
                  <circle
                    key={`h${i}`}
                    cx={p.x} cy={p.y} r="6"
                    fill={selVertex === i ? '#1d4ed8' : '#3b82f6'} stroke="#fff" strokeWidth="2"
                    style={{ cursor: isCircleCenter ? 'move' : 'crosshair' }}
                    onPointerDown={(e) => startDrag(e, sel, isCircleCenter ? 'move' : 'vertex', i)}
                  />
                )
              })}
            </g>
          </svg>

          {editing && (
            <input
              autoFocus
              defaultValue={editing.value}
              onFocus={(e) => e.target.select()}
              onBlur={(e) => finishEdit(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); e.target.blur() }
                if (e.key === 'Escape') { cancelEdit.current = true; e.target.blur() }
              }}
              style={{
                position: 'absolute',
                left: `${(editing.x / W) * 100}%`,
                top: `${(editing.y / H) * 100}%`,
                transform: 'translate(-50%, -50%)',
                width: 90,
                textAlign: 'center',
                fontSize: 15,
                border: '1px solid #3b82f6',
                borderRadius: 4,
                padding: '2px 4px',
                background: '#fff',
                outline: 'none',
              }}
            />
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 min-h-[2.25rem]">
          {info ? (
            <>
              <button
                type="button"
                onClick={toggleAngle}
                className={`text-sm px-3 py-1.5 rounded-md border ${
                  sel.angles[selVertex] ? 'bg-blue-50 border-blue-400 text-blue-700' : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                }`}
              >
                ∠ {sel.angles[selVertex] ? 'Remove angle mark' : 'Mark angle'} at {sel.vlabels[selVertex] || 'this corner'}
              </button>
              <label className="flex items-center gap-1 text-sm text-slate-600">
                Angle
                <input
                  key={`${sel.id}-${selVertex}-${Math.round(info.deg * 10)}`}
                  type="number"
                  min="1"
                  max="179"
                  step="1"
                  defaultValue={Math.round(info.deg * 10) / 10}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), e.target.blur())}
                  onBlur={(e) => setCornerAngle(Number(e.target.value))}
                  className="border border-slate-300 rounded-md px-2 py-1 w-20 text-sm"
                />
                °
              </label>
            </>
          ) : (
            <span className="text-sm text-slate-400">
              {sel ? 'Click a blue corner dot to mark or set its angle.' : 'Click a shape to select it.'}
            </span>
          )}
          {sel && (
            <button type="button" onClick={remove} className="ml-auto text-sm px-3 py-1.5 rounded-md border border-red-300 text-red-600 hover:bg-red-50">
              Delete shape
            </button>
          )}
        </div>

        <div className="flex justify-between pt-1">
          <button type="button" onClick={() => { setShapes([]); setSelected(null); setSelVertex(null) }} className="text-sm px-3 py-1.5 rounded-md text-slate-600 hover:bg-slate-100">
            Clear all
          </button>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="text-sm px-3 py-1.5 rounded-md text-slate-600 hover:bg-slate-100">
              Cancel
            </button>
            <button
              type="button"
              onClick={finish}
              disabled={!shapes.length}
              className="text-sm px-4 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white disabled:bg-slate-300"
            >
              Use this diagram
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
