import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { adminApi } from '../../api/adminApi'
import { useAuth } from '../../auth/AuthContext'
import MathInput from '../../components/practice/MathInput'
import MathText, { protectMath, restoreMath } from '../../components/MathText'

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
  const [subchapters, setSubchapters] = useState([])
  const [siblings, setSiblings] = useState([])
  const [saving, setSaving] = useState(false)
  const [translating, setTranslating] = useState(false)
  const [error, setError] = useState(null)
  const [translateNote, setTranslateNote] = useState(null)
  const [showFormula, setShowFormula] = useState(false)
  const [formula, setFormula] = useState('')
  const textRef = useRef(null)

  useEffect(() => {
    if (!isNew) {
      adminApi
        .get(RESOURCE, id)
        .then(setValues)
        .catch((err) => setError('Could not load question. ' + (err.status ? `(${err.status})` : '')))
    } else {
      const sub = Number(params.get('sub'))
      setValues({ subchapter_id: sub || null, parent_id: null })
    }
  }, [id])

  useEffect(() => {
    adminApi.list('chapters').then(setChapters).catch(() => {})
    adminApi.list('subchapters').then(setSubchapters).catch(() => {})
  }, [])

  // Other questions in this subchapter, so one can be chosen as the parent.
  useEffect(() => {
    if (!values.subchapter_id) return
    adminApi
      .list(RESOURCE, { subchapter_id: values.subchapter_id })
      .then(setSiblings)
      .catch(() => {})
  }, [values.subchapter_id])

  function setField(key, val) {
    setValues((v) => ({ ...v, [key]: val }))
  }

  const sub = subchapters.find((s) => s.subchapter_id === values.subchapter_id)
  const chapter = sub && chapters.find((c) => c.chapter_id === sub.chapter_id)
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
    const start = el?.selectionStart ?? current.length
    const end = el?.selectionEnd ?? start
    setField('question_text', current.slice(0, start) + `$${latex}$` + current.slice(end))
    setFormula('')
    setShowFormula(false)
    requestAnimationFrame(() => {
      el?.focus()
      const pos = start + latex.length + 2
      el?.setSelectionRange(pos, pos)
    })
  }

  function toggleKeyboard() {
    const vk = window.mathVirtualKeyboard
    if (!vk) return
    document.querySelector('math-field:not([readonly])')?.focus()
    vk.visible = !vk.visible
  }

  // English is entered; the translation fills in automatically. Formulas are
  // hidden from the translator and put back afterwards, and the result stays editable.
  async function handleTranslate(force = false) {
    const text = values.question_text?.trim()
    if (!text) return
    if (!force && values.language_translation?.trim()) return // never overwrite text that was edited
    setTranslating(true)
    setTranslateNote(null)
    try {
      const { masked, formulas } = protectMath(text)
      const out = []
      for (const chunk of chunkText(masked)) {
        const res = await fetch(
          `https://api.mymemory.translated.net/get?q=${encodeURIComponent(chunk)}&langpair=en|ta`
        )
        const data = await res.json()
        const translated = data?.responseData?.translatedText
        if (!translated) throw new Error('empty translation')
        out.push(translated)
      }
      const restored = restoreMath(out.join(' '), formulas)
      if (formulas.every((f) => restored.includes(f))) {
        setField('language_translation', restored)
      } else {
        setTranslateNote('The translation changed a formula, so it was not used. Please type the translation yourself.')
      }
    } catch (err) {
      setTranslateNote('Could not translate right now. You can type the translation yourself.')
    } finally {
      setTranslating(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!sub || !chapter) {
      setError('Open this page from a subchapter in the Questions list.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      // class, subject and medium always come from the chapter, so they cannot be mismatched.
      const payload = {
        ...values, 
        chapter_id: chapter.chapter_id, 
        class_id: chapter.class_lov_id,
        subject_id: chapter.subject_lov_id,
        medium_id: chapter.medium_lov_id,
        modified_by: currentUser?.username,
      }
      if (isNew) await adminApi.create(RESOURCE, payload, currentUser?.username)
      else await adminApi.update(RESOURCE, id, payload, currentUser?.username)
      navigate(`/admin/questions?sub=${sub.subchapter_id}`)
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
        {sub && (
          <p className="text-sm text-slate-500 mt-1">
            Chapter {chapter?.chapter_no}. {chapter?.title_en} › {sub.subchapter_no} {sub.title_en}
          </p>
        )}
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
          onChange={(e) => setField('question_text', e.target.value)}
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
          <button
            type="button"
            onClick={() => handleTranslate(true)}
            disabled={translating || !values.question_text}
            className="text-xs text-brand-600 hover:underline disabled:text-slate-300"
          >
            {translating ? 'Translating…' : 'Translate'}
          </button>
        </div>
        <textarea
          rows={4}
          autoComplete="off"
          className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
          value={values.language_translation || ''}
          onChange={(e) => setField('language_translation', e.target.value)}
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
