import { Outlet } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'

export default function PracticeLayout() {
  const { user, logout } = useAuth()
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-slate-200 bg-white px-6 py-3 flex justify-between items-center">
        <span className="font-semibold text-slate-800">Maths Practice</span>
        <button onClick={logout} className="text-sm text-slate-500 hover:underline">
          Log out ({user?.username})
        </button>
      </header>
      <main className="flex-1 bg-slate-50">
        <Outlet />
      </main>
    </div>
  )
}
