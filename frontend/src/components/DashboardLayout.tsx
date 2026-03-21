import { ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, UtensilsCrossed, ChefHat, BookOpen, Wallet, Tag, LogOut, Sun, Moon, Download } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { useTheme } from '../store/useTheme';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface Props { children: ReactNode; }

interface NavItem {
  icon: ReactNode;
  label: string;
  path: string;
  roles: string[];
}

const navSections: { title: string; items: NavItem[] }[] = [
  {
    title: 'General',
    items: [
      { icon: <LayoutDashboard size={18} />, label: 'Dashboard', path: '/gerente', roles: ['manager'] },
      { icon: <UtensilsCrossed size={18} />, label: 'Mesas', path: '/mesas', roles: ['waiter', 'manager'] },
      { icon: <ChefHat size={18} />, label: 'Cocina', path: '/cocina', roles: ['cook', 'manager'] },
    ],
  },
  {
    title: 'Gestión',
    items: [
      { icon: <BookOpen size={18} />, label: 'Menú', path: '/gerente/menu', roles: ['manager'] },
      { icon: <Wallet size={18} />, label: 'Caja', path: '/gerente/caja', roles: ['manager'] },
      { icon: <Tag size={18} />, label: 'Promociones', path: '/gerente/promociones', roles: ['manager'] },
    ],
  },
];

function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { isDark, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      className="flex items-center gap-1.5 rounded-xl transition-all font-medium text-xs px-3 py-2 btn-ghost"
    >
      {isDark
        ? <><Sun size={14} className="text-yellow-400" />{!compact && <span>Modo claro</span>}</>
        : <><Moon size={14} className="text-indigo-500" />{!compact && <span>Modo oscuro</span>}</>
      }
    </button>
  );
}

export default function DashboardLayout({ children }: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAppStore();
  const { canInstall, isIOS, isInstalled, promptInstall } = usePWAInstall();

  const handleLogout = () => { logout(); navigate('/login'); };

  // Mostrar botón si hay prompt disponible (Chrome) o es iOS no instalada
  const showInstallBtn = !isInstalled && (canInstall || isIOS);

  return (
    <div className="flex min-h-screen relative">
      {/* Background glows */}
      <div className="bg-glow w-[600px] h-[600px] -top-48 -left-24 bg-emerald-500 fixed" />
      <div className="bg-glow w-[500px] h-[500px] -bottom-48 -right-24 bg-cyan-500 fixed" />

      {/* Sidebar */}
      <aside className="glass-sidebar w-56 min-h-screen p-4 flex flex-col sticky top-0 self-start shrink-0 z-10 hidden lg:flex">
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-3 pb-5 mb-5" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent to-accent-dark flex items-center justify-center text-lg">
            🍽
          </div>
          <span className="font-bold text-sm t-primary">Restaurante AI</span>
        </div>

        {/* Nav */}
        {navSections.map(section => {
          const visibleItems = section.items.filter(item => user && item.roles.includes(user.role));
          if (visibleItems.length === 0) return null;
          return (
            <div key={section.title} className="mb-2">
              <div className="text-[10px] uppercase tracking-[1.5px] px-3 mb-2 font-semibold t-faint">
                {section.title}
              </div>
              {visibleItems.map(item => {
                const isActive = location.pathname === item.path ||
                  (item.path !== '/gerente' && location.pathname.startsWith(item.path));
                return (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className={`flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all
                      ${isActive
                        ? 'text-accent bg-accent/10'
                        : 't-muted hover:t-primary hover:bg-black/[0.04] dark:hover:bg-white/[0.04]'
                      }`}
                  >
                    <span className={isActive ? 'opacity-100' : 'opacity-60'}>{item.icon}</span>
                    {item.label}
                  </button>
                );
              })}
            </div>
          );
        })}

        {/* Theme toggle */}
        <div className="mt-4 mb-2">
          <ThemeToggle />
        </div>

        {/* Botón instalar PWA */}
        {showInstallBtn && (
          <button
            onClick={isIOS ? undefined : promptInstall}
            title={isIOS ? 'Toca Compartir → Añadir a pantalla de inicio' : 'Instalar como app'}
            className="flex items-center gap-1.5 w-full rounded-xl px-3 py-2 text-xs font-semibold
                       bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors mb-2"
          >
            <Download size={13} />
            {isIOS ? 'Cómo instalar la app' : 'Instalar app'}
          </button>
        )}

        {/* User */}
        <div className="mt-auto glass-card !p-3 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-dark to-accent flex items-center justify-center text-xs font-bold text-white">
            {user?.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold truncate t-primary">{user?.name}</div>
            <div className="text-[10px] t-faint capitalize">
              {user?.role === 'waiter' ? 'Mesero' : user?.role === 'cook' ? 'Cocina' : 'Gerente'}
            </div>
          </div>
          <button onClick={handleLogout} className="t-faint hover:text-red-400 transition-colors">
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* Mobile header */}
      <div
        className="lg:hidden fixed top-0 left-0 right-0 z-50 px-4 py-3 flex items-center justify-between backdrop-blur-xl"
        style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-sidebar)' }}
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-accent-dark flex items-center justify-center text-sm">🍽</div>
          <span className="font-bold text-sm t-primary">Restaurante AI</span>
        </div>
        <div className="flex items-center gap-2">
          {showInstallBtn && (
            <button
              onClick={isIOS ? undefined : promptInstall}
              title={isIOS ? 'Cómo instalar' : 'Instalar app'}
              className="t-faint hover:text-red-400 transition-colors"
            >
              <Download size={18} />
            </button>
          )}
          <ThemeToggle compact />
          <button onClick={handleLogout} className="t-faint hover:text-red-400 transition-colors">
            <LogOut size={18} />
          </button>
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 p-6 lg:p-8 overflow-y-auto relative z-[1] lg:pt-8 pt-16">
        {children}
      </main>
    </div>
  );
}
