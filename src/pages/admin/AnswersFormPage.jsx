import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { adminApi } from '../../api/adminApi'
import QuestionPicker from './QuestionPicker'
import QuestionPreview from './QuestionPreview'

const RESOURCE = 'answers'
const LABEL = 'Answer'
const LANG = 'ta'   // Tamil; more languages can be added later

const emptyStep = (n) => ({
  step_no: n, step_text: '', hint_text: '', ta_step: '', ta_hint: '',
})

const S = {
  card: { maxWidth: 1000, background: '#fff', borderRadius: 8, padding: 24,
          boxShadow: '0 1px 2px rgba(0,0,0,0.08)' },
  title: { fontSize: 18, fontWeight: 600, color: '#1e293b', margin: '0 0 16px' },
  label: { display: 'block', fontSize: 14, color: '#475569', marginBottom: 4 },
  input: { width: '100%', boxSizing: 'border-box', border: '1px solid #cbd5e1',
           borderRadius: 6, padding: '8px 10px', fontSize: 14 },
  field: { marginBottom: 16 },
  table: { width: '100%', borderCollapse: 'collapse', marginBottom: 10 },
  th: { textAlign: 'left', fontSize: 13, color: '#475569', background: '#f1f5f9',
        border: '1px solid #e2e8f0', padding: '8px 10px' },
  thTa: { textAlign: 'left', fontSize: 13, color: '#166534', background: '#f0fdf4',
          border: '1px solid #e2e8f0', padding: '8px 10px' },
  td: { border: '1px solid #e2e8f0', padding: 6, verticalAlign: 'top' },
  tdTa: { border: '1px solid #e2e8f0', padding: 6, verticalAlign: 'top',
          background: '#f7fef9' },
  noCell: { border: '1px solid #e2e8f0', padding: 6, textAlign: 'center',
            fontWeight: 600, width: 44, background: '#f8fafc' },
  cell: { width: '100%', boxSizing: 'border-box', border: '1px solid #cbd5e1',
          borderRadius: 4, padding: '6px 8px', fontSize: 14, fontFamily: 'inherit',
          marginBottom: 4 },
  small: { border: '1px solid #cbd5e1', background: '#fff', borderRadius: 4,
           padding: '2px 8px', cursor: 'pointer', fontSize: 13, marginRight: 4 },
  del: { border: '1px solid #fca5a5', background: '#fff', color: '#dc2626',
         borderRadius: 4, padding: '2px 8px', cursor: 'pointer', fontSize: 13 },
  add: { border: '1px dashed #94a3b8', background: '#f8fafc', color: '#334155',
         borderRadius: 6, padding: '8px 14px', cursor: 'pointer', fontSize: 14,
         marginRight: 10, marginBottom: 20 },
  tr: { border: '1px solid #16a34a', background: '#f0fdf4', color: '#166534',
        borderRadius: 6, padding: '8px 14px', cursor: 'pointer', fontSize: 14,
        marginBottom: 20 },
  save: { background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6,
          padding: '9px 18px', fontSize: 14, cursor: 'pointer', marginRight: 8 },
  cancel: { background: 'transparent', color: '#475569', border: 'none',
            borderRadius: 6, padding: '9px 18px', fontSize: 14, cursor: 'pointer' },
  error: { color: '#dc2626', fontSize: 14, marginBottom: 12 },
}

export default function AnswersFormPage() {
  const { id } = useParams()
  const isNew = id === 'new'
  const navigate = useNavigate()
  const [params] = useSearchParams()

  const [questionId, setQuestionId] = useState(params.get('question_id') || '')
  const [finalAnswer, setFinalAnswer] = useState('')
  const [steps, setSteps] = useState([emptyStep(1)])
  const [saving, setSaving] = useState(false)
  const [translating, setTranslating] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (isNew) return
    adminApi.get(RESOURCE, id).then((a) => {
      setQuestionId(String(a.question_id ?? ''))
      setFinalAnswer(a.final_answer || '')
      setSteps(
        a.steps && a.steps.length
          ? a.steps.map((s) => {
              const t = (s.translations || []).find((x) => x.language_code === LANG) || {}
              return {
                step_no: s.step_no,
                step_text: s.step_text || '',
                hint_text: s.hint_text || '',
                ta_step: t.step_text || '',
                ta_hint: t.hint_text || '',
              }
            })
          : [emptyStep(1)]
      )
    })
  }, [id])

  const renumber = (list) => list.map((s, i) => ({ ...s, step_no: i + 1 }))
  const updateStep = (i, f, v) =>
    setSteps((p) => p.map((s, idx) => (idx === i ? { ...s, [f]: v } : s)))
  const addStep = () => setSteps((p) => [...p, emptyStep(p.length + 1)])
  const removeStep = (i) =>
    setSteps((p) => {
      const n = p.filter((_, idx) => idx !== i)
      return renumber(n.length ? n : [emptyStep(1)])
    })
  const moveStep = (i, d) =>
    setSteps((p) => {
      const j = i + d
      if (j < 0 || j >= p.length) return p
      const n = [...p]
      ;[n[i], n[j]] = [n[j], n[i]]
      return renumber(n)
    })

  async function translateAll() {
    setError(null)
    if (steps.every((s) => !s.step_text.trim())) {
      setError('Write the English steps first.')
      return
    }
    setTranslating(true)
    try {
      const res = await adminApi.create('answers/translate-preview', {
        steps: steps.map((s) => ({ step_text: s.step_text, hint_text: s.hint_text })),
      })
      setSteps((prev) =>
        prev.map((s, i) => {
          const t = (res[i]?.translations || []).find((x) => x.language_code === LANG) || {}
          return { ...s, ta_step: t.step_text || '', ta_hint: t.hint_text || '' }
        })
      )
    } catch (e) {
      setError('Translation failed. You can still save; it will retry on save.')
    } finally {
      setTranslating(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    if (!questionId) {
      setError('Please select a chapter, exercise and question first.')
      return
    }
    if (steps.some((s) => !s.step_text.trim())) {
      setError('Every step needs English text. Remove empty rows.')
      return
    }
    const payload = {
      question_id: Number(questionId),
      final_answer: finalAnswer,
      steps: steps.map((s, i) => ({
        step_no: i + 1,
        step_text: s.step_text,
        hint_text: s.hint_text || null,
        translations: [
          { language_code: LANG, step_text: s.ta_step || null, hint_text: s.ta_hint || null },
        ],
      })),
    }
    setSaving(true)
    try {
      if (isNew) await adminApi.create(RESOURCE, payload)
      else await adminApi.update(RESOURCE, id, payload)
      navigate('/admin/answers')
    } catch (err) {
      setError('Save failed. Check the fields and try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} style={S.card}>
      <h1 style={S.title}>{isNew ? `Add ${LABEL}` : `Edit ${LABEL}`}</h1>

      {isNew && !params.get('question_id') && <QuestionPicker onSelect={setQuestionId} />}
      <QuestionPreview questionId={questionId} />

      <label style={S.label}>Solution steps ({steps.length})</label>
      <table style={S.table}>
        <thead>
          <tr>
            <th style={{ ...S.th, width: 44, textAlign: 'center' }}>No</th>
            <th style={S.th}>Step / Hint (English)</th>
            <th style={S.thTa}>Step / Hint (Tamil)</th>
            <th style={{ ...S.th, width: 110 }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {steps.map((s, i) => (
            <tr key={i}>
              <td style={S.noCell}>{s.step_no}</td>
              <td style={S.td}>
                <textarea rows={2} style={S.cell} placeholder="Step (English)"
                  value={s.step_text}
                  onChange={(e) => updateStep(i, 'step_text', e.target.value)} />
                <textarea rows={1} style={S.cell} placeholder="Hint (optional)"
                  value={s.hint_text}
                  onChange={(e) => updateStep(i, 'hint_text', e.target.value)} />
              </td>
              <td style={S.tdTa}>
                <textarea rows={2} style={S.cell} placeholder="Tamil step"
                  value={s.ta_step}
                  onChange={(e) => updateStep(i, 'ta_step', e.target.value)} />
                <textarea rows={1} style={S.cell} placeholder="Tamil hint"
                  value={s.ta_hint}
                  onChange={(e) => updateStep(i, 'ta_hint', e.target.value)} />
              </td>
              <td style={S.td}>
                <button type="button" style={S.small} disabled={i === 0}
                  onClick={() => moveStep(i, -1)}>↑</button>
                <button type="button" style={S.small} disabled={i === steps.length - 1}
                  onClick={() => moveStep(i, 1)}>↓</button>
                <button type="button" style={S.del} onClick={() => removeStep(i)}>✕</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <button type="button" style={S.add} onClick={addStep}>+ Add step</button>
      <button type="button" style={S.tr} onClick={translateAll} disabled={translating}>
        {translating ? 'Translating…' : 'Translate to Tamil'}
      </button>

      <div style={S.field}>
        <label style={S.label}>Final answer</label>
        <input type="text" style={S.input} value={finalAnswer}
          onChange={(e) => setFinalAnswer(e.target.value)} required />
      </div>

      {error && <p style={S.error}>{error}</p>}

      <button type="submit" disabled={saving} style={S.save}>
        {saving ? 'Saving…' : 'Save'}
      </button>
      <button type="button" style={S.cancel} onClick={() => navigate(-1)}>Cancel</button>
    </form>
  )
}