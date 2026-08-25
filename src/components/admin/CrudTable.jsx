import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { adminApi } from '../../api/adminApi'

export default function CrudTable({ entityKey, entity }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const data = await adminApi.list(entity.resource)
      setRows(data)
    } catch (err) {
      setError('Could not load data. Check the API connection.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [entityKey])

  // Most entities' primary key comes back as `id`. Chapter/Subchapter use
  // `chapter_id`/`subchapter_id` instead — entity.idKey covers that, and this
  // falls back to `.id` so nothing changes for entities that don't set it.
  function rowId(row) {
    return row[entity.idKey] ?? row.id
  }

  async function handleDelete(id) {
    if (!confirm('Delete this record?')) return
    await adminApi.remove(entity.resource, id)
    load()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold text-slate-800">{entity.label}</h1>
        <Link
          to={`/admin/${entityKey}/new`}
          className="bg-brand-500 hover:bg-brand-600 text-white text-sm px-3 py-2 rounded-md"
        >
          + Add {entity.label.replace(/s$/, '')}
        </Link>
      </div>

      {loading && <p className="text-slate-400">Loading…</p>}
      {error && <p className="text-red-600">{error}</p>}

      {!loading && !error && (
        <table className="w-full text-sm bg-white rounded-lg overflow-hidden shadow-sm">
          <thead className="bg-slate-100 text-left text-slate-500">
            <tr>
              {entity.columns.map((col) => (
                <th key={col.key} className="px-4 py-2">{col.label}</th>
              ))}
              <th className="px-4 py-2 w-24">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={rowId(row)} className="border-t border-slate-100">
                {entity.columns.map((col) => (
                  <td key={col.key} className="px-4 py-2">{String(row[col.key] ?? '')}</td>
                ))}
                <td className="px-4 py-2 space-x-2">
                  <Link to={`/admin/${entityKey}/${rowId(row)}`} className="text-brand-600 hover:underline">
                    Edit
                  </Link>
                  <button onClick={() => handleDelete(rowId(row))} className="text-red-600 hover:underline">
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-slate-400" colSpan={entity.columns.length + 1}>
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
