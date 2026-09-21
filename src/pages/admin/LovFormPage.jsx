import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { adminApi } from '../../api/adminApi'
import { useAuth } from '../../auth/AuthContext'

const RESOURCE = 'lov'
const LABEL = 'List of Values entry'
const NEW_TYPE_OPTION = '__new__'

export default function LovFormPage() {
  const { id } = useParams()
  const isNew = id === 'new'
  const navigate = useNavigate()
  const { user: currentUser } = useAuth()

  const [values, setValues] = useState({})
  const [types, setTypes] = useState([])

  const [addingNewType, setAddingNewType] = useState(false)
  const [newTypeInput, setNewTypeInput] = useState('')

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!isNew) adminApi.get(RESOURCE, id).then(setValues)
    else setValues({})
  }, [id])

  // Load every LOV row once, so we can derive the type list for the dropdown.
  useEffect(() => {
    adminApi
      .list(RESOURCE)
      .then((rows) => {
        const uniqueTypes = Array.from(new Set(rows.map((r) => r.type).filter(Boolean))).sort()
        setTypes(uniqueTypes)
      })
      .catch(() => {
        setTypes([])
      })
  }, [])

  function setField(key, val) {
    setValues((v) => ({ ...v, [key]: val }))
  }

  function handleTypeSelect(e) {
    const val = e.target.value
    if (val === NEW_TYPE_OPTION) {
      setAddingNewType(true)
      setNewTypeInput('')
      setField('type', '')
    } else {
      setAddingNewType(false)
      setField('type', val)
    }
  }

  function handleNewTypeChange(e) {
    const val = e.target.value
    setNewTypeInput(val)
    setField('type', val)
  }

  function cancelNewType() {
    setAddingNewType(false)
    setNewTypeInput('')
    setField('type', '')
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
    navigate('/admin/lov')
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
        <label className="block text-sm text-slate-600 mb-1">Type</label>

        {!addingNewType ? (
          <select
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
            value={values.type || ''}
            onChange={handleTypeSelect}
            required
          >
            <option value="">Select…</option>
            {types.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
            <option value={NEW_TYPE_OPTION}>+ Add new type…</option>
          </select>
        ) : (
          <div className="flex gap-2">
            <input
              type="text"
              autoFocus
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
              placeholder="Enter new type name"
              value={newTypeInput}
              onChange={handleNewTypeChange}
              required
            />
            <button
              type="button"
              onClick={cancelNewType}
              className="px-3 py-2 text-sm rounded-md border border-slate-300 text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm text-slate-600 mb-1">Value</label>
        <input
          type="text"
          className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
          value={values.value || ''}
          onChange={(e) => setField('value', e.target.value)}
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