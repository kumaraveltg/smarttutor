import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { adminApi } from '../../api/adminApi'

const RESOURCE = 'subchapters'
const LABEL = 'Subchapter'

export default function SubchapterFormPage() {
  const { id } = useParams()
  const isNew = id === 'new'
  const navigate = useNavigate()
  const [values, setValues] = useState({})
  const [chapters, setChapters] = useState([])
  const [optionsLoading, setOptionsLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!isNew) {
      adminApi.get(RESOURCE, id).then((data) => {
        // API nests translations on the record — pull ta_title out into a
        // flat field so it binds to a plain input, and drop the raw array
        // so it doesn't leak into the payload on save.
        const { translations, ...rest } = data
        setValues({
          ...rest,
          ta_title: data.ta_title ?? translations?.find((t) => t.lang === 'ta')?.title ?? '',
        })
      })
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

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      if (isNew) await adminApi.create(RESOURCE, values)
      else await adminApi.update(RESOURCE, id, values)
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

      <div className="grid grid-cols-3 gap-4">
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
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm text-slate-600 mb-1">Title (Tamil)</label>
          <input
            type="text"
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
            value={values.ta_title || ''}
            onChange={(e) => setField('ta_title', e.target.value)}
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