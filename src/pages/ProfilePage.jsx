import { User, Mail, ShieldCheck } from 'lucide-react'
import { useAuth } from '../auth/AuthContext' // adjust path if this file moves

// Basic read-only profile page. Add an edit form later if you need
// users to update their own name/password from here.
export default function ProfilePage() {
  const { user } = useAuth()

  const rows = [
    { icon: User, label: 'Username', value: user?.username || '-' },
    { icon: User, label: 'Full name', value: user?.full_name || '-' },
    { icon: ShieldCheck, label: 'Role', value: user?.role || '-' },
    { icon: Mail, label: 'Email', value: user?.email || '-' },
  ]

  return (
    <div className="max-w-md">
      <h2 className="text-lg font-semibold text-slate-700 mb-4">My Profile</h2>
      <div className="bg-white border border-slate-200 rounded-md divide-y divide-slate-100">
        {rows.map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex items-center gap-3 px-4 py-3">
            <Icon size={16} className="text-slate-400" />
            <div>
              <div className="text-xs text-slate-400">{label}</div>
              <div className="text-sm text-slate-700">{value}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
