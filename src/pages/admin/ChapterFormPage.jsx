import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { adminApi } from '../../api/adminApi'
import { useAuth } from '../../auth/AuthContext'
import { toTamil } from '../../utils/transliterate'


const RESOURCE = 'chapters'
const LABEL = 'Chapter'

export default function ChapterFormPage() {
  const { id } = useParams()
  const isNew = id === 'new'
  const navigate = useNavigate()
  const { user: currentUser } = useAuth()
  const [values, setValues] = useState({})
  const [lov, setLov] = useState([])
  const [optionsLoading, setOptionsLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [translating, setTranslating] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
  if (!isNew) {
    adminApi.get(RESOURCE, id)
      .then(setValues)
      .catch((err) => setError('Could not load chapter. ' + (err.status ? `(${err.status})` : '')))
  } else {
    setValues({})
  }
}, [id])

  useEffect(() => {
    adminApi.list('lov').then((rows) => {
      setLov(rows)
      setOptionsLoading(false)
    })
  }, [])

  function handleTamilInput(e) {
  const raw = e.target.value
  setField('title_ta', toTamil(raw))
}

  function setField(key, val) {
    setValues((v) => ({ ...v, [key]: val }))
  }

  const boardOptions = lov.filter((r) => r.type === 'Board of Category')
  const classOptions = lov.filter((r) => r.type === 'School')
  const mediumOptions = lov.filter((r) => r.type === 'Medium')
  const subjectOptions = lov.filter((r) => r.type === 'Subject')

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

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      if (isNew) {
        await adminApi.create(RESOURCE, {
          ...values,
          modified_by: currentUser?.username,
        }, currentUser?.username)
      } else {
        await adminApi.update(RESOURCE, id, values, currentUser?.username)
      }
      navigate('/admin/chapter')
    } catch (err) {
      setError('Save failed. Check required fields and try again.')
    } finally {
      setSaving(false)
    }
  }

  function renderLovSelect(label, key, options) {
    return (
      <div>
        <label className="block text-sm text-slate-600 mb-1">{label}</label>
        <select
          className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
          value={values[key] || ''}
          onChange={(e) => setField(key, e.target.value)}
          required
          disabled={optionsLoading}
        >
          <option value="">{optionsLoading ? 'Loading…' : 'Select…'}</option>
          {options.map((opt) => (
            <option key={opt.lov_id} value={opt.lov_id}>{opt.value}</option>
          ))}
        </select>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl bg-white rounded-lg shadow-sm p-6 space-y-6">
      <h1 className="text-lg font-semibold text-slate-800">
        {isNew ? `Add ${LABEL}` : `Edit ${LABEL}`}
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {renderLovSelect('Board', 'board_lov_id', boardOptions)}
        {renderLovSelect('Class', 'class_lov_id', classOptions)}
        {renderLovSelect('Medium', 'medium_lov_id', mediumOptions)}
        {renderLovSelect('Subject', 'subject_lov_id', subjectOptions)}

        <div>
          <label className="block text-sm text-slate-600 mb-1">Chapter No</label>
          <input
            type="text"
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
            value={values.chapter_no || ''}
            onChange={(e) => setField('chapter_no', e.target.value)}
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
          onChange={(e) => setField('title_ta', e.target.value)}
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