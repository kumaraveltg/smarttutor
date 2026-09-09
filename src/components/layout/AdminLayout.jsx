import { NavLink, Outlet } from 'react-router-dom'

// One entry per admin screen. Add a line here when you add a new entity page.
const NAV_ITEMS = [
  { to: '/admin/users', label: 'Users' },
  { to: '/admin/roles', label: 'User Roles' },
  { to: '/admin/lov', label: 'List of Values' },
  { to: '/admin/chapter', label: 'Chapters' },
  { to: '/admin/subchapter', label: 'Subchapters' },
  { to: '/admin/questions', label: 'Questions' },
  { to: '/admin/answers', label: 'Answers' },
]

export default function AdminLayout() {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="w-56 shrink-0 bg-white border-r border-slate-200 p-4">
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">
          Admin
        </h2>
        <nav className="space-y-1">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `block px-3 py-2 rounded-md text-sm ${
                  isActive ? 'bg-brand-500 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="flex-1 p-6">
        <Outlet />
      </main>
    </div>
  )
}
