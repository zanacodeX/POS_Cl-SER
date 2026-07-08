import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import useAuthStore from '../store/auth'

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: '📊', adminOnly: true },
  { to: '/pos', label: 'POS', icon: '🛒', adminOnly: false },
  { to: '/products', label: 'Products', icon: '📦', adminOnly: true },
  { to: '/categories', label: 'Categories', icon: '🏷️', adminOnly: true },
  { to: '/customers', label: 'Customers', icon: '👥', adminOnly: false },
  { to: '/orders', label: 'Orders', icon: '📋', adminOnly: false },
  { to: '/users', label: 'Users', icon: '👤', adminOnly: true },
  { to: '/suppliers', label: 'Suppliers', icon: '🏭', adminOnly: true },
  { to: '/purchase-orders', label: 'Purchases', icon: '📥', adminOnly: true },

]

export default function Layout({ children }) {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const visibleItems = navItems.filter((item) => !item.adminOnly || user?.role === 'admin')

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-gray-100">
      <header className="bg-[#1a1a2e] text-white shadow-lg">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="lg:hidden p-2 hover:bg-white/10 rounded-lg text-xl"
            >
              ☰
            </button>
            <h1 className="text-lg font-bold tracking-wider">Pixel Art</h1>
            <span className="hidden sm:inline text-xs text-gray-400">POS System</span>
          </div>

          <nav className="hidden lg:flex items-center gap-1">
            {visibleItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `px-3 py-2 text-sm rounded-lg transition-colors ${
                    isActive
                      ? 'bg-[#6C63FF]/20 text-[#6C63FF] font-semibold'
                      : 'text-gray-300 hover:bg-white/10 hover:text-white'
                  }`
                }
              >
                <span className="mr-1.5">{item.icon}</span>
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-gray-200">{user?.full_name || user?.username}</p>
              <span
                className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${
                  user?.role === 'admin'
                    ? 'bg-purple-700 text-purple-200'
                    : 'bg-blue-700 text-blue-200'
                }`}
              >
                {user?.role}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="px-3 py-2 text-sm text-red-300 hover:bg-white/10 rounded-lg font-medium transition-colors"
            >
              Logout
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="lg:hidden border-t border-white/10">
            {visibleItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 text-sm transition-colors ${
                    isActive
                      ? 'bg-[#6C63FF]/20 text-[#6C63FF] font-semibold'
                      : 'text-gray-300 hover:bg-white/10 hover:text-white'
                  }`
                }
              >
                <span className="text-lg">{item.icon}</span>
                {item.label}
              </NavLink>
            ))}
          </div>
        )}
      </header>

      <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>

      <footer className="bg-white border-t border-gray-200 px-4 py-2 text-center text-xs text-gray-400">
        v2.0.0 — Zana Codex Creation
      </footer>
    </div>
  )
}
