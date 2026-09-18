 
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { adminApi } from '../../api/adminApi'
import { Pencil, Trash2 } from 'lucide-react'

const RESOURCE = 'user-roles' // matches backend prefix /admin/user-roles
const LABEL = 'User Roles'
const PAGE_SIZE_OPTIONS = [10, 25, 100, 500, 'All']
const COLUMNS = [
  { key: 'code', label: 'Code' },
  { key: 'name', label: 'Name' },
]

export default function RolesListPage() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [pageSize, setPageSize] = useState(10)
  const [page, setPage] = useState(1)

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

  useEffect(() => {
    setPage(1)
  }, [search])

  async function handleDelete(id) {
    if (!confirm('Delete this record?')) return
    await adminApi.remove(RESOURCE, id)
    load()
  }

  function renderCell(row, col) {
    return String(row[col.key] ?? '')
  }

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return rows
    return rows.filter((row) =>
      COLUMNS.some((col) => renderCell(row, col).toLowerCase().includes(term))
    )
  }, [rows, search])

  const totalPages = pageSize === 'All' ? 1 : Math.max(1, Math.ceil(filteredRows.length / pageSize))
  const pagedRows = pageSize === 'All' ? filteredRows : filteredRows.slice((page - 1) * pageSize, page * pageSize)

  return (
    <div>
      <div className="sticky top-0 z-20 bg-slate-50 pb-4 pt-1 -mt-2">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-semibold text-slate-800">{LABEL}</h1>
          <Link
            to="/admin/roles/new"
            className="bg-brand-500 hover:bg-brand-600 text-white text-sm px-3 py-2 rounded-md"
          >
            + Add Role
          </Link>
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search roles…"
          className="w-full max-w-xs border border-slate-300 rounded-md px-3 py-2 text-sm bg-white"
        />
        <select
          value={pageSize}
          onChange={(e) => setPageSize(e.target.value === 'All' ? 'All' : Number(e.target.value))}
          className="border border-slate-300 rounded-md px-2 py-2 text-sm bg-white ml-2"
        >
          {PAGE_SIZE_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt === 'All' ? 'All' : `${opt} / page`}
            </option>
          ))}
        </select>
      </div>

      {loading && <p className="text-slate-400">Loading…</p>}
      {error && <p className="text-red-600">{error}</p>}

      {!loading && !error && (
        <>
          <table className="w-full text-sm bg-white rounded-lg shadow-sm">
            <thead className="bg-slate-100 text-left text-slate-500 sticky top-[104px] z-10">
              <tr>
                {COLUMNS.map((col) => (
                  <th key={col.key} className="px-4 py-2">{col.label}</th>
                ))}
                <th className="px-4 py-2 w-24">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pagedRows.map((row) => (
                <tr key={row.id} className="border-t border-slate-100">
                  {COLUMNS.map((col) => (
                    <td key={col.key} className="px-4 py-2">{renderCell(row, col)}</td>
                  ))}
                  <td className="px-4 py-2 space-x-2">
                    <Link
                      to={`/admin/roles/${row.id}`}
                      className="inline-flex items-center text-brand-600 hover:text-brand-700"
                      title="Edit"
                    >
                      <Pencil size={16} />
                    </Link>
                    <button
                      onClick={() => handleDelete(row.id)}
                      className="inline-flex items-center text-red-600 hover:text-red-700"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {pagedRows.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-slate-400" colSpan={COLUMNS.length + 1}>
                    {search ? 'No matching records.' : 'No records yet.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <span className="text-sm text-slate-500">
                Page {page} of {totalPages} ({filteredRows.length} total)
              </span>
              <div className="flex gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 text-sm rounded-md border border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100"
                >
                  Prev
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`px-3 py-1 text-sm rounded-md border ${
                      p === page
                        ? 'bg-brand-500 text-white border-brand-500'
                        : 'border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1 text-sm rounded-md border border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}