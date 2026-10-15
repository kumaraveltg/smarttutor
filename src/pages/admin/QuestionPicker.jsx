import { useEffect, useState } from 'react'
import { adminApi } from '../../api/adminApi'

const sel = { width: '100%', padding: '8px 10px', border: '1px solid #cbd5e1',
              borderRadius: 6, fontSize: 14, boxSizing: 'border-box' }
const lbl = { display: 'block', fontSize: 14, color: '#475569', marginBottom: 4 }

export default function QuestionPicker({ onSelect }) {
  const [chapters, setChapters] = useState([])
  const [exercises, setExercises] = useState([])
  const [questions, setQuestions] = useState([])
  const [chapterId, setChapterId] = useState('')
  const [exerciseNo, setExerciseNo] = useState('')
  const [questionId, setQuestionId] = useState('')

  useEffect(() => {
    adminApi.list('chapters').then((d) => setChapters(Array.isArray(d) ? d : d.items || []))
  }, [])

  useEffect(() => {
    setExerciseNo(''); setQuestionId(''); setExercises([]); setQuestions([])
    onSelect('')
    if (!chapterId) return
    adminApi.list('answers/lookup/exercises', { chapter_id: chapterId }).then(setExercises)
  }, [chapterId])

  useEffect(() => {
    setQuestionId(''); setQuestions([])
    onSelect('')
    if (!chapterId || !exerciseNo) return
    adminApi
      .list('answers/lookup/questions', { chapter_id: chapterId, exercise_no: exerciseNo })
      .then(setQuestions)
  }, [exerciseNo])

  function pickQuestion(id) {
    setQuestionId(id)
    onSelect(id ? Number(id) : '')
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
      <div>
        <label style={lbl}>Chapter</label>
        <select style={sel} value={chapterId} onChange={(e) => setChapterId(e.target.value)}>
          <option value="">Select chapter</option>
          {chapters.map((c) => (
            <option key={c.chapter_id} value={c.chapter_id}>
              {c.chapter_name || c.name || c.title}
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
  )
}