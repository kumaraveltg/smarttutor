import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { adminApi } from '../../api/adminApi'

const RESOURCE = 'chapters'
const LABEL = 'Chapter'

export default function ChapterFormPage() {
  const { id } = useParams()
  const isNew = id === 'new'
  const navigate = useNavigate()
  const [values, setValues] = useState({})
  const [lov, setLov] = useState([])
  const [optionsLoading, setOptionsLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!isNew) adminApi.get(RESOURCE, id).then(setValues)
    else setValues({})
  }, [id])

  // Board/Class/Medium/Subject are all LOV rows — fetch once, filter by category client-side.
  useEffect(() => {
    adminApi.list('lov').then((rows) => {
      setLov(rows)
      setOptionsLoading(false)
    })
  }, [])

  function setField(key, val) {
    setValues((v) => ({ ...v, [key]: val }))
  }

  const boardOptions = lov.filter((r) => r.category === 'BOARD')
  const classOptions = lov.filter((r) => r.category === 'CLASS')
  const mediumOptions = lov.filter((r) => r.category === 'MEDIUM')
  const subjectOptions = lov.filter((r) => r.category === 'SUBJECT')

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      if (isNew) await adminApi.create(RESOURCE, values)
      else await adminApi.update(RESOURCE, id, values)
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
            <option key={opt.id} value={opt.id}>{opt.value}</option>
          ))}
        </select>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-lg bg-white rounded-lg shadow-sm p-6 space-y-4">
      <h1 className="text-lg font-semibold text-slate-800">
        {isNew ? `Add ${LABEL}` : `Edit ${LABEL}`}
      </h1>

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
          required
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

      <div>
        <label className="block text-sm text-slate-600 mb-1">Active</label>
        <input
          type="checkbox"
          checked={!!values.is_active}
          onChange={(e) => setField('is_active', e.target.checked)}
        />
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
