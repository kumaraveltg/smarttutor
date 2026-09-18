import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { adminApi } from '../../api/adminApi'
import { useAuth } from '../../auth/AuthContext'  

const RESOURCE = 'users'
const LABEL = 'User'

export default function UsersFormPage() {
  const { id } = useParams()
  const isNew = id === 'new'
  const navigate = useNavigate()
  const { user: currentUser } = useAuth()
  const [values, setValues] = useState({})
  const [roles, setRoles] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  // Only superadmin can set/change a password directly from this form.
  // Adjust the comparison if role_name casing/values differ in your DB.
  const currentUserRoleName = roles.find((r) => r.role_id === currentUser?.role)?.role_name
  const isSuperAdmin = currentUserRoleName?.toLowerCase() === 'superadmin'
  const showPasswordField = isNew || isSuperAdmin
  console.log('currentUser:', currentUser)


  useEffect(() => {
    if (!isNew) adminApi.get(RESOURCE, id).then(setValues)
    else setValues({})
  }, [id])

  useEffect(() => {
    adminApi.list('user-roles').then(setRoles).catch(() => setRoles([]))
  }, [])

  function setField(key, val) {
    setValues((v) => ({ ...v, [key]: val }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const payload = { ...values }
      if (values.role_id) {
        payload.role_id = Number(values.role_id)
      } else {
        delete payload.role_id
      }

      // Don't send an empty password on edit — only include it if the
      // superadmin actually typed a new one.
      if (!isNew && !payload.password) {
        delete payload.password
      }

      if (isNew) await adminApi.create(RESOURCE, payload)
      else await adminApi.update(RESOURCE, id, payload)
      navigate('/admin/users')
    } catch (err) {
      const detail = err?.response?.data?.detail
      setError(typeof detail === 'string' ? detail : 'Save failed. Check required fields and try again.')
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
        <label className="block text-sm text-slate-600 mb-1">Username</label>
        <input
          type="text"
          className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
          value={values.username || ''}
          onChange={(e) => setField('username', e.target.value)}
          required
        />
      </div>

      <div>
        <label className="block text-sm text-slate-600 mb-1">Full name</label>
        <input
          type="text"
          className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
          value={values.full_name || ''}
          onChange={(e) => setField('full_name', e.target.value)}
        />
      </div>
      <div>
          <label className="block text-sm text-slate-600 mb-1">Email</label>
          <input
            type="email"
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
            value={values.email_id || ''}
            onChange={(e) => setField('email_id', e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-sm text-slate-600 mb-1">Mobile</label>
          <input
            type="text"
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
            value={values.mobile || ''}
            onChange={(e) => setField('mobile', e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm text-slate-600 mb-1">Device ID</label>
          <input
            type="text"
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
            value={values.device_id || ''}
            onChange={(e) => setField('device_id', e.target.value)}
          />
        </div>
      <div>
        <label className="block text-sm text-slate-600 mb-1">Role</label>
        <select
          className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
          value={values.role_id != null ? String(values.role_id) : ''}
          onChange={(e) => setField('role_id', e.target.value)}
          required
        >
          <option value="">Select…</option>
          {roles.map((r) => (
            <option key={r.role_id} value={r.role_id}>
              {r.role_name}
            </option>
          ))}
        </select>
      </div>

      {showPasswordField && (
        <div>
          <label className="block text-sm text-slate-600 mb-1">
            {isNew ? 'Password' : 'New Password'}
          </label>
          <input
            type="password"
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
            value={values.password || ''}
            onChange={(e) => setField('password', e.target.value)}
            placeholder={isNew ? '' : 'Leave blank to keep current password'}
          />
        </div>
      )}

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