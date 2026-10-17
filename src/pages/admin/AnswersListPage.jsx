import { Fragment, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ChevronDown, ChevronRight, Download, Pencil, Plus, Trash2, Upload } from 'lucide-react'
import * as XLSX from 'xlsx'
import { adminApi } from '../../api/adminApi'
import MathText from '../../components/MathText'

const RESOURCE = 'answers'
const LABEL = 'Answers'

// Same list as the answer form. To add Kannada, add { code: 'kn', label: 'Kannada' } here
// (and in AnswersFormPage); the template gets a "Step (Kannada)" column automatically.
const LANGUAGES = [{ code: 'ta', label: 'Tamil' }]
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

const bySort = (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.question_id - b.question_id

const byExercise = (a, b) =>
  (a === '' ? 1 : 0) - (b === '' ? 1 : 0) || a.localeCompare(b, undefined, { numeric: true })

const STATUS_OPTIONS = [
  { value: 'all', label: 'All questions' },
  { value: 'answered', label: 'Answered' },
  { value: 'pending', label: 'Not answered' },
]

// Text of a step in the chosen language (falls back to English).
function stepText(step, lang) {
  if (lang === 'en') return step.step_text
  const t = (step.translations || []).find((x) => x.language_code === lang)
  return t?.step_text || step.step_text
}

// True when every step has a saved translation for this language.
const fullyTranslated = (answer, lang) =>
  (answer.steps || []).length > 0 &&
  answer.steps.every((s) => (s.translations || []).some((t) => t.language_code === lang && t.step_text))

export default function AnswersListPage() {
  const [params, setParams] = useSearchParams()
  const selectedChapterId = params.get('chapter') ? Number(params.get('chapter')) : null

  const [lov, setLov] = useState([])
  const [chapters, setChapters] = useState([])
  const [questions, setQuestions] = useState([])
  const [answers, setAnswers] = useState([])
  const [filters, setFilters] = useState({ board: '', cls: '', medium: '', subject: '' })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [pageSize, setPageSize] = useState(10)
  const [page, setPage] = useState(1)
  const [lang, setLang] = useState('en')
  const [open, setOpen] = useState({}) // answer_id -> steps expanded
  const [importing, setImporting] = useState(false)
  const [autoTranslate, setAutoTranslate] = useState(false)
  const showTamil = lang === 'ta'
  const titleOf = (row) => (showTamil && row.title_ta ? row.title_ta : row.title_en)

  async function loadAll() {
    setLoading(true)
    setError(null)
    try {
      const [l, c, q, a] = await Promise.all([
        adminApi.list('lov'),
        adminApi.list('chapters'),
        adminApi.list('questions'),
        adminApi.list(RESOURCE),
      ])
      setLov(l)
      setChapters(c)
      setQuestions(q)
      setAnswers(a)
    } catch (err) {
      setError('Could not load data. Check the API connection.')
    } finally {
      setLoading(false)
    }
  }

  async function loadAnswers() {
    try {
      setAnswers(await adminApi.list(RESOURCE))
    } catch (err) {
      setError('Could not load answers. Check the API connection.')
    }
  }

  useEffect(() => {
    loadAll()
  }, [])

  useEffect(() => {
    setPage(1)
  }, [search, status, pageSize])

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

  // question_id -> its answers
  const answersByQuestion = useMemo(() => {
    const map = {}
    answers.forEach((a) => {
      ;(map[a.question_id] ||= []).push(a)
    })
    return map
  }, [answers])

  // chapter_id -> { total questions, answered questions }
  const countByChapter = useMemo(() => {
    const map = {}
    questions.forEach((q) => {
      const c = (map[q.chapter_id] ||= { total: 0, done: 0 })
      c.total += 1
      if (answersByQuestion[q.question_id]?.length) c.done += 1
    })
    return map
  }, [questions, answersByQuestion])

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

  // All questions of the chapter grouped by exercise; a sub-question stays under its main question's exercise.
  const allRows = useMemo(() => {
    if (!selectedChapterId) return []

    const ordered = orderTree(questions.filter((q) => q.chapter_id === selectedChapterId).sort(bySort))
    let current = ''
    const withExercise = ordered.map((q) => {
      if (!q._depth) current = String(q.exercise_no ?? '').trim()
      return { ...q, _exercise: current, _answers: answersByQuestion[q.question_id] || [] }
    })

    const rank = new Map(
      [...new Set(withExercise.map((q) => q._exercise))].sort(byExercise).map((e, i) => [e, i])
    )
    withExercise.sort((a, b) => rank.get(a._exercise) - rank.get(b._exercise)) // stable sort

    return withExercise
  }, [questions, selectedChapterId, answersByQuestion])

  // The same list after the search box and the status filter.
  const rows = useMemo(() => {
    const term = search.trim().toLowerCase()
    return allRows.filter((q) => {
      if (status === 'answered' && !q._answers.length) return false
      if (status === 'pending' && q._answers.length) return false
      if (!term) return true
      return (
        [q.question_text, q.language_translation, q._exercise].some((v) =>
          String(v ?? '').toLowerCase().includes(term)
        ) || q._answers.some((a) => String(a.final_answer ?? '').toLowerCase().includes(term))
      )
    })
  }, [allRows, search, status])

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
    if (!confirm('Delete this answer?')) return
    setNotice(null)
    try {
      await adminApi.remove(RESOURCE, id)
    } catch (err) {
      setNotice({
        type: 'error',
        text: err.status === 403 ? 'You can delete only your own answers.' : 'Could not delete the answer.',
      })
    }
    loadAnswers()
  }

  // Template: one row per question of this chapter (all of them, not just the filtered ones).
  // The teacher types the step in the "Step" column; to add more steps for the same question,
  // copy the row (keep the Question ID) and type the next step. Steps are numbered in row order.
  function downloadTemplate() {
    if (!chapter) return
    const header = ['Question ID', 'Exercise', 'Question (for reference)', 'Step', ...LANGUAGES.map((l) => `Step (${l.label})`)]
    const data = allRows.map((q) => [
      q.question_id,
      q._exercise,
      q.question_text,
      '',
      ...LANGUAGES.map(() => ''),
    ])
    const ws = XLSX.utils.aoa_to_sheet([header, ...data])
    ws['!cols'] = [{ wch: 12 }, { wch: 10 }, { wch: 60 }, { wch: 60 }, ...LANGUAGES.map(() => ({ wch: 60 }))]

    const help = XLSX.utils.aoa_to_sheet([
      ['How to fill this file'],
      ['1. Type each solution step in the "Step" column, in English.'],
      ['2. For a second step of the same question, copy that row (keep the Question ID) and type the next step. Steps are numbered in row order.'],
      ['3. The Tamil column is optional. Leave it empty to translate later, or tick "Translate empty Tamil" when importing.'],
      ['4. Do not change the Question ID column. Rows without a step are ignored.'],
      ['5. Write formulas between dollar signs, like $x^2-5x+6$.'],
    ])
    help['!cols'] = [{ wch: 110 }]

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Steps')
    XLSX.utils.book_append_sheet(wb, help, 'Help')
    XLSX.writeFile(wb, `answers-template-ch${chapter.chapter_no}.xlsx`)
  }

  async function handleImportFile(e) {
    const file = e.target.files?.[0]
    e.target.value = '' // lets the same file be picked again later
    if (!file || !selectedChapterId || !chapter) return
    setNotice(null)

    let items = []
    try {
      const wb = XLSX.read(await file.arrayBuffer())
      const raw = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '', raw: false })
      items = raw
        .map((r, i) => {
          const get = (name) => {
            const key = Object.keys(r).find((k) => k.trim().toLowerCase() === name.toLowerCase())
            return key ? String(r[key]).trim() : ''
          }
          const translations = {}
          LANGUAGES.forEach((l) => {
            translations[l.code] = get(`Step (${l.label})`)
          })
          return {
            row: i + 2, // row 1 is the header
            question_id: Number(get('Question ID')) || null,
            step_text: get('Step'),
            translations,
          }
        })
        .filter((it) => it.step_text || Object.values(it.translations).some(Boolean))
    } catch (err) {
      setNotice({ type: 'error', text: 'Could not read that file. Use an .xlsx file made from the template.' })
      return
    }

    if (!items.length) {
      setNotice({ type: 'error', text: 'No steps found. Fill the "Step" column of the template.' })
      return
    }
    const questionCount = new Set(items.map((it) => it.question_id)).size
    if (!confirm(`Import ${items.length} steps for ${questionCount} questions into "${titleOf(chapter)}"?`)) return

    setImporting(true)
    try {
      const result = await adminApi.create('answers/bulk', {
        chapter_id: chapter.chapter_id,
        auto_translate: autoTranslate,
        items,
      })
      const skipped = result.errors || []
      setNotice({
        type: skipped.length ? 'warn' : 'ok',
        text:
          `${result.created} answers imported.` +
          (skipped.length
            ? ` ${skipped.length} skipped — ` +
              skipped
                .slice(0, 5)
                .map((s) => `row ${s.row}: ${s.reason}`)
                .join('; ') +
              (skipped.length > 5 ? '…' : '')
            : ''),
      })
      loadAnswers()
    } catch (err) {
      const detail = err?.response?.data?.detail || err?.message
      setNotice({ type: 'error', text: `Import failed. Nothing was saved.${detail ? ` (${detail})` : ''}` })
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
          {/* Left: language, board, class, subject, then the chapters */}
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
              <div className="text-xs text-slate-400 mb-2">Chapters (answered / questions)</div>
              {!filtersReady && <p className="text-sm text-slate-400">Choose board, class and subject.</p>}
              {filtersReady && treeChapters.length === 0 && (
                <p className="text-sm text-slate-400">No chapters for this selection.</p>
              )}

              {treeChapters.map((c) => {
                const n = countByChapter[c.chapter_id] || { total: 0, done: 0 }
                return (
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
                    <span className="text-xs text-slate-400 shrink-0">
                      {n.done}/{n.total}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Right: every question of the selected chapter with its answers */}
          <div className="min-w-0">
            {!chapter ? (
              <div className="bg-white rounded-lg shadow-sm p-6 text-sm text-slate-400">
                Select a chapter on the left to see its questions and answers.
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
                    <label className="inline-flex items-center gap-1 text-xs text-slate-500 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={autoTranslate}
                        onChange={(e) => setAutoTranslate(e.target.checked)}
                      />
                      Translate empty Tamil on import (slower)
                    </label>
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
                  </div>
                </div>

                {notice && (
                  <div className={`mb-3 text-sm border rounded-md px-3 py-2 ${noticeStyle[notice.type]}`}>
                    {notice.text}
                  </div>
                )}

                <div className="mb-3 flex items-center gap-2 flex-wrap">
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search question, answer or exercise number…"
                    className="w-full max-w-xs border border-slate-300 rounded-md px-3 py-2 text-sm bg-white"
                  />
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="border border-slate-300 rounded-md px-2 py-2 text-sm bg-white"
                  >
                    {STATUS_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(e.target.value === 'All' ? 'All' : Number(e.target.value))}
                    className="border border-slate-300 rounded-md px-2 py-2 text-sm bg-white"
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
                      <th className="px-4 py-2">Question and answer</th>
                      <th className="px-4 py-2 w-28">Actions</th>
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
                              <MathText text={showTamil && row.language_translation ? row.language_translation : row.question_text} />

                              {row._answers.length === 0 && (
                                <div className="mt-1">
                                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                                    Not answered
                                  </span>
                                </div>
                              )}

                              {row._answers.map((a) => (
                                <div key={a.answer_id} className="mt-2 border-l-2 border-green-300 pl-3">
                                  <div className="flex items-start gap-2 flex-wrap">
                                    <button
                                      type="button"
                                      onClick={() => setOpen((o) => ({ ...o, [a.answer_id]: !o[a.answer_id] }))}
                                      className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700"
                                      title="Show steps"
                                    >
                                      {open[a.answer_id] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                      {a.step_count ?? a.steps?.length ?? 0} steps
                                    </button>
                                    {a.final_answer && (
                                      <span className="text-slate-700">
                                        Final answer: <MathText text={a.final_answer} />
                                      </span>
                                    )}
                                    {fullyTranslated(a, 'ta') ? (
                                      <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">
                                        Tamil ✓
                                      </span>
                                    ) : (
                                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-50 text-slate-500 border border-slate-200">
                                        Tamil missing
                                      </span>
                                    )}
                                    <span className="ml-auto whitespace-nowrap space-x-2">
                                      <Link
                                        to={`/admin/answers/${a.answer_id}`}
                                        className="inline-flex items-center text-brand-600 hover:text-brand-700"
                                        title="Edit answer"
                                      >
                                        <Pencil size={15} />
                                      </Link>
                                      <button
                                        onClick={() => handleDelete(a.answer_id)}
                                        className="inline-flex items-center text-red-600 hover:text-red-700"
                                        title="Delete answer"
                                      >
                                        <Trash2 size={15} />
                                      </button>
                                    </span>
                                  </div>

                                  {open[a.answer_id] && (
                                    <ol className="mt-2 space-y-1 text-slate-600 list-decimal list-inside">
                                      {[...(a.steps || [])]
                                        .sort((x, y) => x.step_no - y.step_no)
                                        .map((s) => (
                                          <li key={s.step_no}>
                                            <MathText text={stepText(s, lang)} />
                                          </li>
                                        ))}
                                    </ol>
                                  )}
                                </div>
                              ))}
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap">
                              <Link
                                to={`/admin/answers/new?question_id=${row.question_id}`}
                                className="inline-flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700"
                                title="Add an answer for this question"
                              >
                                <Plus size={14} /> {row._answers.length ? 'Another' : 'Add'}
                              </Link>
                            </td>
                          </tr>
                        </Fragment>
                      )
                    })}
                    {pagedRows.length === 0 && (
                      <tr>
                        <td className="px-4 py-6 text-slate-400" colSpan={3}>
                          {search || status !== 'all'
                            ? 'No matching questions.'
                            : 'No questions in this chapter yet.'}
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
