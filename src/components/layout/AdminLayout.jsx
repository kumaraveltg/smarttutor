import { NavLink, Outlet } from 'react-router-dom'
import {
  Users,
  ShieldCheck,
  ListChecks,
  BookOpen,
  Layers,
  HelpCircle,
  CheckSquare,
} from 'lucide-react'
import TopBar from '../layout/TopBar'

// One entry per admin screen. Add a line here when you add a new entity page.
const NAV_ITEMS = [
  { to: '/admin/users', label: 'Users', icon: Users },
  { to: '/admin/roles', label: 'User Roles', icon: ShieldCheck },
  { to: '/admin/lov', label: 'List of Values', icon: ListChecks },
  { to: '/admin/chapter', label: 'Chapters', icon: BookOpen },
  { to: '/admin/subchapter', label: 'Subchapters', icon: Layers },
  { to: '/admin/questions', label: 'Questions', icon: HelpCircle },
  { to: '/admin/answers', label: 'Answers', icon: CheckSquare },
]

export default function AdminLayout() {
  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <aside className="w-56 shrink-0 bg-white border-r border-slate-200 p-4 flex flex-col overflow-y-auto">
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">
          Admin
        </h2>
        <nav className="space-y-1">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
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

      <div className="flex-1 flex flex-col min-h-0">
        <TopBar title="Admin Console" />
        <main className="flex-1 p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
