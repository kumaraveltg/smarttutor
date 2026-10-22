import { Fragment, useEffect, useMemo, useState } from 'react'
import { practiceApi } from '../../api/practiceApi'
import { studentApi } from '../../api/studentApi'
import { useAuth } from '../../auth/AuthContext'
import MathInput from '../../components/practice/MathInput'
import MathText from '../../components/MathText'

// ---- same ordering helpers as QuestionsListPage ----
const bySort = (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.question_id - b.question_id

const byExercise = (a, b) =>
  (a === '' ? 1 : 0) - (b === '' ? 1 : 0) || a.localeCompare(b, undefined, { numeric: true })

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

export default function ChatPage() {
  const { user } = useAuth()

  // ---------- question tree (chapters on the left, questions on the right) ----------
  const [info, setInfo] = useState(null) // { class_name, board_name, medium_name, language }
  const [subjects, setSubjects] = useState([])
  const [subjectId, setSubjectId] = useState(null)
  const [chapters, setChapters] = useState([])
  const [chapterId, setChapterId] = useState(null)
  const [questions, setQuestions] = useState([])
  const [listLoading, setListLoading] = useState(true)
  const [listError, setListError] = useState(null)
  const [practising, setPractising] = useState(false)
  const [currentRow, setCurrentRow] = useState(null)
  const [doneIds, setDoneIds] = useState(() => new Set())

  const showTamil = info?.language === 'ta'
  const titleOf = (row) => (showTamil && row.title_ta ? row.title_ta : row.title_en)
  const textOf = (row) => (showTamil && row.language_translation ? row.language_translation : row.question_text)

  // ---------- practice (your original state, unchanged) ----------
  const [question, setQuestion] = useState(null)
  // step: { text, status: 'editing'|'checking'|'correct'|'incorrect',
  //         hint: string|null,       <- a real suggestion, safe to insert
  //         hintError: string|null } <- a fetch failure message, DISPLAY ONLY,
  //                                      never offered as something to insert
  const [steps, setSteps] = useState([])
  const [methodId, setMethodId] = useState(null)
  const [complete, setComplete] = useState(false)
  const [advancing, setAdvancing] = useState(false)
  const [mathMode, setMathMode] = useState(false)

  const activeIndex = complete ? -1 : steps.length - 1
  const activeStep = activeIndex >= 0 ? steps[activeIndex] : null

  function applyQuestion(q, mocked = false) {
    setQuestion({ ...q, mocked })
    setSteps([{ text: '', status: 'editing', hint: null, hintError: null }])
    setMethodId(null)
    setComplete(false)
  }

  // ---------- load the student's chapters (class / board / medium / subjects come from registration) ----------
  function loadChapters(subjId) {
    setListLoading(true)
    setListError(null)
    studentApi
      .practiceChapters(subjId)
      .then((d) => {
        setInfo(d.info)
        setSubjects(d.subjects)
        setSubjectId(d.subject_id)
        setChapters(d.chapters)
        setChapterId(null)
        setQuestions([])
        setPractising(false)
      })
      .catch(() => setListError('Could not load your chapters. Check the API connection.'))
      .finally(() => setListLoading(false))
  }

  useEffect(() => {
    loadChapters(null)
  }, [])

  function selectChapter(id) {
    setChapterId(id)
    setPractising(false)
    setQuestions([])
    setListError(null)
    studentApi
      .practiceQuestions(id)
      .then(setQuestions)
      .catch(() => setListError('Could not load the questions. Check the API connection.'))
  }

  const chapter = chapters.find((c) => c.chapter_id === chapterId)

  // All questions of the chapter grouped by exercise number (same logic as the admin list).
  const rows = useMemo(() => {
    const ordered = orderTree([...questions].sort(bySort))
    let current = ''
    const withExercise = ordered.map((q) => {
      if (!q._depth) current = String(q.exercise_no ?? '').trim()
      return { ...q, _exercise: current }
    })
    const rank = new Map(
      [...new Set(withExercise.map((q) => q._exercise))].sort(byExercise).map((e, i) => [e, i])
    )
    withExercise.sort((a, b) => rank.get(a._exercise) - rank.get(b._exercise)) // stable sort
    return withExercise
  }, [questions])

  const countByExercise = useMemo(() => {
    const map = {}
    rows.forEach((q) => {
      map[q._exercise] = (map[q._exercise] || 0) + 1
    })
    return map
  }, [rows])

  const currentIndex = currentRow ? rows.findIndex((r) => r.question_id === currentRow.question_id) : -1
  const nextRow = currentIndex >= 0 ? rows[currentIndex + 1] : null

  // Start practising a question from the list.
  async function openQuestion(row) {
    setCurrentRow(row)
    setPractising(true)
    setQuestion(null)
    let q = {}
    let mocked = false
    try {
      q = await practiceApi.getQuestion(row.question_id)
    } catch (err) {
      mocked = true // API not reachable — still practise with the text from the list
    }
    applyQuestion({ ...q, id: row.question_id, body: textOf(row) }, mocked)
  }

  function backToList() {
    const vk = window.mathVirtualKeyboard
    if (vk) vk.visible = false
    setPractising(false)
  }

  // ---------- practice functions (your original code) ----------
  function updateStepText(index, text) {
    // Typing further clears any pending hint/error for that line.
    setSteps((prev) => prev.map((st, i) => (i === index ? { ...st, text, hint: null, hintError: null } : st)))
  }

  async function checkStepAt(index) {
    const step = steps[index]
    if (!step || !step.text.trim() || step.status === 'checking' || !question) return

    setSteps((prev) => prev.map((st, i) => (i === index ? { ...st, status: 'checking' } : st)))

    let result = null
    try {
      result = await practiceApi.checkStep(question.id, index + 1, step.text.trim(), methodId, user?.id)
      if (result.method_id && !methodId) setMethodId(result.method_id)
    } catch (err) {
      result = null // couldn't reach the backend — still let the student keep writing
    }

    const isCorrect = !!result?.correct
    const isComplete = isCorrect && !!result?.complete

    const updated = steps.map((st, i) =>
      i === index
        ? { ...st, status: isCorrect ? 'correct' : 'incorrect', hint: null, hintError: null, enteredWithMath: mathMode }
        : st
    )

    if (isComplete) {
      setComplete(true)
      setSteps(updated)
      setDoneIds((prev) => new Set(prev).add(question.id)) // tick it in the question list
    } else if (index === steps.length - 1) {
      // Always open the next line, correct or not — writing continues like
      // a notebook. Wrong steps stay marked ✗ and can be fixed later via Edit.
      setSteps([...updated, { text: '', status: 'editing', hint: null, hintError: null }])
    } else {
      setSteps(updated)
    }
  }

  function editStepAt(index) {
    // Going back to change an earlier step invalidates every step built on
    // top of it, so those get cleared — the student re-answers from here.
    setSteps((prev) =>
      prev.slice(0, index + 1).map((st, i) => (i === index ? { ...st, status: 'editing', hint: null, hintError: null } : st))
    )
    setComplete(false)
  }

  async function requestHint() {
    if (activeIndex < 0 || !question) return
    try {
      const result = await practiceApi.getHint(question.id, activeIndex + 1, methodId, user?.id)
      const hintText = result.hint || "Here's a hint."
      setSteps((prev) => prev.map((st, i) => (i === activeIndex ? { ...st, hint: hintText, hintError: null } : st)))
    } catch (err) {
      // IMPORTANT: the failure message goes in hintError, never in hint —
      // hint is treated as safe-to-insert text, hintError is display-only.
      setSteps((prev) =>
        prev.map((st, i) =>
          i === activeIndex ? { ...st, hint: null, hintError: 'Could not fetch a hint right now.' } : st
        )
      )
    }
  }

  function acceptHint() {
    if (!activeStep?.hint) return
    setSteps((prev) => prev.map((st, i) => (i === activeIndex ? { ...st, text: st.hint, hint: null } : st)))
  }

  // Submit goes to the next question of the chapter, or back to the list after the last one.
  async function handleSubmit() {
    if (!nextRow) {
      backToList()
      return
    }
    setAdvancing(true)
    try {
      await openQuestion(nextRow)
    } finally {
      setAdvancing(false)
    }
  }

  if (listLoading) return <div className="p-8 text-slate-400">Loading…</div>

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[18rem_minmax(0,1fr)] gap-4 items-start p-2 pb-10">
      {/* Left: the student's registration, subject, then the chapters */}
      <div className="bg-white rounded-lg shadow-sm p-4 space-y-3 lg:sticky lg:top-2">
        {info && (
          <div className="text-sm text-slate-600 space-y-0.5">
            <div>
              <span className="text-slate-400">Class:</span> {info.class_name}
            </div>
            <div>
              <span className="text-slate-400">Board:</span> {info.board_name}
            </div>
            <div>
              <span className="text-slate-400">Medium:</span> {info.medium_name}
            </div>
          </div>
        )}

        {subjects.length > 0 && (
          <div>
            <label className="block text-xs text-slate-500 mb-1">Subject</label>
            <select
              className="w-full border border-slate-300 rounded-md px-2 py-1.5 text-sm bg-white"
              value={subjectId ?? ''}
              onChange={(e) => loadChapters(Number(e.target.value))}
            >
              {subjects.map((s) => (
                <option key={s.subject_id} value={s.subject_id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="border-t border-slate-100 pt-3">
          <div className="text-xs text-slate-400 mb-2">Chapters</div>
          {chapters.length === 0 && <p className="text-sm text-slate-400">No chapters for your registration yet.</p>}
          {chapters.map((c) => (
            <button
              key={c.chapter_id}
              type="button"
              onClick={() => selectChapter(c.chapter_id)}
              className={`w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-md text-sm text-left ${
                c.chapter_id === chapterId ? 'bg-brand-50 text-brand-700' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span className="min-w-0 break-words">
                {c.chapter_no}. {titleOf(c)}
              </span>
              <span className="text-xs text-slate-400 shrink-0">{c.question_count || 0}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Right: question list of the chapter, or the practice steps */}
      <div className="min-w-0">
        {listError && <p className="text-red-600 mb-3">{listError}</p>}

        {!practising ? (
          !chapter ? (
            <div className="bg-white rounded-lg shadow-sm p-6 text-sm text-slate-400">
              Select a chapter on the left to see its questions.
            </div>
          ) : (
            <>
              <div className="text-lg font-semibold text-slate-800 break-words mb-3">
                {chapter.chapter_no}. {titleOf(chapter)}
              </div>

              <table className="w-full text-sm bg-white rounded-lg shadow-sm">
                <thead className="bg-slate-100 text-left text-slate-500">
                  <tr>
                    <th className="px-4 py-2 w-12">#</th>
                    <th className="px-4 py-2">Question</th>
                    <th className="px-4 py-2 w-28"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => {
                    const startsGroup = i === 0 || rows[i - 1]._exercise !== row._exercise
                    const done = doneIds.has(row.question_id)
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
                          <td className="px-4 py-2 text-slate-400">{i + 1}</td>
                          <td className="py-2 pr-4 min-w-0" style={{ paddingLeft: `${16 + (row._depth ?? 0) * 20}px` }}>
                            {row.parent_id ? <span className="text-slate-400">↳ </span> : null}
                            <MathText text={textOf(row)} />
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => openQuestion(row)}
                              className="text-sm px-3 py-1 rounded-md bg-brand-500 hover:bg-brand-600 text-white"
                            >
                              {done ? '✓ Again' : 'Practice'}
                            </button>
                          </td>
                        </tr>
                      </Fragment>
                    )
                  })}
                  {rows.length === 0 && (
                    <tr>
                      <td className="px-4 py-6 text-slate-400" colSpan={3}>
                        No questions in this chapter yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </>
          )
        ) : !question ? (
          <div className="p-8 text-slate-400">Loading…</div>
        ) : (
          <div className="max-w-3xl mx-auto overflow-x-hidden">
            <div className="flex items-center justify-between mb-3">
              <button
                type="button"
                onClick={backToList}
                className="text-sm px-3 py-1.5 rounded-md border border-slate-300 text-slate-600 hover:bg-slate-100"
              >
                ← Back to questions
              </button>
              <span className="text-xs text-slate-400">
                {chapter ? `${chapter.chapter_no}. ${titleOf(chapter)}` : ''}
                {currentRow?._exercise ? ` · Exercise ${currentRow._exercise}` : ''}
              </span>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-5 mb-4">
              <div className="text-xs text-slate-400 mb-1">Question</div>
              <div className="text-lg text-slate-800">
                <MathText text={question.body} />
                {question.mocked && (
                  <span className="text-sm text-slate-400"> (practice API not connected yet)</span>
                )}
              </div>
            </div>

            {/* Single toolbar — hint, show-keyboard, and the math-keyboard toggle
                all live here together. Nothing floating, nothing per-line. */}
            <div className="flex items-center justify-end gap-3 mb-3 flex-wrap">
              {activeIndex >= 0 && (
                <button
                  type="button"
                  onClick={requestHint}
                  className="text-sm px-3 py-1.5 rounded-md border border-amber-300 text-amber-700 hover:bg-amber-50"
                >
                  💡 Hint
                </button>
              )}
              {mathMode && (
                <button
                  type="button"
                  onClick={() => {
                    const vk = window.mathVirtualKeyboard
                    if (!vk) return
                    // Focus the currently active (editable) field first so the
                    // keyboard's keypresses actually land in it.
                    document.querySelector('math-field:not([readonly])')?.focus()
                    vk.visible = !vk.visible
                  }}
                  className="text-sm px-3 py-1.5 rounded-md border border-slate-300 text-slate-600 hover:bg-slate-100"
                >
                  ⌨ Show keyboard
                </button>
              )}
              <span className="text-xs text-slate-500">Math keyboard</span>
              <button
                type="button"
                onClick={() => setMathMode((v) => !v)}
                aria-pressed={mathMode}
                className={`relative w-9 h-5 rounded-full transition-colors ${mathMode ? 'bg-brand-500' : 'bg-slate-300'}`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                    mathMode ? 'translate-x-4' : ''
                  }`}
                />
              </button>
            </div>

            {/* The hint (or a fetch-failure notice) for the active line shows
                right under the toolbar — the hint chip is clickable (fills the
                suggestion into the box), the error notice is plain text, never
                clickable, so a failed fetch can never get typed in as an answer. */}
            {activeStep?.hint && (
              <div className="mb-3 flex justify-end">
                <button
                  onClick={acceptHint}
                  className="text-sm bg-amber-50 border border-amber-200 text-amber-800 rounded-md px-3 py-2 hover:bg-amber-100 max-w-full break-words text-left"
                >
                  💡 {activeStep.hint} <span className="text-brand-600 ml-1">— tap to use this</span>
                </button>
              </div>
            )}
            {activeStep?.hintError && (
              <div className="mb-3 flex justify-end">
                <span className="text-sm text-slate-400">{activeStep.hintError}</span>
              </div>
            )}

            {/* One continuous ruled box — line-number gutter + rows, no separate
                bordered card per step. min-w-0 on every flex child in the row is
                what stops a long unbroken answer from stretching the page
                sideways; break-words + wrapping textarea handle the rest. */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
              {steps.map((step, index) => (
                <div
                  key={index}
                  className={`flex items-stretch border-b border-slate-100 last:border-b-0 min-w-0 ${
                    step.status === 'correct' ? 'bg-green-50/50' : step.status === 'incorrect' ? 'bg-amber-50/50' : ''
                  }`}
                >
                  <div className="w-12 shrink-0 flex items-center justify-center text-slate-300 text-sm border-r border-slate-100 select-none">
                    {index + 1}
                  </div>

                  <div className="flex-1 min-w-0 flex items-center gap-2 px-4 py-2.5">
                    {step.status === 'correct' || step.status === 'incorrect' ? (
                      step.enteredWithMath ? (
                        <MathInput
                          value={step.text}
                          onChange={() => {}}
                          disabled
                          className={`flex-1 min-w-0 border-0 text-lg bg-transparent ${
                            step.status === 'correct' ? 'text-green-800' : 'text-amber-800'
                          }`}
                        />
                      ) : (
                        <div
                          className={`flex-1 min-w-0 text-lg break-words whitespace-pre-wrap py-1 ${
                            step.status === 'correct' ? 'text-green-800' : 'text-amber-800'
                          }`}
                        >
                          {step.text}
                        </div>
                      )
                    ) : mathMode ? (
                      <MathInput
                        value={step.text}
                        onChange={(text) => updateStepText(index, text)}
                        onEnter={() => checkStepAt(index)}
                        disabled={step.status === 'checking'}
                        placeholder="Write this step…"
                        className="flex-1 min-w-0 border-0 text-lg bg-transparent"
                      />
                    ) : (
                      <textarea
                        rows={1}
                        className="flex-1 min-w-0 bg-transparent text-lg outline-none resize-none overflow-y-auto max-h-40 break-words py-1"
                        value={step.text}
                        onChange={(e) => {
                          updateStepText(index, e.target.value)
                          e.target.style.height = 'auto'
                          e.target.style.height = `${e.target.scrollHeight}px`
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault()
                            checkStepAt(index)
                          }
                        }}
                        disabled={step.status === 'checking'}
                        placeholder="Write this step…"
                      />
                    )}

                    {step.status === 'correct' && (
                      <span className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center shrink-0 text-base">
                        ✓
                      </span>
                    )}
                    {step.status === 'incorrect' && (
                      <span
                        className="w-8 h-8 rounded-full bg-amber-400 text-white flex items-center justify-center shrink-0 text-base"
                        title="Not quite — you can fix this later with Edit"
                      >
                        ✗
                      </span>
                    )}
                    {(step.status === 'correct' || step.status === 'incorrect') && (
                      <button
                        onClick={() => editStepAt(index)}
                        title="Edit this step"
                        className="text-sm text-slate-400 hover:text-slate-600 shrink-0"
                      >
                        Edit
                      </button>
                    )}
                    {step.status === 'checking' && <span className="text-slate-400 shrink-0">…</span>}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={handleSubmit}
                disabled={!complete || advancing}
                className={`px-5 py-2.5 rounded-md text-sm ${
                  complete
                    ? 'bg-brand-500 hover:bg-brand-600 text-white'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                {advancing ? 'Loading…' : complete ? (nextRow ? 'Submit — Next question →' : 'Submit — Finish') : 'Submit'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}