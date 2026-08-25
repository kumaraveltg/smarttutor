import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { adminApi } from '../../api/adminApi'

export default function CrudForm({ entityKey, entity }) {
  const { id } = useParams()
  const isNew = id === 'new'
  const navigate = useNavigate()
  const [values, setValues] = useState({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  // Options for any `dynamicSelect` fields (e.g. chapter's board/class/subject
  // dropdowns, subchapter's chapter dropdown) — fetched once on mount.
  const [dynamicOptions, setDynamicOptions] = useState({})
  const [optionsLoading, setOptionsLoading] = useState(true)

  useEffect(() => {
    if (!isNew) {
      adminApi.get(entity.resource, id).then(setValues)
    } else {
      setValues({})
    }
  }, [id])

  useEffect(() => {
    const dynamicFields = entity.fields.filter((f) => f.type === 'dynamicSelect')
    if (dynamicFields.length === 0) {
      setOptionsLoading(false)
      return
    }
    Promise.all(
      dynamicFields.map((field) =>
        adminApi.list(field.source.resource).then((rows) => {
          const filtered = field.source.filter ? rows.filter(field.source.filter) : rows
          return [field.key, filtered]
        })
      )
    ).then((results) => {
      setDynamicOptions(Object.fromEntries(results))
      setOptionsLoading(false)
    })
  }, [entityKey])

  function setField(key, val) {
    setValues((v) => ({ ...v, [key]: val }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      if (isNew) await adminApi.create(entity.resource, values)
      else await adminApi.update(entity.resource, id, values)
      navigate(`/admin/${entityKey}`)
    } catch (err) {
      setError('Save failed. Check required fields and try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-lg bg-white rounded-lg shadow-sm p-6 space-y-4">
      <h1 className="text-lg font-semibold text-slate-800">
        {isNew ? `Add ${entity.label}` : `Edit ${entity.label}`}
      </h1>

      {entity.fields.map((field) => {
        if (field.createOnly && !isNew) return null
        return (
          <div key={field.key}>
            <label className="block text-sm text-slate-600 mb-1">{field.label}</label>
            {field.type === 'textarea' ? (
              <textarea
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
                rows={4}
                value={values[field.key] || ''}
                onChange={(e) => setField(field.key, e.target.value)}
                required={field.required}
              />
            ) : field.type === 'select' ? (
              <select
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
                value={values[field.key] || ''}
                onChange={(e) => setField(field.key, e.target.value)}
                required={field.required}
              >
                <option value="">Select…</option>
                {(field.options || []).map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            ) : field.type === 'dynamicSelect' ? (
              <select
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
                value={values[field.key] || ''}
                onChange={(e) => setField(field.key, e.target.value)}
                required={field.required}
                disabled={optionsLoading}
              >
                <option value="">{optionsLoading ? 'Loading…' : 'Select…'}</option>
                {(dynamicOptions[field.key] || []).map((row) => (
                  <option key={row[field.valueKey]} value={row[field.valueKey]}>
                    {field.labelFn ? field.labelFn(row) : row[field.labelKey]}
                  </option>
                ))}
              </select>
            ) : field.type === 'checkbox' ? (
              <input
                type="checkbox"
                checked={!!values[field.key]}
                onChange={(e) => setField(field.key, e.target.checked)}
              />
            ) : (
              <input
                type={field.type === 'password' ? 'password' : field.type === 'number' ? 'number' : 'text'}
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
                value={values[field.key] ?? ''}
                onChange={(e) =>
                  setField(field.key, field.type === 'number' ? Number(e.target.value) : e.target.value)
                }
                required={field.required}
              />
            )}
          </div>
        )
      })}

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
