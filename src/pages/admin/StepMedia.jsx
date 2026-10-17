import { useRef, useState } from 'react'
import FunctionPlotter from  '../../graph/FunctionPlotter'   // your plotter (same folder as mathParser.js)

const API_URL = 'http://localhost:8000'
const IMAGE_URL = `${API_URL}/images`     // same mount as QuestionPreview

const box = { border: '1px dashed #94a3b8', borderRadius: 6, padding: 8, background: '#f8fafc',
              fontSize: 13, color: '#475569' }
const btn = { border: '1px solid #cbd5e1', background: '#fff', borderRadius: 4,
              padding: '3px 10px', cursor: 'pointer', fontSize: 13, marginRight: 6 }

// What is saved in the database for a graph (the plotter's own onChange output):
// { functions: [{expr, color, visible}], shapes: [{points, mode, fill, labels, color}],
//   view: {xMin, xMax, yMin, yMax}, degrees: false }
const newGraph = () => ({
  functions: [{ expr: 'x^2' }],
  shapes: [],
  view: { xMin: -10, xMax: 10, yMin: -10, yMax: 10 },
  degrees: false,
})

/* Read-only view: use this on the Practice page (hint) and anywhere an answer is shown. */
export function StepMediaView({ images = [], graph = null }) {
  if (!images.length && !graph) return null
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        {images.map((p) => (
          <img key={p} src={`${IMAGE_URL}/${p}`} alt="step"
               style={{ maxWidth: 320, maxHeight: 240, border: '1px solid #cbd5e1',
                        borderRadius: 6, background: '#fff' }} />
        ))}
      </div>
      {graph && (
        <div style={{ marginTop: 8, maxWidth: 520 }}>
          <FunctionPlotter
            readOnly
            height={300}
            initialFunctions={graph.functions || []}
            initialShapes={graph.shapes || []}
            initialView={graph.view}
            initialDegrees={!!graph.degrees}
          />
        </div>
      )}
    </div>
  )
}

/*
  Editor used in the Answer form.
  value    = { images: [relative paths], graph: object | null }
  onChange = called with ONLY the part that changed: { images } or { graph }
*/
export default function StepMedia({ questionId, value, onChange }) {
  const images = value.images || []
  const graph = value.graph || null
  const fileRef = useRef(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)

  async function upload(file) {
    const fd = new FormData()
    fd.append('file', file)
    // The backend route needs the teacher's login. Copy the Authorization header the
    // same way QuestionImages.jsx / adminApi does it (marked below).
    const r = await fetch(`${API_URL}/admin/answers/upload-image?question_id=${questionId}`, {
      method: 'POST',
      body: fd,
      headers: { /* Authorization: `Bearer ${token}`  <- same as adminApi */ },
    })
    if (!r.ok) throw new Error('upload failed')
    return (await r.json()).path       // relative path, e.g. 10/1/3/2/answers/fig1.png
  }

  async function addFiles(fileList) {
    const files = [...fileList].filter((f) => f.type.startsWith('image/'))
    if (!files.length) return
    setErr(null)
    setBusy(true)
    try {
      const paths = []
      for (const f of files) paths.push(await upload(f))
      onChange({ images: [...images, ...paths] })
    } catch {
      setErr('Image upload failed.')
    } finally {
      setBusy(false)
    }
  }

  const removeImage = (p) => onChange({ images: images.filter((x) => x !== p) })

  return (
    <div style={{ marginTop: 6 }}>
      {!questionId ? (
        <div style={box}>Select a question above to add images or a graph.</div>
      ) : (
        <>
          <div style={box}
               onDragOver={(e) => e.preventDefault()}
               onDrop={(e) => { e.preventDefault(); addFiles(e.dataTransfer.files) }}>
            {busy ? 'Uploading…' : 'Drag and drop images here, or '}
            {!busy && (
              <button type="button" style={btn} onClick={() => fileRef.current.click()}>
                Browse
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" multiple hidden
                   onChange={(e) => { addFiles(e.target.files); e.target.value = '' }} />
            {!graph && (
              <button type="button" style={btn} onClick={() => onChange({ graph: newGraph() })}>
                + Add graph
              </button>
            )}
          </div>

          {err && <div style={{ color: '#dc2626', fontSize: 13, marginTop: 4 }}>{err}</div>}

          {images.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
              {images.map((p) => (
                <div key={p} style={{ position: 'relative' }}>
                  <img src={`${IMAGE_URL}/${p}`} alt="step"
                       style={{ height: 80, border: '1px solid #cbd5e1', borderRadius: 4,
                                background: '#fff' }} />
                  <button type="button" onClick={() => removeImage(p)}
                          style={{ position: 'absolute', top: 2, right: 2, border: 'none',
                                   background: '#dc2626', color: '#fff', borderRadius: 10,
                                   width: 18, height: 18, cursor: 'pointer', fontSize: 11,
                                   lineHeight: '18px', padding: 0 }}>✕</button>
                </div>
              ))}
            </div>
          )}

          {graph && (
            <div style={{ marginTop: 8, border: '1px solid #e2e8f0', borderRadius: 6,
                          padding: 8, background: '#fff' }}>
              <FunctionPlotter
                height={320}
                initialFunctions={graph.functions || []}
                initialShapes={graph.shapes || []}
                initialView={graph.view}
                initialDegrees={!!graph.degrees}
                onChange={(g) => onChange({ graph: g })}
              />
              <button type="button" style={{ ...btn, marginTop: 8, color: '#dc2626' }}
                      onClick={() => onChange({ graph: null })}>
                Remove graph
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
