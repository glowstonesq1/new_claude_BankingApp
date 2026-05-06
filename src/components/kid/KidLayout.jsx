import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import useStore from '../../store/useStore'

const NAV_ITEMS = [
  { to: '/dashboard/home', icon: '🏠', label: 'Home' },
  { to: '/dashboard/invest', icon: '📈', label: 'Invest' },
  { to: '/dashboard/pay', icon: '💳', label: 'Pay' },
  { to: '/dashboard/goals', icon: '🎯', label: 'Goals' },
  { to: '/dashboard/report', icon: '📊', label: 'Report' },
]

export default function KidLayout() {
  const { profile, logout } = useStore()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col max-w-lg mx-auto">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-2">
          <img
            src="https://yt3.googleusercontent.com/NViANcNr_9xYoqoGY7if6hPZYIQ8cAD7Erxy1OoLBoCWDM-fI_13Gy37HNMDFKT8gfDdMWsv4Q=s900-c-k-c0x00ffffff-no-rj"
            alt="MuSo"
            className="w-8 h-8 rounded-lg object-cover"
          />
          <span className="font-display font-900 text-kidbank-purple text-lg">MuSo</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-display font-700 text-gray-600 text-sm">
            Hi, {profile?.display_name?.split(' ')[0]}! 👋
          </span>
          <button
            onClick={handleLogout}
            className="text-xs font-display font-700 text-gray-400 hover:text-red-500 transition-colors"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-auto pb-24">
        <Outlet />
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg bg-white border-t border-gray-100 safe-bottom z-20">
        <div className="flex">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 transition-all duration-150
                 ${isActive ? 'text-kidbank-purple' : 'text-gray-400'}`
              }
            >
              {({ isActive }) => (
                <>
                  <span className={`text-xl ${isActive ? 'scale-110' : 'scale-100'} transition-transform`}>
                    {item.icon}
                  </span>
                  <span className="font-display font-700 text-[10px]">{item.label}</span>
                  {isActive && (
                    <div className="w-1 h-1 rounded-full bg-kidbank-purple" />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
