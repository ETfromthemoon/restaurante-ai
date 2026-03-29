import { ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useWebmasterStore } from '../store/useWebmasterStore';

interface Props { children: ReactNode; }

export default function WebmasterLayout({ children }: Props) {
  const { webmaster, logout } = useWebmasterStore();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/webmaster/login');
  }

  return (
    <div className="min-h-screen bg-gray-950 flex">
      {/* Sidebar */}
      <aside className="w-56 bg-gray-900 border-r border-gray-800 flex flex-col">
        {/* Branding */}
        <div className="px-4 py-5 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🏢</span>
            <div>
              <p className="text-white font-bold text-sm leading-tight">Webmaster</p>
              <p className="text-gray-400 text-xs">Panel de control</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          <NavLink
            to="/webmaster/tenants"
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-purple-700 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`
            }
          >
            <span>🏪</span> Restaurantes
          </NavLink>
        </nav>

        {/* Footer — usuario webmaster */}
        <div className="px-4 py-4 border-t border-gray-800">
          <p className="text-xs text-gray-400 truncate mb-2">{webmaster?.email}</p>
          <button
            onClick={handleLogout}
            className="w-full text-xs text-gray-500 hover:text-red-400 transition-colors text-left"
          >
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
