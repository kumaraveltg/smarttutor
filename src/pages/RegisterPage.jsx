import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { studentApi } from '../api/studentApi'

const inputClass = 'w-full border border-slate-300 rounded-md px-3 py-2 text-sm'

export default function RegisterPage() {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [options, setOptions] = useState({ boards: [], classes: [], mediums: [], subjects: [] })
  const [form, setForm] = useState({
    full_name: '',
    username: '',
    email: '',
    mobile: '',
    password: '',
    confirm: '',
    board_id: '',
    class_id: '',
    medium_id: '',
    subject_ids: [],
    school: '',
  })
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    studentApi
      .options()
      .then((o) =>
        setOptions({
          boards: o?.boards || [],
          classes: o?.classes || [],
          mediums: o?.mediums || [],
          subjects: o?.subjects || [],
        })
      )
      .catch(() => setError('Could not load the board, class, medium and subject lists. Please refresh.'))
  }, [])

  function setField(name, value) {
    setForm((f) => ({ ...f, [name]: value }))
  }

  function toggleSubject(id) {
    setForm((f) => ({
      ...f,
      subject_ids: f.subject_ids.includes(id) ? f.subject_ids.filter((s) => s !== id) : [...f.subject_ids, id],
    }))
  }

  function validate() {
    if (!form.full_name.trim()) return 'Enter your name'
    if (!form.username.trim()) return 'Choose a username'
    if (!form.email.trim()) return 'Enter your email'
    if (!/^[6-9]\d{9}$/.test(form.mobile.replace(/[\s-]/g, '').replace(/^(\+91|91|0)(?=\d{10}$)/, '')))
      return 'Enter a valid 10-digit mobile number'
    if (!form.board_id) return 'Select your board'
    if (!form.class_id) return 'Select your class'
    if (!form.medium_id) return 'Select your medium'
    if (form.subject_ids.length === 0) return 'Select at least one subject'
    if (form.password.length < 6) return 'Password must be at least 6 characters'
    if (form.password !== form.confirm) return 'Passwords do not match'
    return null
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const problem = validate()
    if (problem) {
      setError(problem)
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      await studentApi.register({
        full_name: form.full_name,
        username: form.username,
        email: form.email,
        mobile: form.mobile,
        password: form.password,
        board_id: Number(form.board_id),
        class_id: Number(form.class_id),
        medium_id: Number(form.medium_id),
        subject_ids: form.subject_ids,
        school: form.school || null,
      })
      // Account exists: sign in with the same credentials, then go to practice.
      await login(form.username, form.password)
      navigate('/practice')
    } catch (err) {
      // Works with an axios error or your own API helper's error shape.
      const detail = err?.response?.data?.detail ?? err?.data?.detail ?? err?.detail
      if (typeof detail === 'string') setError(detail)
      else if (typeof err?.message === 'string' && err.message && !Array.isArray(detail) && !err.response)
        setError(err.message)
      else if (Array.isArray(detail)) setError(detail[0]?.msg?.replace('Value error, ', '') || 'Check your details')
      else setError('Registration failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 py-8">
      <form onSubmit={handleSubmit} className="bg-white shadow-sm rounded-lg p-8 w-96 space-y-4">
        <div>
          <h1 className="text-lg font-semibold text-slate-800">Create student account</h1>
          <p className="text-sm text-green-700 mt-1">First month free. No payment needed now.</p>
        </div>

        <input className={inputClass} placeholder="Full name" value={form.full_name}
          onChange={(e) => setField('full_name', e.target.value)} />
        <input className={inputClass} placeholder="Username" value={form.username}
          onChange={(e) => setField('username', e.target.value)} />
        <input type="email" className={inputClass} placeholder="Email" value={form.email}
          onChange={(e) => setField('email', e.target.value)} />
        <input type="tel" inputMode="numeric" className={inputClass} placeholder="Mobile number"
          value={form.mobile} onChange={(e) => setField('mobile', e.target.value)} />

        <div className="grid grid-cols-2 gap-3">
          <select className={inputClass} value={form.board_id}
            onChange={(e) => setField('board_id', e.target.value)}>
            <option value="">Board</option>
            {options.boards.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
          <select className={inputClass} value={form.class_id}
            onChange={(e) => setField('class_id', e.target.value)}>
            <option value="">Class</option>
            {options.classes.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <select className={`${inputClass} col-span-2`} value={form.medium_id}
            onChange={(e) => setField('medium_id', e.target.value)}>
            <option value="">Medium</option>
            {options.mediums.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>

        <div>
          <div className="text-sm text-slate-600 mb-1">Subjects (choose one or more)</div>
          <div className="border border-slate-300 rounded-md p-2 space-y-1 max-h-40 overflow-y-auto">
            {options.subjects.map((s) => (
              <label key={s.id} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                <input type="checkbox" checked={form.subject_ids.includes(s.id)}
                  onChange={() => toggleSubject(s.id)} />
                {s.name}
              </label>
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-1">Free for the first month. After that, each subject is paid separately.</p>
        </div>

        <input className={inputClass} placeholder="School (optional)" value={form.school}
          onChange={(e) => setField('school', e.target.value)} />
        <input type="password" className={inputClass} placeholder="Password" value={form.password}
          onChange={(e) => setField('password', e.target.value)} />
        <input type="password" className={inputClass} placeholder="Confirm password" value={form.confirm}
          onChange={(e) => setField('confirm', e.target.value)} />

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <button disabled={submitting}
          className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white py-2 rounded-md text-sm">
          {submitting ? 'Creating account…' : 'Register'}
        </button>

        <p className="text-sm text-slate-500 text-center">
          Already registered? <Link to="/login" className="text-brand-600">Sign in</Link>
        </p>
      </form>
    </div>
  )
}
