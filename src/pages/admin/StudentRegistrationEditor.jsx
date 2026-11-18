import { useEffect, useState } from 'react'
import { adminApi } from '../../api/adminApi'

export default function StudentRegistrationEditor({ userId }) {
  const [lov, setLov] = useState([])
  const [form, setForm] = useState(null)   // null until loaded
  const [isStudent, setIsStudent] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)

  const opts = (type) => lov.filter((r) => r.type === type)
console.log('StudentRegistrationEditor mounted, userId =', userId)
  useEffect(() => {
   Promise.all([adminApi.list('lov'), adminApi.getStudentRegistration(userId)])
      .then(([l, r]) => {
        setLov(l)
        setIsStudent(!!r.is_student)
        if (r.is_student) {
          setForm({
            class_lov_id: r.class_lov_id,
            medium_lov_id: r.medium_lov_id,
            board_lov_id: r.board_lov_id,
            subject_lov_ids: r.subject_lov_ids,            
          })
        }
      })
      .catch(() => setMsg({ type: 'error', text: 'Could not load student registration.' }))
  }, [userId])

    if (msg?.type === 'error' && !form) {
    return <div className="mt-6 text-sm text-red-600">{msg.text}</div>
  }
  if (!isStudent || !form) {
    return <div className="mt-6 text-xs text-slate-400">Editor loaded, but no student data.</div>
  }

  const toggle = (id) =>
    setForm((f) => ({
      ...f,
      subject_lov_ids: f.subject_lov_ids.includes(id)
        ? f.subject_lov_ids.filter((x) => x !== id)
        : [...f.subject_lov_ids, id],
    }))

  async function save() {
    if (!form.subject_lov_ids.length) {
      setMsg({ type: 'error', text: 'Choose at least one subject.' })
      return
    }
    setSaving(true)
    setMsg(null)
    try {
      await adminApi.updateStudentRegistration(userId, form)
      setMsg({ type: 'ok', text: 'Class and subjects updated.' })
    } catch {
      setMsg({ type: 'error', text: 'Could not save. Try again.' })
    } finally {
      setSaving(false)
    }
  }

  const select = 'w-full border border-slate-300 rounded-md px-2 py-1.5 text-sm bg-white'

  return (
    <div className="mt-6 bg-white border border-slate-200 rounded-md p-4 space-y-4 max-w-md">
      <div className="font-semibold text-slate-700">Student registration</div>

      {msg && (
        <div className={`text-sm border rounded-md px-3 py-2 ${
          msg.type === 'ok' ? 'bg-green-50 text-green-800 border-green-200'
                            : 'bg-red-50 text-red-700 border-red-200'}`}>
          {msg.text}
        </div>
      )}

      <div>
        <label className="block text-xs text-slate-500 mb-1">Class</label>
        <select className={select} value={form.class_lov_id ?? ''}
          onChange={(e) => setForm({ ...form, class_lov_id: Number(e.target.value) })}>
          {opts('Class').map((o) => <option key={o.lov_id} value={o.lov_id}>{o.value}</option>)}
        </select>
      </div>

      <div>
        <label className="block text-xs text-slate-500 mb-1">Medium</label>
        <select className={select} value={form.medium_lov_id ?? ''}
          onChange={(e) => setForm({ ...form, medium_lov_id: Number(e.target.value) })}>
          {opts('Medium').map((o) => <option key={o.lov_id} value={o.lov_id}>{o.value}</option>)}
        </select>
      </div>

      <div>
        <label className="block text-xs text-slate-500 mb-1">Board</label>
        <select className={select} value={form.board_lov_id ?? ''}
          onChange={(e) => setForm({ ...form, board_lov_id: Number(e.target.value) })}>
          {opts('Board of Category').map((o) => <option key={o.lov_id} value={o.lov_id}>{o.value}</option>)}
        </select>
      </div>

      <div>
        <div className="text-xs text-slate-500 mb-1">Subjects</div>
        <div className="grid grid-cols-2 gap-1">
          {opts('Subject').map((o) => (
            <label key={o.lov_id} className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.subject_lov_ids.includes(o.lov_id)}
                onChange={() => toggle(o.lov_id)} />
              {o.value}
            </label>
          ))}
        </div>
      </div>

      <button onClick={save} disabled={saving}
        className="px-3 py-2 text-sm rounded-md bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-50">
        {saving ? 'Saving…' : 'Save class and subjects'}
      </button>
    </div>
  )
}