import { NavLink, Outlet } from 'react-router-dom'
import { entities } from '../../config/entities'
import { useAuth } from '../../auth/AuthContext'

export default function AdminLayout() {
  const { user, logout } = useAuth()

  return (
    <div className="flex min-h-screen">
      <aside className="w-56 bg-slate-900 text-slate-200 p-4 space-y-1">
        <div className="text-white font-semibold mb-4">Tutor Admin</div>
        {Object.entries(entities).map(([key, entity]) => (
          <NavLink
            key={key}
            to={`/admin/${key}`}
            className={({ isActive }) =>
              `block px-3 py-2 rounded-md text-sm ${
                isActive ? 'bg-brand-600 text-white' : 'hover:bg-slate-800'
              }`
            }
          >
            {entity.label}
          </NavLink>
        ))}
        <button
          onClick={logout}
          className="block w-full text-left px-3 py-2 rounded-md text-sm text-slate-400 hover:bg-slate-800 mt-6"
        >
          Log out ({user?.username})
        </button>
      </aside>
      <main className="flex-1 bg-slate-50 p-6">
        <Outlet />
      </main>
    </div>
  )
}
