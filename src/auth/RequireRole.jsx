import { Navigate } from 'react-router-dom'
import { useAuth } from './AuthContext'

export default function RequireRole({ roles, children }) {
  const { user, loading } = useAuth()

  if (loading) return <div className="p-8 text-slate-400">Checking session…</div>
  if (!user) return <Navigate to="/login" replace />
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />

  return children
}
