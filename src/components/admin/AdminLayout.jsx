import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import useStore from '../../store/useStore'

const TABS = [
  { to: '/admin/overview', label: 'Overview', icon: '📊' },
  { to: '/admin/kids', label: 'Kids', icon: '👧' },
  { to: '/admin/deposit', label: 'Deposits', icon: '💰' },
  { to: '/admin/market', label: 'Market', icon: '📈' },
  { to: '/admin/news', label: 'News', icon: '📰' },
  { to: '/admin/settings', label: 'Settings', icon: '⚙️' },
]

export default function AdminLayout() {
  const { profile, logout } = useStore()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="https://yt3.googleusercontent.com/NViANcNr_9xYoqoGY7if6hPZYIQ8cAD7Erxy1OoLBoCWDM-fI_13Gy37HNMDFKT8gfDdMWsv4Q=s900-c-k-c0x00ffffff-no-rj"
              alt="MuSo"
              className="w-8 h-8 rounded-lg object-cover"
            />
            <div>
              <span className="font-display font-900 text-kidbank-purple text-lg">MuSo</span>
              <span className="ml-2 text-xs font-display font-700 bg-purple-100 text-kidbank-purple px-2 py-0.5 rounded-full">Admin</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="font-display font-700 text-gray-600 text-sm hidden md:block">
              {profile?.display_name}
            </span>
            <button
              onClick={handleLogout}
              className="text-sm font-display font-700 text-gray-400 hover:text-red-500 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
        {/* Tab nav */}
        <div className="max-w-7xl mx-auto px-4 flex gap-1 overflow-x-auto scrollbar-hide pb-0">
          {TABS.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-2.5 font-display font-700 text-sm whitespace-nowrap
                 border-b-2 transition-all ${isActive
                  ? 'border-kidbank-purple text-kidbank-purple'
                  : 'border-transparent text-gray-500 hover:text-gray-700'}`
              }
            >
              <span>{tab.icon}</span>
              {tab.label}
            </NavLink>
          ))}
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto p-4 md:p-6">
        <Outlet />
      </main>
    </div>
  )
}
