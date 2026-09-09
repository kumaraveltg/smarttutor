import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { adminApi } from '../../api/adminApi'

const RESOURCE = 'questions'
const LABEL = 'Question'

export default function QuestionsFormPage() {
  const { id } = useParams()
  const isNew = id === 'new'
  const navigate = useNavigate()
  const [values, setValues] = useState({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!isNew) adminApi.get(RESOURCE, id).then(setValues)
    else setValues({})
  }, [id])

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
      navigate('/admin/questions')
    } catch (err) {
      setError('Save failed. Check required fields and try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-lg bg-white rounded-lg shadow-sm p-6 space-y-4">
      <h1 className="text-lg font-semibold text-slate-800">
        {isNew ? `Add ${LABEL}` : `Edit ${LABEL}`}
      </h1>

      <div>
        <label className="block text-sm text-slate-600 mb-1">Chapter</label>
        <input
          type="text"
          className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
          value={values.chapter || ''}
          onChange={(e) => setField('chapter', e.target.value)}
          required
        />
      </div>

      <div>
        <label className="block text-sm text-slate-600 mb-1">Title</label>
        <input
          type="text"
          className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
          value={values.title || ''}
          onChange={(e) => setField('title', e.target.value)}
          required
        />
      </div>

      <div>
        <label className="block text-sm text-slate-600 mb-1">Question text</label>
        <textarea
          className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
          rows={4}
          value={values.body || ''}
          onChange={(e) => setField('body', e.target.value)}
          required
        />
      </div>

      <div>
        <label className="block text-sm text-slate-600 mb-1">Difficulty</label>
        <select
          className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
          value={values.difficulty || ''}
          onChange={(e) => setField('difficulty', e.target.value)}
        >
          <option value="">Select…</option>
          <option value="Easy">Easy</option>
          <option value="Medium">Medium</option>
          <option value="Hard">Hard</option>
        </select>
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
