import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { adminApi } from '../../api/adminApi'

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100]

export default function CrudTable({ entityKey, entity }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // NEW: search + pagination state
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

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

  // NEW: jump back to page 1 when the search term or entity changes,
  // so filtering never strands you on a now-empty page.
  useEffect(() => {
    setPage(1)
  }, [search, entityKey])

  function rowId(row) {
    return row[entity.idKey] ?? row.id
  }

  async function handleDelete(id) {
    if (!confirm('Delete this record?')) return
    await adminApi.remove(entity.resource, id)
    load()
  }

  // NEW: case-insensitive filter across every visible column.
  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows
    const term = search.trim().toLowerCase()
    return rows.filter((row) =>
      entity.columns.some((col) => String(row[col.key] ?? '').toLowerCase().includes(term))
    )
  }, [rows, search, entity.columns])

  // NEW: slice filtered rows down to the current page.
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize))
  const pagedRows = filteredRows.slice((page - 1) * pageSize, page * pageSize)

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

      {/* NEW: search box + page-size selector */}
      <div className="flex items-center justify-between mb-3 gap-3">
        <input
          type="text"
          placeholder={`Search ${entity.label.toLowerCase()}…`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-slate-300 rounded-md px-3 py-1.5 text-sm w-64"
        />
        <label className="text-sm text-slate-500 flex items-center gap-2">
          Show
          <select
            value={pageSize}
            onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1) }}
            className="border border-slate-300 rounded-md px-2 py-1 text-sm"
          >
            {PAGE_SIZE_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
          per page
        </label>
      </div>

      {loading && <p className="text-slate-400">Loading…</p>}
      {error && <p className="text-red-600">{error}</p>}

      {!loading && !error && (
        <>
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
              {pagedRows.map((row) => (
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
              {pagedRows.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-slate-400" colSpan={entity.columns.length + 1}>
                    {search ? 'No matching records.' : 'No records yet.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* NEW: pagination controls */}
          <div className="flex items-center justify-between mt-3 text-sm text-slate-500">
            <span>{filteredRows.length} record{filteredRows.length !== 1 ? 's' : ''}</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-2 py-1 rounded-md border border-slate-300 disabled:opacity-40"
              >
                Prev
              </button>
              <span>Page {page} of {totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-2 py-1 rounded-md border border-slate-300 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}