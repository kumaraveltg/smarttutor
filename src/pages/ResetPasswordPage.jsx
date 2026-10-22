import { useState } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import client from '../api/client'

export default function ResetPasswordPage() {
  const [params] = useSearchParams()
  const token = params.get('token') || ''
  const navigate = useNavigate()
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setError('')
    if (pw.length < 6) return setError('Password must be at least 6 characters')
    if (pw !== pw2) return setError('Passwords do not match')
    setBusy(true)
    try {
      await client.post('/auth/reset-password', { token, new_password: pw })
      setDone(true)
      setTimeout(() => navigate('/login'), 2000)
    } catch (err) {
      setError(err.message || 'Could not reset password')
    } finally { setBusy(false) }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <form onSubmit={submit} className="bg-white border border-slate-200 rounded-md p-6 w-full max-w-sm space-y-4">
        <h2 className="text-lg font-semibold text-slate-700">Set new password</h2>
        {!token && <div className="text-sm text-red-600">Missing reset token. Use the link from your email.</div>}
        <input type="password" required value={pw} onChange={(e) => setPw(e.target.value)}
          placeholder="New password" className="w-full border border-slate-300 rounded px-3 py-2 text-sm" />
        <input type="password" required value={pw2} onChange={(e) => setPw2(e.target.value)}
          placeholder="Confirm password" className="w-full border border-slate-300 rounded px-3 py-2 text-sm" />
        {error && <div className="text-sm text-red-600">{error}</div>}
        {done && <div className="text-sm text-green-600">Password updated. Redirecting to login...</div>}
        <button disabled={busy || !token} className="w-full bg-slate-800 text-white rounded py-2 text-sm disabled:opacity-50">
          {busy ? 'Saving...' : 'Update password'}
        </button>
        <Link to="/login" className="block text-center text-sm text-slate-500 hover:underline">Back to login</Link>
      </form>
    </div>
  )
}