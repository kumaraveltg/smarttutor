import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { adminApi } from '../../api/adminApi'
import { useAuth } from '../../auth/AuthContext'
import MathInput from '../../components/practice/MathInput'
import MathText, { protectMath, restoreMath } from '../../components/MathText'
import { toTamil } from '../../utils/transliterate'

const API_BASE = 'http://127.0.0.1:8000'

const RESOURCE = 'questions'
const LABEL = 'Question'

// MyMemory's free API accepts about 500 characters per request, so long
// questions are sent sentence by sentence.
function chunkText(text, max = 450) {
  const parts = text.split(/(?<=[.?!])\s+/)
  const chunks = []
  let cur = ''
  for (const p of parts) {
    if (cur && `${cur} ${p}`.length > max) {
      chunks.push(cur)
      cur = p
    } else {
      cur = cur ? `${cur} ${p}` : p
    }
  }
  if (cur) chunks.push(cur)
  return chunks
}

export default function QuestionsFormPage() {
  const { id } = useParams()
  const isNew = id === 'new'
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { user: currentUser } = useAuth()

  const [values, setValues] = useState({})
  const [chapters, setChapters] = useState([])
  const [siblings, setSiblings] = useState([])
  const [saving, setSaving] = useState(false)
  const [translating, setTranslating] = useState(false)
  const [error, setError] = useState(null)
  const [translateNote, setTranslateNote] = useState(null)
  const [showFormula, setShowFormula] = useState(false)
  const [formula, setFormula] = useState('')
  const textRef = useRef(null)
  const caretRef = useRef(null)
  // Once the user types their own Sort Order, stop auto-filling it.
  const sortTouched = useRef(false)
  const translationEdited = useRef(false) 
  const [typeTamil, setTypeTamil] = useState(true)
  const transRef = useRef(null)


  useEffect(() => {
    if (!isNew) {
      sortTouched.current = true // editing: keep the saved sort order
      translationEdited.current = true // editing: keep the saved translation // editing: keep the saved sort order
      adminApi
        .get(RESOURCE, id)
        .then(setValues)
        .catch((err) => setError('Could not load question. ' + (err.status ? `(${err.status})` : '')))
    } else {
      // URL: /admin/questions/new?chapter=<chapter_id>&ex=<exercise_no>
      const ch = Number(params.get('chapter'))
      setValues({
        chapter_id: ch || null,
        parent_id: null,
        exercise_no: params.get('ex') || '',
        sort_order: 1,
      })
    }
  }, [id])

  useEffect(() => {
    adminApi.list('chapters').then(setChapters).catch(() => {})
  }, [])

  // Other questions in this chapter, so one can be chosen as the parent
  // and so the next Sort Order can be worked out.
  useEffect(() => {
    if (!values.chapter_id) return
    adminApi
      .list(RESOURCE, { chapter_id: values.chapter_id })
      .then(setSiblings)
      .catch(() => {})
  }, [values.chapter_id])

  // New question: suggest the next Sort Order inside the chosen exercise
  // (highest existing number in that exercise + 1).
  useEffect(() => {
    if (!isNew || sortTouched.current) return 
    const ex = (values.exercise_no || '').trim()
    if (!ex) return
    const inExercise = siblings.filter((q) => (q.exercise_no || '').trim() === ex)
    const max = inExercise.reduce((m, q) => Math.max(m, Number(q.sort_order) || 0), 0)
    setValues((v) => (v.sort_order === max + 1 ? v : { ...v, sort_order: max + 1 }))
  }, [values.exercise_no, siblings, isNew])





  function setField(key, val) {
    setValues((v) => ({ ...v, [key]: val }))
  }

  const chapter = chapters.find((c) => c.chapter_id === values.chapter_id)
  const parentOptions = siblings.filter((q) => q.question_id !== Number(id))

  // How many parents a question has, used to indent the dropdown.
  const depthOf = (q) => {
    const byId = Object.fromEntries(siblings.map((s) => [s.question_id, s]))
    let depth = 0
    let cur = q
    while (cur?.parent_id && byId[cur.parent_id] && depth < 10) {
      cur = byId[cur.parent_id]
      depth += 1
    }
    return depth
  }
   
  // Puts the formula from the math keyboard into the question at the cursor,
  // written between dollar signs so it is drawn properly everywhere.
  function insertFormula() {
  const latex = formula.trim()
  if (!latex) return
  const el = textRef.current
  const current = values.question_text || ''
  // insert at the last cursor position (or the end); never replace existing text
  const at = Math.min(caretRef.current ?? current.length, current.length)
  const lead = at > 0 && !/\s/.test(current[at - 1]) ? ' ' : ''
  const piece = `${lead}$${latex}$`
  const newText = current.slice(0, at) + piece + current.slice(at)
  setField('question_text', newText)
  setFormula('')
  setShowFormula(false)
  handleTranslate(false, newText)
  requestAnimationFrame(() => {
    el?.focus()
    const pos = at + piece.length
    el?.setSelectionRange(pos, pos)
    caretRef.current = pos
  })
}

  function toggleKeyboard() {
    const vk = window.mathVirtualKeyboard
    if (!vk) return
    document.querySelector('math-field:not([readonly])')?.focus()
    vk.visible = !vk.visible
  }
  // Turns the English-letter word just before the caret into Tamil.
// Formulas between $ $ are left alone.
async function convertWordBeforeCaret(text, caret) {
  const head = text.slice(0, caret)
  const m = head.match(/([A-Za-z][A-Za-z']*)([\s.,;:!?]*)$/)
  if (!m) return
  const before = head.slice(0, m.index)
  if ((before.match(/\$/g) || []).length % 2 === 1) return // inside a formula

  const tamil = await toTamil(m[1])
  if (!tamil || tamil === m[1]) return

  // the user may have kept typing while we waited, so work on the latest text
  const el = transRef.current
  const cur = el ? el.value : text
  if (!cur.startsWith(before + m[1] + m[2])) return

  const newText = before + tamil + m[2] + cur.slice(before.length + m[1].length + m[2].length)
  const curCaret = el ? el.selectionStart : caret
  const pos = Math.max(curCaret, caret) + (tamil.length - m[1].length)

  translationEdited.current = true
  setField('language_translation', newText)
  requestAnimationFrame(() => el?.setSelectionRange(pos, pos))
}
  // English is entered; the translation fills in automatically. Formulas are
  // hidden from the translator and put back afterwards, and the result stays editable.
  async function handleTranslate(force = false, textOverride) {
  const text = (textOverride ?? values.question_text)?.trim()
  if (!text) return
  if (!force && translationEdited.current) return // never overwrite text typed by hand
  setTranslating(true)
  setTranslateNote(null)
  try {
    const { formulas } = protectMath(text)
    const res = await fetch(`${API_BASE}/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, language_code: 'ta' }),
    })
    if (!res.ok) throw new Error(`translate failed (${res.status})`)
    const data = await res.json()
    const translated = data.translation || ''
    if (!translated) throw new Error('empty translation')
    if (formulas.every((f) => translated.includes(f))) {
      setField('language_translation', translated)
      translationEdited.current = false
    } else {
      setTranslateNote('The translation changed a formula, so it was not used. Please type the translation yourself.')
    }
  } catch (err) {
    setTranslateNote('Could not translate right now. You can type the translation yourself.')
  } finally {
    setTranslating(false)
  }
}

  // Paste a screenshot of one formula into the formula box; the reader turns it
// into LaTeX so it can be checked before inserting.
 

  async function handleSubmit(e) {
    e.preventDefault()
    if (!values.chapter_id) {
      setError('No chapter selected. Open this page from a chapter in the Questions list (URL needs ?chapter=<id>).')
      return
    }
    if (!chapter) {
      setError('Chapter not found. Reload the page and try again.')
      return
    }
    const exerciseNo = (values.exercise_no || '').trim()
    if (!exerciseNo) {
      setError('Exercise No is required.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      // class, subject and medium always come from the chapter, so they cannot be mismatched.
      const payload = {
        ...values,
        exercise_no: exerciseNo,
        sort_order: Number(values.sort_order) || 0,
        chapter_id: chapter.chapter_id,
        modified_by: currentUser?.username,
      }
      if (isNew) await adminApi.create(RESOURCE, payload, currentUser?.username)
      else await adminApi.update(RESOURCE, id, payload, currentUser?.username)
      navigate(`/admin/questions?chapter=${chapter.chapter_id}`)
    } catch (err) {
      setError('Save failed. Check required fields and try again.')
    } finally {
      setSaving(false)
    }
  }

  const hasFormula = /\$[^$]+\$/.test(values.question_text || '')

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl bg-white rounded-lg shadow-sm p-6 space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-800">{isNew ? `Add ${LABEL}` : `Edit ${LABEL}`}</h1>
        {chapter && (
          <p className="text-sm text-slate-500 mt-1">
            Chapter {chapter.chapter_no}. {chapter.title_en}
          </p>
        )}
      </div>

      {/* Exercise number (as printed in the textbook) and order inside that exercise */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-slate-600 mb-1">
            Exercise No <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
            value={values.exercise_no || ''}
            onChange={(e) => setField('exercise_no', e.target.value)}
            placeholder="e.g. 1.2 or 6"
            required
          />
        </div>
        <div>
          <label className="block text-sm text-slate-600 mb-1">Sort Order</label>
          <input
            type="number"
            min="1"
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
            value={values.sort_order ?? ''}
            onChange={(e) => {
              sortTouched.current = true
              setField('sort_order', e.target.value === '' ? '' : Number(e.target.value))
            }}
          />
        </div>
      </div>

      {parentOptions.length > 0 && (
        <div>
          <label className="block text-sm text-slate-600 mb-1">Sub-question of</label>
          <select
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
            value={values.parent_id || ''}
            onChange={(e) => setField('parent_id', e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">None — this is a main question</option>
            {parentOptions.map((q) => (
              <option key={q.question_id} value={q.question_id}>
                {'— '.repeat(depthOf(q))}
                {q.exercise_no ? `[Ex ${q.exercise_no}] ` : ''}
                {q.question_text.length > 70 ? `${q.question_text.slice(0, 70)}…` : q.question_text}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-sm text-slate-600">Question (English)</label>
          <button
            type="button"
            onClick={() => setShowFormula((v) => !v)}
            className="text-xs text-brand-600 hover:underline"
          >
            {showFormula ? 'Close formula box' : '∑ Add formula'}
          </button>
         
        </div>
        <textarea
          ref={textRef}
          rows={4}
          className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
          value={values.question_text || ''}
          onChange={(e) => { caretRef.current = e.target.selectionEnd 
          setField('question_text', e.target.value)}}
          onSelect={(e) => { caretRef.current = e.target.selectionEnd }}
          onBlur={() => handleTranslate(false)}                  
          placeholder="Type the question. Use Add formula for maths."
          required
        />
         

        {showFormula && (
          <div className="mt-2 border border-slate-200 rounded-md p-3 bg-slate-50 space-y-2">
            <MathInput
              value={formula}
              onChange={setFormula}
              onEnter={insertFormula}
              placeholder="Type a formula…"
              className="w-full min-w-0 text-lg bg-white border border-slate-200 rounded-md"
            />
                         
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleKeyboard}
                className="text-sm px-3 py-1.5 rounded-md border border-slate-300 text-slate-600 hover:bg-slate-100"
              >
                ⌨ Show keyboard
              </button>
              <button
                type="button"
                onClick={insertFormula}
                className="text-sm px-3 py-1.5 rounded-md bg-brand-500 hover:bg-brand-600 text-white"
              >
                Insert in question
              </button>
            </div>
          </div>
        )}

        {hasFormula && (
          <div className="mt-2 text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-md px-3 py-2">
            <div className="text-xs text-slate-400 mb-1">Preview</div>
            <MathText text={values.question_text} />
          </div>
        )}
      </div>

      <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm text-slate-600">Translation</label>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1 text-xs text-slate-500">
                <input
                  type="checkbox"
                  checked={typeTamil}
                  onChange={(e) => setTypeTamil(e.target.checked)}
                />
                Type Tamil
              </label>
              <button
                type="button"
                onClick={() => handleTranslate(true)}
                disabled={translating || !values.question_text}
                className="text-xs text-brand-600 hover:underline disabled:text-slate-300"
              >
                {translating ? 'Translating…' : 'Translate'}
              </button>
            </div>
          </div>
          <textarea
            ref={transRef}
            rows={4}
            autoComplete="off"
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
            value={values.language_translation || ''}
            onChange={(e) => {
              translationEdited.current = true
              const raw = e.target.value
              setField('language_translation', raw)
              const caret = e.target.selectionStart
              // a space or punctuation mark was just typed: convert the finished word
              if (typeTamil && /[\s.,;:!?]$/.test(raw.slice(0, caret))) {
                convertWordBeforeCaret(raw, caret)
              }
            }}
            onBlur={(e) => {
              if (typeTamil) convertWordBeforeCaret(e.target.value, e.target.selectionStart)
            }}
          />
          {translateNote && <p className="text-sm text-amber-700 mt-1">{translateNote}</p>}
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
