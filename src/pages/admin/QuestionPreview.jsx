import { useEffect, useState } from 'react'
import { adminApi } from '../../api/adminApi'

const IMAGE_URL = 'http://localhost:8000/images'   // matches app.mount("/images", ...)

export default function QuestionPreview({ questionId }) {
  const [q, setQ] = useState(null)

  useEffect(() => {
    setQ(null)
    if (!questionId) return
    adminApi.get('answers/lookup/question', questionId).then(setQ)
  }, [questionId])

  if (!questionId || !q) return null

  return (
    <div style={{ border: '1px solid #bfdbfe', background: '#eff6ff', borderRadius: 8,
                  padding: 14, marginBottom: 18 }}>
      <div style={{ fontSize: 13, color: '#1d4ed8', marginBottom: 6 }}>
        Exercise {q.exercise_no} &middot; Question {q.sort_order}
      </div>

      <div style={{ fontSize: 15, color: '#0f172a', whiteSpace: 'pre-wrap' }}>
        {q.question_text}
      </div>

      {q.images.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 10 }}>
          {q.images.map((p) => (
            <img key={p} src={`${IMAGE_URL}/${p}`} alt="question"
                 style={{ maxWidth: 320, maxHeight: 240, border: '1px solid #cbd5e1',
                          borderRadius: 6, background: '#fff' }} />
          ))}
        </div>
      )}

      {/* Graph goes here when the function plotter is ready */}
    </div>
  )
}