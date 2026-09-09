import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { adminApi } from '../../api/adminApi'

const RESOURCE = 'roles'
const LABEL = 'User Roles'
const COLUMNS = [
  { key: 'code', label: 'Code' },
  { key: 'name', label: 'Name' },
]

export default function RolesListPage() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      setRows(await adminApi.list(RESOURCE))
    } catch (err) {
      setError('Could not load data. Check the API connection.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function handleDelete(id) {
    if (!confirm('Delete this record?')) return
    await adminApi.remove(RESOURCE, id)
    load()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold text-slate-800">{LABEL}</h1>
        <Link
          to="/admin/roles/new"
          className="bg-brand-500 hover:bg-brand-600 text-white text-sm px-3 py-2 rounded-md"
        >
          + Add Role
        </Link>
      </div>

      {loading && <p className="text-slate-400">Loading…</p>}
      {error && <p className="text-red-600">{error}</p>}

      {!loading && !error && (
        <table className="w-full text-sm bg-white rounded-lg overflow-hidden shadow-sm">
          <thead className="bg-slate-100 text-left text-slate-500">
            <tr>
              {COLUMNS.map((col) => (
                <th key={col.key} className="px-4 py-2">{col.label}</th>
              ))}
              <th className="px-4 py-2 w-24">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-slate-100">
                {COLUMNS.map((col) => (
                  <td key={col.key} className="px-4 py-2">{String(row[col.key] ?? '')}</td>
                ))}
                <td className="px-4 py-2 space-x-2">
                  <Link to={`/admin/roles/${row.id}`} className="text-brand-600 hover:underline">
                    Edit
                  </Link>
                  <button onClick={() => handleDelete(row.id)} className="text-red-600 hover:underline">
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-slate-400" colSpan={COLUMNS.length + 1}>
                  No records yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  )
}
