import { useEffect, useRef, useState } from 'react'
import DiagramEditor from './DiagramEditor'

const API_BASE = 'http://127.0.0.1:8000'

// ---- API calls (change the URLs here if your backend differs) -------------
export async function listImages(questionId) {
  const res = await fetch(`${API_BASE}/questions/${questionId}/images`)
  if (!res.ok) throw new Error(`list failed (${res.status})`)
  return res.json()
}

export async function uploadImage(questionId, file) {
  const fd = new FormData()
  fd.append('file', file)
  const res = await fetch(`${API_BASE}/questions/${questionId}/images`, { method: 'POST', body: fd })
  if (!res.ok) throw new Error(`upload failed (${res.status})`)
  return res.json()
}

export async function deleteImage(questionId, imageId) {
  const res = await fetch(`${API_BASE}/questions/${questionId}/images/${imageId}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(`delete failed (${res.status})`)
}

// URL the browser uses to show an image that is already saved.
const imageUrl = (img) => `${API_BASE}/question-images/${img.file_path}`

// Reads a File into a data URL so a preview always works, even before upload.
const readAsDataUrl = (file) =>
  new Promise((resolve) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result)
    r.onerror = () => resolve(null)
    r.readAsDataURL(file)
  })

// questionId is null while adding a new question: dropped files wait in
// `pending` (array of File) and are uploaded after the question is saved.
export default function QuestionImages({ questionId, pending, setPending }) {
  const [saved, setSaved] = useState([])
  const [pendingSrc, setPendingSrc] = useState([]) // preview for each pending file
  const [dragging, setDragging] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)
  const [drawing, setDrawing] = useState(false)
  const inputRef = useRef(null)

  // saved images of an existing question
  useEffect(() => {
    if (!questionId) return
    listImages(questionId)
      .then(setSaved)
      .catch((err) => setMsg(`Could not load images: ${err.message}`))
  }, [questionId])

  // previews for files waiting to be saved
  useEffect(() => {
    let alive = true
    Promise.all(pending.map(readAsDataUrl)).then((urls) => alive && setPendingSrc(urls))
    return () => { alive = false }
  }, [pending])

  async function addFiles(fileList) {
    const files = Array.from(fileList || []).filter((f) => f.type.startsWith('image/'))
    if (!files.length) {
      setMsg('Only image files can be added (png, jpg, gif, webp).')
      return
    }
    setMsg(null)

    if (!questionId) {
      setPending((p) => [...p, ...files])
      return
    }

    setBusy(true)
    for (const f of files) {
      try {
        const [img, preview] = await Promise.all([uploadImage(questionId, f), readAsDataUrl(f)])
        setSaved((s) => [...s, { ...img, preview }])
      } catch (err) {
        setMsg(`${f.name}: ${err.message}`)
      }
    }
    setBusy(false)
  }

  async function removeSaved(img) {
    if (!window.confirm('Remove this image?')) return
    try {
      await deleteImage(questionId, img.image_id)
      setSaved((s) => s.filter((x) => x.image_id !== img.image_id))
    } catch (err) {
      setMsg(err.message)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="block text-sm text-slate-600">Images (diagrams / graphs)</label>
        <button type="button" onClick={() => setDrawing(true)} className="text-xs text-blue-600 hover:underline">
          ✏ Draw a diagram
        </button>
      </div>

      {drawing && (
        <DiagramEditor
          onClose={() => setDrawing(false)}
          onDone={(file) => {
            setDrawing(false)
            addFiles([file])
          }}
        />
      )}

      <div
        onDragEnter={(e) => { e.preventDefault(); setDragging(true) }}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          addFiles(e.dataTransfer.files)
        }}
        onClick={() => inputRef.current?.click()}
        className={`cursor-pointer border-2 border-dashed rounded-md px-4 py-6 text-center text-sm ${
          dragging ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-slate-300 text-slate-500 hover:bg-slate-50'
        }`}
      >
        {busy ? 'Uploading…' : 'Drag and drop images here, or click to choose'}
      </div>

      {/* outside the drop box so its click does not trigger the box again */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: 'none' }}
        onChange={(e) => {
          addFiles(e.target.files)
          e.target.value = ''
        }}
      />

      {msg && <p className="text-sm text-red-600 mt-1">{msg}</p>}

      {(saved.length > 0 || pending.length > 0) && (
        <div className="mt-3 grid grid-cols-3 gap-3">
          {saved.map((img) => (
            <Thumb
              key={img.image_id}
              src={img.preview || imageUrl(img)}
              fallbackNote={`Could not load ${imageUrl(img)}`}
              name={(img.file_path || '').split('/').pop()}
              onRemove={() => removeSaved(img)}
            />
          ))}
          {pending.map((f, i) => (
            <Thumb
              key={`p${i}-${f.name}`}
              src={pendingSrc[i]}
              name={f.name}
              note="Will be saved with the question"
              onRemove={() => setPending((p) => p.filter((_, j) => j !== i))}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function Thumb({ src, name, note, fallbackNote, onRemove }) {
  const [failed, setFailed] = useState(false)
  return (
    <div className="relative border border-slate-200 rounded-md p-2 bg-white">
      {failed ? (
        <div className="h-28 flex items-center justify-center text-xs text-red-600 text-center break-all">
          {fallbackNote || 'Image could not be shown'}
        </div>
      ) : (
        <img
          src={src}
          alt={name}
          onError={() => setFailed(true)}
          style={{ width: '100%', height: '7rem', objectFit: 'contain' }}
        />
      )}
      <div className="text-xs text-slate-500 mt-1 truncate" title={name}>{name}</div>
      {note && <div className="text-xs text-amber-700">{note}</div>}
      <button
        type="button"
        onClick={onRemove}
        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-white border border-slate-300 text-slate-600 hover:text-red-600 text-sm leading-none"
        aria-label="Remove image"
      >
        ×
      </button>
    </div>
  )
}
