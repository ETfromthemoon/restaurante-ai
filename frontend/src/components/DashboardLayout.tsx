import { ReactNode, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, UtensilsCrossed, ChefHat, BookOpen, Wallet, Tag, LogOut, Sun, Moon, Download, Menu, X } from 'lucide-react';
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
      { icon: <LayoutDashboard size={17} />, label: 'Dashboard', path: '/gerente', roles: ['manager'] },
      { icon: <UtensilsCrossed size={17} />, label: 'Mesas', path: '/mesas', roles: ['waiter', 'manager'] },
      { icon: <ChefHat size={17} />, label: 'Cocina', path: '/cocina', roles: ['cook', 'manager'] },
    ],
  },
  {
    title: 'Gestión',
    items: [
      { icon: <BookOpen size={17} />, label: 'Menú', path: '/gerente/menu', roles: ['manager'] },
      { icon: <Wallet size={17} />, label: 'Caja', path: '/gerente/caja', roles: ['manager'] },
      { icon: <Tag size={17} />, label: 'Promociones', path: '/gerente/promociones', roles: ['manager'] },
    ],
  },
];

function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { isDark, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      className="flex items-center gap-1.5 rounded-xl transition-all font-normal text-xs px-3 py-2 btn-ghost"
    >
      {isDark
        ? <><Sun size={13} className="text-yellow-400" />{!compact && <span className="font-light">Modo claro</span>}</>
        : <><Moon size={13} className="text-indigo-500" />{!compact && <span className="font-light">Modo oscuro</span>}</>
      }
    </button>
  );
}

export default function DashboardLayout({ children }: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAppStore();
  const { canInstall, isIOS, isInstalled, promptInstall } = usePWAInstall();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); };
  const handleNav = (path: string) => { navigate(path); setDrawerOpen(false); };

  const showInstallBtn = !isInstalled && (canInstall || isIOS);

  return (
    <div className="flex min-h-screen relative">
      {/* Background glows */}
      <div className="bg-glow w-[700px] h-[700px] -top-48 -left-24 bg-emerald-500 fixed" />
      <div className="bg-glow w-[500px] h-[500px] -bottom-48 -right-24 bg-cyan-500 fixed" />

      {/* Sidebar */}
      <aside className="glass-sidebar w-56 min-h-screen p-4 flex flex-col sticky top-0 self-start shrink-0 z-10 hidden lg:flex">
        {/* Logo */}
        <div className="flex items-center gap-3 px-3 pb-5 mb-5" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg relative overflow-hidden"
               style={{ background: 'linear-gradient(135deg, #059669, #10b981, #34d399)', boxShadow: '0 4px 12px rgba(16,185,129,0.2)' }}>
            🍽
            <div className="absolute inset-0" style={{ background: 'linear-gradient(115deg, rgba(255,255,255,0) 35%, rgba(255,255,255,0.12) 50%, rgba(255,255,255,0) 65%)' }} />
          </div>
          <span className="font-semibold text-sm t-primary tracking-wide">Restaurante AI</span>
        </div>

        {/* Nav */}
        {navSections.map(section => {
          const visibleItems = section.items.filter(item => user && item.roles.includes(user.role));
          if (visibleItems.length === 0) return null;
          return (
            <div key={section.title} className="mb-3">
              <div className="text-[10px] uppercase tracking-[0.15em] px-3 mb-2 font-medium t-muted">
                {section.title}
              </div>
              {visibleItems.map(item => {
                const isActive = location.pathname === item.path ||
                  (item.path !== '/gerente' && location.pathname.startsWith(item.path));
                return (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className={`flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-[13px] transition-all
                      ${isActive
                        ? 'text-accent font-medium bg-accent/8'
                        : 't-muted font-normal hover:t-primary hover:bg-black/[0.03] dark:hover:bg-white/[0.03]'
                      }`}
                  >
                    <span className={isActive ? 'opacity-100' : 'opacity-50'}>{item.icon}</span>
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
            className="flex items-center gap-1.5 w-full rounded-xl px-3 py-2 text-xs font-medium transition-colors mb-2"
            style={{
              background: 'linear-gradient(135deg, rgba(220,38,38,0.06), rgba(239,68,68,0.10))',
              color: '#ef4444',
              border: '1px solid rgba(220,38,38,0.10)',
            }}
          >
            <Download size={12} />
            {isIOS ? 'Cómo instalar la app' : 'Instalar app'}
          </button>
        )}

        {/* User */}
        <div className="mt-auto glass-card !p-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-semibold text-white relative overflow-hidden"
               style={{ background: 'linear-gradient(135deg, #059669, #10b981, #34d399)' }}>
            {user?.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
            <div className="absolute inset-0" style={{ background: 'linear-gradient(115deg, rgba(255,255,255,0) 35%, rgba(255,255,255,0.12) 50%, rgba(255,255,255,0) 65%)' }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium truncate t-primary">{user?.name}</div>
            <div className="text-[10px] t-muted font-light capitalize">
              {user?.role === 'waiter' ? 'Mesero' : user?.role === 'cook' ? 'Cocina' : 'Gerente'}
            </div>
          </div>
          <button onClick={handleLogout} className="t-muted hover:text-red-400 transition-colors">
            <LogOut size={15} />
          </button>
        </div>
      </aside>

      {/* Mobile header */}
      <div
        className="lg:hidden fixed top-0 left-0 right-0 z-50 px-4 py-3 flex items-center justify-between backdrop-blur-2xl"
        style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-sidebar)' }}
      >
        <div className="flex items-center gap-2.5">
          {/* Hamburger */}
          <button
            onClick={() => setDrawerOpen(true)}
            className="t-muted hover:t-primary transition-colors p-1 -ml-1 rounded-lg"
            aria-label="Abrir menú"
          >
            <Menu size={20} />
          </button>
          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm relative overflow-hidden"
               style={{ background: 'linear-gradient(135deg, #059669, #10b981, #34d399)' }}>
            🍽
          </div>
          <span className="font-semibold text-sm t-primary tracking-wide">Restaurante AI</span>
        </div>
        <div className="flex items-center gap-2">
          {showInstallBtn && (
            <button
              onClick={isIOS ? undefined : promptInstall}
              title={isIOS ? 'Cómo instalar' : 'Instalar app'}
              className="t-muted hover:text-red-400 transition-colors"
            >
              <Download size={17} />
            </button>
          )}
          <ThemeToggle compact />
          <button onClick={handleLogout} className="t-muted hover:text-red-400 transition-colors">
            <LogOut size={17} />
          </button>
        </div>
      </div>

      {/* Mobile Drawer overlay */}
      {drawerOpen && (
        <div
          className="lg:hidden fixed inset-0 z-[60]"
          onClick={() => setDrawerOpen(false)}
          style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(2px)' }}
        />
      )}

      {/* Mobile Drawer panel */}
      <div
        className="lg:hidden fixed top-0 left-0 bottom-0 z-[70] w-64 flex flex-col p-4 transition-transform duration-300"
        style={{
          background: 'var(--bg-sidebar)',
          borderRight: '1px solid var(--border)',
          transform: drawerOpen ? 'translateX(0)' : 'translateX(-100%)',
          boxShadow: drawerOpen ? '4px 0 32px rgba(0,0,0,0.4)' : 'none',
        }}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                 style={{ background: 'linear-gradient(135deg, #059669, #10b981, #34d399)' }}>
              🍽
            </div>
            <span className="font-semibold text-sm t-primary">Restaurante AI</span>
          </div>
          <button onClick={() => setDrawerOpen(false)} className="t-muted hover:t-primary transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Nav links */}
        {navSections.map(section => {
          const visibleItems = section.items.filter(item => user && item.roles.includes(user.role));
          if (visibleItems.length === 0) return null;
          return (
            <div key={section.title} className="mb-4">
              <div className="text-[10px] uppercase tracking-[0.15em] px-3 mb-2 font-medium t-muted">
                {section.title}
              </div>
              {visibleItems.map(item => {
                const isActive = location.pathname === item.path ||
                  (item.path !== '/gerente' && location.pathname.startsWith(item.path));
                return (
                  <button
                    key={item.path}
                    onClick={() => handleNav(item.path)}
                    className={`flex items-center gap-2.5 w-full px-3 py-3 rounded-xl text-[13px] transition-all mb-0.5
                      ${isActive
                        ? 'text-accent font-medium bg-accent/8'
                        : 't-muted font-normal hover:t-primary hover:bg-black/[0.03] dark:hover:bg-white/[0.03]'
                      }`}
                  >
                    <span className={isActive ? 'opacity-100' : 'opacity-50'}>{item.icon}</span>
                    {item.label}
                  </button>
                );
              })}
            </div>
          );
        })}

        {/* User info + theme al fondo */}
        <div className="mt-auto space-y-3">
          <ThemeToggle />
          <div className="glass-card !p-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-semibold text-white"
                 style={{ background: 'linear-gradient(135deg, #059669, #10b981, #34d399)' }}>
              {user?.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium truncate t-primary">{user?.name}</div>
              <div className="text-[10px] t-muted font-light capitalize">
                {user?.role === 'waiter' ? 'Mesero' : user?.role === 'cook' ? 'Cocina' : 'Gerente'}
              </div>
            </div>
            <button onClick={handleLogout} className="t-muted hover:text-red-400 transition-colors">
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 p-6 lg:p-8 overflow-y-auto relative z-[1] lg:pt-8 pt-16">
        {children}
      </main>
    </div>
  );
}
