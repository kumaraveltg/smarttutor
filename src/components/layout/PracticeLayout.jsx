import { NavLink, Outlet } from 'react-router-dom'
import { MessageSquare } from 'lucide-react'
import TopBar from '../layout/TopBar'

// Add more entries here as practice section grows (e.g. History, Progress).
const NAV_ITEMS = [
  { to: '/practice', label: 'Chat', end: true, icon: MessageSquare },
]

export default function PracticeLayout() {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="w-56 shrink-0 bg-white border-r border-slate-200 p-4 flex flex-col">
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">
          Practice
        </h2>
        <nav className="space-y-1">
          {NAV_ITEMS.map(({ to, label, end, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2 rounded-md text-sm ${
                  isActive ? 'bg-brand-500 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex-1 flex flex-col">
        <TopBar title="Practice" />
        <main className="flex-1 p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
