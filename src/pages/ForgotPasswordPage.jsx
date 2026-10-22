import { useState } from 'react'
import { Link } from 'react-router-dom'
import client from '../api/client'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setError(''); setMsg(''); setBusy(true)
    try {
      const res = await client.post('/auth/forgot-password', { email })
      setMsg(res.message || 'If that email is registered, a reset link has been sent.')
    } catch (err) {
      setError(err.message || 'Something went wrong')
    } finally { setBusy(false) }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <form onSubmit={submit} className="bg-white border border-slate-200 rounded-md p-6 w-full max-w-sm space-y-4">
        <h2 className="text-lg font-semibold text-slate-700">Forgot password</h2>
        <p className="text-sm text-slate-500">Enter your registered email and we'll send a reset link.</p>
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
          placeholder="Email" className="w-full border border-slate-300 rounded px-3 py-2 text-sm" />
        {msg && <div className="text-sm text-green-600">{msg}</div>}
        {error && <div className="text-sm text-red-600">{error}</div>}
        <button disabled={busy} className="w-full bg-slate-800 text-white rounded py-2 text-sm disabled:opacity-50">
          {busy ? 'Sending...' : 'Send reset link'}
        </button>
        <Link to="/login" className="block text-center text-sm text-slate-500 hover:underline">Back to login</Link>
      </form>
    </div>
  )
}