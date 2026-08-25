import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    try {
      const user = await login(username, password)
      navigate(user.role === 'student' ? '/practice' : '/admin/users')
    } catch (err) {
      setError('Login failed. Check your username and password.')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <form onSubmit={handleSubmit} className="bg-white shadow-sm rounded-lg p-8 w-80 space-y-4">
        <h1 className="text-lg font-semibold text-slate-800">Sign in</h1>
        <input
          className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <input
          type="password"
          className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button className="w-full bg-brand-500 hover:bg-brand-600 text-white py-2 rounded-md text-sm">
          Sign in
        </button>
      </form>
    </div>
  )
}
