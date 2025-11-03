import { Outlet, Link, useLocation } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { Home, Users, FileText, BarChart3, Settings, LogOut, Database } from 'lucide-react'

export default function Layout({ admin = false }) {
  const location = useLocation()
  const { isAuthenticated, logout } = useAuthStore()

  const navItems = admin
    ? [
        { path: '/admin', label: 'Дашборд', icon: Home },
        { path: '/admin/participants', label: 'Участники', icon: Users },
        { path: '/admin/reports', label: 'Отчеты', icon: FileText },
        { path: '/admin/data', label: 'Данные', icon: Database },
        { path: '/admin/settings', label: 'Настройки', icon: Settings },
      ]
    : [
        { path: '/', label: 'Главная', icon: Home },
        { path: '/participants', label: 'Участники', icon: Users },
        { path: '/reports', label: 'Отчеты', icon: FileText },
      ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link to="/" className="text-2xl font-bold text-primary-600">
                90 дней
              </Link>
              <span className="ml-2 text-gray-500">10 целей</span>
            </div>

            {admin && isAuthenticated && (
              <button
                onClick={logout}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors"
              >
                <LogOut size={18} />
                <span>Выйти</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.path
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`
                    flex items-center gap-2 px-3 py-4 border-b-2 font-medium text-sm transition-colors
                    ${
                      isActive
                        ? 'border-primary-600 text-primary-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  <Icon size={18} />
                  {item.label}
                </Link>
              )
            })}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-gray-500 text-sm">
            © 2025 90 дней - 10 целей. Все права защищены.
          </p>
        </div>
      </footer>
    </div>
  )
}

