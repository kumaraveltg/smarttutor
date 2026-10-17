import { useEffect, useState } from 'react'
import { adminApi } from '../../api/adminApi'

const sel = { width: '100%', padding: '8px 10px', border: '1px solid #cbd5e1',
              borderRadius: 6, fontSize: 14, boxSizing: 'border-box' }
const lbl = { display: 'block', fontSize: 14, color: '#475569', marginBottom: 4 }

// The chapter list may come back as an array, or as { items: [...] } / { data: [...] }
const toArray = (d) => (Array.isArray(d) ? d : d?.items || d?.data || d?.results || [])

const chapterKey = (c) => c.chapter_id ?? c.id

// Find a readable name whatever the field is called (also looks inside translations)
function chapterLabel(c) {
  const direct = c.chapter_name || c.name || c.title || c.chapter_title
  if (direct) return direct
  const tr = c.translations || []
  const en = tr.find((t) => t.language_code === 'en') || tr[0]
  if (en) {
    const t = en.chapter_name || en.name || en.title || en.chapter_title
    if (t) return t
  }
  const k = Object.keys(c).find((key) => /name|title/i.test(key) && typeof c[key] === 'string')
  return k ? c[k] : `Chapter ${chapterKey(c)}`
}

export default function QuestionPicker({ onSelect }) {
  const [chapters, setChapters] = useState([])
  const [exercises, setExercises] = useState([])
  const [questions, setQuestions] = useState([])
  const [chapterId, setChapterId] = useState('')
  const [exerciseNo, setExerciseNo] = useState('')
  const [questionId, setQuestionId] = useState('')
  const [loadError, setLoadError] = useState(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    adminApi.list('chapters')
      .then((d) => {
        const list = toArray(d)
        console.log('chapters response:', d)          // F12 > Console shows the real shape
        setChapters(list)
      })
      .catch((e) => {
        console.error('chapters load failed:', e)
        setLoadError('Could not load chapters. Press F12, open the Console tab and read the error.')
      })
      .finally(() => setLoaded(true))
  }, [])

  useEffect(() => {
    setExerciseNo(''); setQuestionId(''); setExercises([]); setQuestions([])
    onSelect('')
    if (!chapterId) return
    adminApi.list('answers/lookup/exercises', { chapter_id: chapterId })
      .then(setExercises)
      .catch((e) => console.error('exercises load failed:', e))
  }, [chapterId])

  useEffect(() => {
    setQuestionId(''); setQuestions([])
    onSelect('')
    if (!chapterId || !exerciseNo) return
    adminApi
      .list('answers/lookup/questions', { chapter_id: chapterId, exercise_no: exerciseNo })
      .then(setQuestions)
      .catch((e) => console.error('questions load failed:', e))
  }, [exerciseNo])

  function pickQuestion(id) {
    setQuestionId(id)
    onSelect(id ? Number(id) : '')
  }

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
        <div>
          <label style={lbl}>Chapter</label>
          <select style={sel} value={chapterId} onChange={(e) => setChapterId(e.target.value)}>
            <option value="">Select chapter</option>
            {chapters.map((c) => (
              <option key={chapterKey(c)} value={chapterKey(c)}>
                {chapterLabel(c)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={lbl}>Exercise No</label>
          <select style={sel} value={exerciseNo} disabled={!chapterId}
                  onChange={(e) => setExerciseNo(e.target.value)}>
            <option value="">Select exercise</option>
            {exercises.map((x) => <option key={x} value={x}>{x}</option>)}
          </select>
        </div>

        <div>
          <label style={lbl}>Question</label>
          <select style={sel} value={questionId} disabled={!exerciseNo}
                  onChange={(e) => pickQuestion(e.target.value)}>
            <option value="">Select question</option>
            {questions.map((q) => (
              <option key={q.question_id} value={q.question_id}>
                {q.sort_order}. {(q.question_text || '').slice(0, 50)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loadError && <p style={{ color: '#dc2626', fontSize: 13, margin: '6px 0 0' }}>{loadError}</p>}
      {loaded && !loadError && chapters.length === 0 && (
        <p style={{ color: '#b45309', fontSize: 13, margin: '6px 0 0' }}>
          No chapters came back from the server. Check the chapters list page has data.
        </p>
      )}
    </div>
  )
}
