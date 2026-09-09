import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { adminApi } from '../../api/adminApi'

const RESOURCE = 'roles'
const LABEL = 'Role'

export default function RolesFormPage() {
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
      navigate('/admin/roles')
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
        <label className="block text-sm text-slate-600 mb-1">Code</label>
        <input
          type="text"
          className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
          value={values.code || ''}
          onChange={(e) => setField('code', e.target.value)}
          required
        />
      </div>

      <div>
        <label className="block text-sm text-slate-600 mb-1">Name</label>
        <input
          type="text"
          className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
          value={values.name || ''}
          onChange={(e) => setField('name', e.target.value)}
          required
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
