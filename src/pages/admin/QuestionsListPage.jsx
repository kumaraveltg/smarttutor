import { Fragment, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Download, Pencil, Trash2, Upload } from 'lucide-react'
import * as XLSX from 'xlsx'
import { adminApi } from '../../api/adminApi'
import { useAuth } from '../../auth/AuthContext'
import MathText from '../../components/MathText'

const RESOURCE = 'questions'
const LABEL = 'Questions'
const PAGE_SIZE_OPTIONS = [10, 25, 100, 'All']

// Syllabus order: sort_order first, then the number (1, 2, 10 — not 1, 10, 2).
const byOrder = (a, b) =>
  (a.sort_order ?? 0) - (b.sort_order ?? 0) ||
  String(a.chapter_no ?? '').localeCompare(String(b.chapter_no ?? ''), undefined, { numeric: true })

// Puts each sub-question straight after its parent and records how deep it is.
function orderTree(list) {
  const kids = {}
  list.forEach((q) => {
    ;(kids[q.parent_id ?? 0] ||= []).push(q)
  })
  const out = []
  const walk = (parentId, depth) =>
    (kids[parentId] || []).forEach((q) => {
      out.push({ ...q, _depth: depth })
      walk(q.question_id, depth + 1)
    })
  walk(0, 0)
  return out.length === list.length ? out : list
}

// Exercise numbers in book order (1, 2, 10 — not 1, 10, 2); questions without one go last.
// Position inside an exercise: sort order first, then the order they were entered.
const bySort = (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.question_id - b.question_id

const byExercise = (a, b) =>
  (a === '' ? 1 : 0) - (b === '' ? 1 : 0) || a.localeCompare(b, undefined, { numeric: true })

export default function QuestionsListPage() {
  const { user: currentUser } = useAuth()
  const [params, setParams] = useSearchParams()
  const selectedChapterId = params.get('chapter') ? Number(params.get('chapter')) : null

  const [lov, setLov] = useState([])
  const [chapters, setChapters] = useState([])
  const [questions, setQuestions] = useState([])
  const [filters, setFilters] = useState({ board: '', cls: '', medium: '', subject: '' })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)
  const [importing, setImporting] = useState(false)
  const [search, setSearch] = useState('')
  const [pageSize, setPageSize] = useState(10)
  const [page, setPage] = useState(1)
  const [lang, setLang] = useState('en')
  const showTamil = lang === 'ta'
  const titleOf = (row) => (showTamil && row.title_ta ? row.title_ta : row.title_en)

  async function loadAll() {
    setLoading(true)
    setError(null)
    try {
      const [l, c, q] = await Promise.all([
        adminApi.list('lov'),
        adminApi.list('chapters'),
        adminApi.list(RESOURCE),
      ])
      setLov(l)
      setChapters(c)
      setQuestions(q)
    } catch (err) {
      setError('Could not load data. Check the API connection.')
    } finally {
      setLoading(false)
    }
  }

  async function loadQuestions() {
    try {
      setQuestions(await adminApi.list(RESOURCE))
    } catch (err) {
      setError('Could not load questions. Check the API connection.')
    }
  }

  useEffect(() => {
    loadAll()
  }, [])

  useEffect(() => {
    setPage(1)
  }, [search, pageSize])

  // Coming back from the form (?chapter=12): restore the filters so the chapter is visible.
  useEffect(() => {
    if (!selectedChapterId || !chapters.length) return
    const chapter = chapters.find((c) => c.chapter_id === selectedChapterId)
    if (!chapter) return
    setFilters((f) =>
      f.board
        ? f
        : {
            board: String(chapter.board_lov_id),
            cls: String(chapter.class_lov_id),
            medium: String(chapter.medium_lov_id),
            subject: String(chapter.subject_lov_id),
          }
    )
  }, [selectedChapterId, chapters])

  const lovOptions = (type) => lov.filter((r) => r.type === type)
  const filtersReady = filters.board && filters.cls && filters.subject

  const treeChapters = useMemo(() => {
    if (!filtersReady) return []
    return chapters
      .filter(
        (c) =>
          String(c.board_lov_id) === filters.board &&
          String(c.class_lov_id) === filters.cls &&
          String(c.subject_lov_id) === filters.subject
      )
      .sort(byOrder)
  }, [chapters, filters, filtersReady])

  const countByChapter = useMemo(() => {
    const map = {}
    questions.forEach((q) => {
      map[q.chapter_id] = (map[q.chapter_id] || 0) + 1
    })
    return map
  }, [questions])

  const chapter = chapters.find((c) => c.chapter_id === selectedChapterId)

  function setFilter(key, val) {
    setFilters((f) => ({ ...f, [key]: val }))
    setParams({})
    setSearch('')
  }

  function selectChapter(id) {
    setParams({ chapter: String(id) })
    setSearch('')
    setNotice(null)
  }

  // All questions of the chapter, grouped by exercise number.
  // A sub-question stays under the exercise of its main question.
  const rows = useMemo(() => {
    if (!selectedChapterId) return []

    const ordered = orderTree(questions.filter((q) => q.chapter_id === selectedChapterId).sort(bySort))
    let current = ''
    const withExercise = ordered.map((q) => {
      if (!q._depth) current = String(q.exercise_no ?? '').trim()
      return { ...q, _exercise: current }
    })

    const rank = new Map(
      [...new Set(withExercise.map((q) => q._exercise))].sort(byExercise).map((e, i) => [e, i])
    )
    withExercise.sort((a, b) => rank.get(a._exercise) - rank.get(b._exercise)) // stable sort

    const term = search.trim().toLowerCase()
    if (!term) return withExercise
    return withExercise.filter((q) =>
      [q.question_text, q.language_translation, q._exercise].some((v) =>
        String(v ?? '').toLowerCase().includes(term)
      )
    )
  }, [questions, selectedChapterId, search])

  const countByExercise = useMemo(() => {
    const map = {}
    rows.forEach((q) => {
      map[q._exercise] = (map[q._exercise] || 0) + 1
    })
    return map
  }, [rows])

  const totalPages = pageSize === 'All' ? 1 : Math.max(1, Math.ceil(rows.length / pageSize))
  const pagedRows = pageSize === 'All' ? rows : rows.slice((page - 1) * pageSize, page * pageSize)

  async function handleDelete(id) {
    if (!confirm('Delete this question?')) return
    setNotice(null)
    try {
      await adminApi.remove(RESOURCE, id)
    } catch (err) {
      setNotice({
        type: 'error',
        text: err.status === 409 ? 'Delete its sub-questions and answers first.' : 'Could not delete the question.',
      })
    }
    loadQuestions()
  }

  function downloadTemplate() {
    const ws = XLSX.utils.aoa_to_sheet([
      ['Question', 'Translation', 'Exercise'],
      ['Find the HCF of 135 and 225. Write formulas between dollar signs, like $x^2-5x+6$.', '', '1.6'],
    ])
    ws['!cols'] = [{ wch: 80 }, { wch: 80 }, { wch: 12 }]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Questions')
    XLSX.writeFile(wb, 'questions-template.xlsx')
  }

  async function handleImportFile(e) {
    const file = e.target.files?.[0]
    e.target.value = '' // lets the same file be picked again later
    if (!file || !selectedChapterId || !chapter) return
    setNotice(null)

    let items = []
    try {
      const wb = XLSX.read(await file.arrayBuffer())
      const raw = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' })
      items = raw
        .map((r, i) => {
          const get = (name) => {
            const key = Object.keys(r).find((k) => k.trim().toLowerCase() === name)
            return key ? String(r[key]).trim() : ''
          }
          return {
            row: i + 2, // row 1 is the header
            question_text: get('question'),
            language_translation: get('translation') || null,
            exercise_no: get('exercise') || null,
          }
        })
        .filter((it) => it.question_text || it.language_translation)
    } catch (err) {
      setNotice({ type: 'error', text: 'Could not read that file. Use an .xlsx file made from the template.' })
      return
    }

    if (!items.length) {
      setNotice({ type: 'error', text: 'No questions found. The columns must be Question, Translation and Exercise.' })
      return
    }
    if (!confirm(`Import ${items.length} questions into "${titleOf(chapter)}"?`)) return

    setImporting(true)
    try {
      const result = await adminApi.create(
        'questions/bulk',
        {
          chapter_id: chapter.chapter_id,
          subchapter_id: null,
          class_id: chapter.class_lov_id,
          subject_id: chapter.subject_lov_id,
          medium_id: chapter.medium_lov_id,
          items,
          modified_by: currentUser?.username,
        },
        currentUser?.username
      )
      const skipped = result.errors || []
      setNotice({
        type: skipped.length ? 'warn' : 'ok',
        text:
          `${result.created} questions imported.` +
          (skipped.length
            ? ` ${skipped.length} skipped — ` +
              skipped
                .slice(0, 5)
                .map((s) => `row ${s.row}: ${s.reason}`)
                .join('; ') +
              (skipped.length > 5 ? '…' : '')
            : ''),
      })
      loadQuestions()
    } catch (err) {
      setNotice({ type: 'error', text: 'Import failed. Nothing was saved. Check the file and try again.' })
    } finally {
      setImporting(false)
    }
  }

  function renderSelect(label, key, type) {
    return (
      <div>
        <label className="block text-xs text-slate-500 mb-1">{label}</label>
        <select
          className="w-full border border-slate-300 rounded-md px-2 py-1.5 text-sm bg-white"
          value={filters[key]}
          onChange={(e) => setFilter(key, e.target.value)}
        >
          <option value="">Select…</option>
          {lovOptions(type).map((opt) => (
            <option key={opt.lov_id} value={String(opt.lov_id)}>
              {opt.value}
            </option>
          ))}
        </select>
      </div>
    )
  }

  const noticeStyle = {
    ok: 'bg-green-50 text-green-800 border-green-200',
    warn: 'bg-amber-50 text-amber-800 border-amber-200',
    error: 'bg-red-50 text-red-700 border-red-200',
  }

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-800 mb-4">{LABEL}</h1>

      {loading && <p className="text-slate-400">Loading…</p>}
      {error && <p className="text-red-600">{error}</p>}

      {!loading && !error && (
        <div className="grid grid-cols-1 lg:grid-cols-[18rem_minmax(0,1fr)] gap-4 items-start">
          {/* Left: board, class, subject, then the chapters */}
          <div className="bg-white rounded-lg shadow-sm p-4 space-y-3 lg:sticky lg:top-2">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Language</label>
              <select
                className="w-full border border-slate-300 rounded-md px-2 py-1.5 text-sm bg-white"
                value={lang}
                onChange={(e) => setLang(e.target.value)}
              >
                <option value="en">English</option>
                <option value="ta">Tamil</option>
              </select>
            </div>
            {renderSelect('Board', 'board', 'Board of Category')}
            {renderSelect('Class', 'cls', 'School')}
            {renderSelect('Subject', 'subject', 'Subject')}

            <div className="border-t border-slate-100 pt-3">
              <div className="text-xs text-slate-400 mb-2">Chapters</div>
              {!filtersReady && <p className="text-sm text-slate-400">Choose board, class and subject.</p>}
              {filtersReady && treeChapters.length === 0 && (
                <p className="text-sm text-slate-400">No chapters for this selection.</p>
              )}

              {treeChapters.map((c) => (
                <button
                  key={c.chapter_id}
                  type="button"
                  onClick={() => selectChapter(c.chapter_id)}
                  className={`w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-md text-sm text-left ${
                    c.chapter_id === selectedChapterId
                      ? 'bg-brand-50 text-brand-700'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span className="min-w-0 break-words">
                    {c.chapter_no}. {titleOf(c)}
                  </span>
                  <span className="text-xs text-slate-400 shrink-0">{countByChapter[c.chapter_id] || 0}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Right: all questions of the selected chapter, grouped by exercise number */}
          <div className="min-w-0">
            {!chapter ? (
              <div className="bg-white rounded-lg shadow-sm p-6 text-sm text-slate-400">
                Select a chapter on the left to see its questions.
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="text-lg font-semibold text-slate-800 break-words">
                      {chapter.chapter_no}. {titleOf(chapter)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={downloadTemplate}
                      className="inline-flex items-center gap-1 text-sm px-3 py-2 rounded-md border border-slate-300 text-slate-600 hover:bg-slate-100"
                    >
                      <Download size={14} /> Template
                    </button>
                    <label
                      className={`inline-flex items-center gap-1 text-sm px-3 py-2 rounded-md border border-slate-300 text-slate-600 hover:bg-slate-100 cursor-pointer ${
                        importing ? 'opacity-50 pointer-events-none' : ''
                      }`}
                    >
                      <Upload size={14} /> {importing ? 'Importing…' : 'Import Excel'}
                      <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImportFile} />
                    </label>
                    <Link
                      to={`/admin/questions/new?chapter=${selectedChapterId}`}
                      className="bg-brand-500 hover:bg-brand-600 text-white text-sm px-3 py-2 rounded-md"
                    >
                      + Add Question
                    </Link>
                  </div>
                </div>

                {notice && (
                  <div className={`mb-3 text-sm border rounded-md px-3 py-2 ${noticeStyle[notice.type]}`}>
                    {notice.text}
                  </div>
                )}

                <div className="mb-3">
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search questions or exercise number…"
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

                <table className="w-full text-sm bg-white rounded-lg shadow-sm">
                  <thead className="bg-slate-100 text-left text-slate-500">
                    <tr>
                      <th className="px-4 py-2 w-12">#</th>
                      <th className="px-4 py-2">Question</th>
                      <th className="px-4 py-2 w-24">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedRows.map((row, i) => {
                      const startsGroup = i === 0 || pagedRows[i - 1]._exercise !== row._exercise
                      return (
                        <Fragment key={row.question_id}>
                          {startsGroup && (
                            <tr className="border-t border-slate-200 bg-slate-50">
                              <td colSpan={3} className="px-4 py-1.5 text-sm font-medium text-slate-700">
                                {row._exercise ? `Exercise ${row._exercise}` : 'No exercise number'}
                                <span className="ml-2 text-xs font-normal text-slate-400">
                                  {countByExercise[row._exercise] || 0} questions
                                </span>
                              </td>
                            </tr>
                          )}
                          <tr className="border-t border-slate-100 align-top">
                            <td className="px-4 py-2 text-slate-400">
                              {(pageSize === 'All' ? 0 : (page - 1) * pageSize) + i + 1}
                            </td>
                            <td
                              className="py-2 pr-4 min-w-0"
                              style={{ paddingLeft: `${16 + (row._depth ?? 0) * 20}px` }}
                            >
                              {row.parent_id ? <span className="text-slate-400">↳ </span> : null}
                              <MathText text={row.question_text} />
                              {row.language_translation && (
                                <div className="text-slate-500 mt-1">
                                  <MathText text={row.language_translation} />
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-2 space-x-2 whitespace-nowrap">
                              <Link
                                to={`/admin/questions/${row.question_id}`}
                                className="inline-flex items-center text-brand-600 hover:text-brand-700"
                                title="Edit"
                              >
                                <Pencil size={16} />
                              </Link>
                              <button
                                onClick={() => handleDelete(row.question_id)}
                                className="inline-flex items-center text-red-600 hover:text-red-700"
                                title="Delete"
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        </Fragment>
                      )
                    })}
                    {pagedRows.length === 0 && (
                      <tr>
                        <td className="px-4 py-6 text-slate-400" colSpan={3}>
                          {search ? 'No matching questions.' : 'No questions yet. Add one or import an Excel file.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>

                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <span className="text-sm text-slate-500">
                      Page {page} of {totalPages} ({rows.length} total)
                    </span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="px-3 py-1 text-sm rounded-md border border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100"
                      >
                        Prev
                      </button>
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
        </div>
      )}
    </div>
  )
}
