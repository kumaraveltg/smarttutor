import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, LogOut, ChevronDown } from 'lucide-react'
import { useAuth } from '../../auth/AuthContext' // adjust path if TopBar moves

// Shared top bar: shows the app/section title on the left and a
// profile/logout dropdown on the right. Used inside AdminLayout and
// PracticeLayout so both sections behave the same way.
export default function TopBar({ title }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const menuRef = useRef(null)

  // Close the dropdown when clicking outside of it
  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleLogout() {
    setOpen(false)
    logout?.()
    navigate('/login')
  }

  const displayName = user?.full_name || user?.username || 'Account'

  return (
    <header className="h-14 shrink-0 bg-white border-b border-slate-200 px-6 flex items-center justify-between">
      <h1 className="text-base font-semibold text-slate-700">{title}</h1>

      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-slate-100 text-sm text-slate-700"
        >
          <span className="w-7 h-7 rounded-full bg-brand-500 text-white flex items-center justify-center text-xs font-semibold uppercase">
            {displayName.slice(0, 1)}
          </span>
          <span className="max-w-[140px] truncate">{displayName}</span>
          <ChevronDown size={16} className="text-slate-400" />
        </button>

        {open && (
          <div className="absolute right-0 mt-1 w-44 bg-white border border-slate-200 rounded-md shadow-lg py-1 z-50">
            <button
              onClick={() => {
                setOpen(false)
                navigate('profile')
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"
            >
              <User size={16} />
              Profile
            </button>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-slate-100"
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
