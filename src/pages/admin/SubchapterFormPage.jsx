import { useEffect, useState, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { adminApi } from '../../api/adminApi'
import { useAuth } from '../../auth/AuthContext'
import { toTamil } from '../../utils/transliterate'

const RESOURCE = 'subchapters'
const LABEL = 'Subchapter'

export default function SubchapterFormPage() {
  const { id } = useParams()
  const isNew = id === 'new'
  const navigate = useNavigate()
  const { user: currentUser } = useAuth()
  const [values, setValues] = useState({})
  const [chapters, setChapters] = useState([])
  const [optionsLoading, setOptionsLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [translating, setTranslating] = useState(false)
  const [error, setError] = useState(null)
  const debounceRef = useRef(null)

  useEffect(() => {
    if (!isNew) {
      adminApi.get(RESOURCE, id)
        .then(setValues)
        .catch((err) => setError('Could not load subchapter. ' + (err.status ? `(${err.status})` : '')))
    } else {
      setValues({})
    }
  }, [id])

  // Every chapter is a valid parent — no filter needed here.
  useEffect(() => {
    adminApi.list('chapters').then((rows) => {
      setChapters(rows)
      setOptionsLoading(false)
    })
  }, [])

  function setField(key, val) {
    setValues((v) => ({ ...v, [key]: val }))
  }

  function handleTamilInput(e) {
    const raw = e.target.value
    setField('title_ta', raw) // show raw text immediately, no lag

    const endsWithBoundary = /[\s.,!?]$/.test(raw)

    clearTimeout(debounceRef.current)

    if (endsWithBoundary) {
      // Word just finished — convert right away, no waiting
      convertAndSet(raw)
    } else {
      // Still mid-word — wait briefly in case they keep typing,
      // but much shorter than before
      debounceRef.current = setTimeout(() => convertAndSet(raw), 150)
    }
  }

  async function convertAndSet(raw) {
    const converted = await toTamil(raw)
    setField('title_ta', converted)
  }

  // Calls MyMemory's free translation API (no key needed) to convert
  // the English title into Tamil. The result is editable afterward —
  // machine translation is a starting point, not final copy.
  async function handleTranslate() {
    const text = values.title_en?.trim()
    if (!text) return
    setTranslating(true)
    try {
      const res = await fetch(
        `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|ta`
      )
      const data = await res.json()
      const translated = data?.responseData?.translatedText
      if (translated) setField('title_ta', translated)
    } catch (err) {
      // Translation failing shouldn't block the form — just leave the
      // Tamil field for manual entry.
    } finally {
      setTranslating(false)
    }
  }

  // Pushes title_ta into subchapter_translations (lang_code 'ta') in
  // addition to the flat column on the subchapter row. Best-effort —
  // a failure here doesn't block the main save from having succeeded.
  async function syncTranslation(subchapterId) {
    const title = values.title_ta?.trim()
    if (!title) return
    try {
      await adminApi.upsertTranslation(RESOURCE, subchapterId, 'ta', title, currentUser?.username)
    } catch (err) {
      setError((prev) => prev || 'Subchapter saved, but the Tamil translation record could not be synced.')
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      if (isNew) {
        const created = await adminApi.create(RESOURCE, values, currentUser?.username)
        await syncTranslation(created.subchapter_id)
      } else {
        await adminApi.update(RESOURCE, id, values, currentUser?.username)
        await syncTranslation(id)
      }
      navigate('/admin/subchapter')
    } catch (err) {
      setError('Save failed. Check required fields and try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl bg-white rounded-lg shadow-sm p-6 space-y-4">
      <h1 className="text-lg font-semibold text-slate-800">
        {isNew ? `Add ${LABEL}` : `Edit ${LABEL}`}
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm text-slate-600 mb-1">Chapter</label>
          <select
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
            value={values.chapter_id || ''}
            onChange={(e) => setField('chapter_id', e.target.value)}
            required
            disabled={optionsLoading}
          >
            <option value="">{optionsLoading ? 'Loading…' : 'Select…'}</option>
            {chapters.map((c) => (
              <option key={c.chapter_id} value={c.chapter_id}>
                {c.chapter_no} - {c.title_en}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm text-slate-600 mb-1">Subchapter No</label>
          <input
            type="text"
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
            value={values.subchapter_no || ''}
            onChange={(e) => setField('subchapter_no', e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-sm text-slate-600 mb-1">Title (English)</label>
          <input
            type="text"
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
            value={values.title_en || ''}
            onChange={(e) => setField('title_en', e.target.value)}
            onBlur={handleTranslate}
            required
          />
        </div>

        <div>
          <label className="block text-sm text-slate-600 mb-1 flex items-center justify-between">
            <span>Title (Tamil)</span>
            <button
              type="button"
              onClick={handleTranslate}
              disabled={translating || !values.title_en}
              className="text-xs text-brand-600 hover:underline disabled:text-slate-300"
            >
              {translating ? 'Translating…' : 'Translate'}
            </button>
          </label>
          <input
            type="text"
            autoComplete="off"
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
            value={values.title_ta || ''}
            onChange={handleTamilInput}
          />
        </div>

        <div>
          <label className="block text-sm text-slate-600 mb-1">Sort order</label>
          <input
            type="number"
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
            value={values.sort_order ?? ''}
            onChange={(e) => setField('sort_order', Number(e.target.value))}
          />
        </div>

        <div className="flex items-end">
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={!!values.is_active}
              onChange={(e) => setField('is_active', e.target.checked)}
            />
            Active
          </label>
        </div>
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 rounded-md text-sm"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="px-4 py-2 rounded-md text-sm text-slate-600 hover:bg-slate-100"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
