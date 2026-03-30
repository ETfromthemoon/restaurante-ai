import { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { useTheme } from '../store/useTheme';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { UtensilsCrossed, ChefHat, Briefcase, Sun, Moon, Download, Share2 } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, orderLoading: loading } = useAppStore();

  // Detectar si el usuario viene de completar el pago
  const isWelcome = new URLSearchParams(window.location.search).get('welcome') === '1';
  const { isDark, toggle } = useTheme();
  const { canInstall, isIOS, isInstalled, promptInstall } = usePWAInstall();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email && password) login(email, password);
  };

  const fillDemo = (role: 'waiter' | 'cook' | 'manager') => {
    const map = {
      waiter:  'mesero@restaurante.com',
      cook:    'cocina@restaurante.com',
      manager: 'gerente@restaurante.com',
    };
    setEmail(map[role]);
    setPassword('1234');
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: 'var(--bg-base)' }}
    >
      {/* Glow */}
      <div className="absolute w-[600px] h-[600px] rounded-full top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-emerald-500 blur-[180px]"
           style={{ opacity: 'var(--glow-opacity)', pointerEvents: 'none' }} />
      <div className="absolute w-[300px] h-[300px] rounded-full -top-20 -right-20 bg-cyan-500 blur-[120px]"
           style={{ opacity: 'var(--glow-opacity)', pointerEvents: 'none' }} />

      {/* Theme toggle — top right */}
      <button
        onClick={toggle}
        title={isDark ? 'Modo claro' : 'Modo oscuro'}
        className="absolute top-5 right-5 z-10 btn-ghost !px-3 !py-2"
      >
        {isDark
          ? <><Sun size={14} className="text-yellow-400" /><span className="text-xs font-light">Claro</span></>
          : <><Moon size={14} className="text-indigo-500" /><span className="text-xs font-light">Oscuro</span></>
        }
      </button>

      <div className="glass-strong glow-soft w-full max-w-sm p-8 relative z-10">
        {/* Banner de bienvenida post-pago */}
        {isWelcome && (
          <div className="mb-6 bg-green-900/40 border border-green-600 rounded-xl px-4 py-3 text-center">
            <p className="text-green-300 font-semibold text-sm">🎉 ¡Pago exitoso!</p>
            <p className="text-green-400 text-xs mt-0.5">Tu cuenta está lista. Inicia sesión para empezar.</p>
          </div>
        )}

        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-5 relative overflow-hidden"
               style={{ background: 'linear-gradient(135deg, #059669 0%, #10b981 50%, #34d399 100%)', boxShadow: '0 8px 30px rgba(16, 185, 129, 0.25), inset 0 1px 0 rgba(255,255,255,0.15)' }}>
            🍽
            <div className="absolute inset-0" style={{ background: 'linear-gradient(115deg, rgba(255,255,255,0) 35%, rgba(255,255,255,0.12) 50%, rgba(255,255,255,0) 65%)' }} />
          </div>
          <h1 className="text-xl font-semibold t-primary tracking-wide">Restaurante AI</h1>
          <p className="text-sm mt-2 t-muted font-light">Inicia sesión para gestionar tu restaurante</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="email"
            placeholder="correo@restaurante.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="input-glass"
          />
          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="input-glass"
          />
          <button
            type="submit"
            disabled={loading}
            className="btn-accent w-full justify-center !py-3.5 !mt-5 text-sm"
          >
            {loading ? 'Ingresando...' : 'Iniciar Sesión'}
          </button>
        </form>

        <div className="mt-7">
          <p className="text-center text-[11px] mb-3 t-muted font-light tracking-wide uppercase">Acceso rápido demo</p>
          <div className="grid grid-cols-3 gap-2">
            <button onClick={() => fillDemo('waiter')} className="btn-ghost !py-2.5 justify-center text-xs gap-1.5">
              <UtensilsCrossed size={13} /> Mesero
            </button>
            <button onClick={() => fillDemo('cook')} className="btn-ghost !py-2.5 justify-center text-xs gap-1.5">
              <ChefHat size={13} /> Cocina
            </button>
            <button onClick={() => fillDemo('manager')} className="btn-ghost !py-2.5 justify-center text-xs gap-1.5">
              <Briefcase size={13} /> Gerente
            </button>
          </div>
        </div>
      </div>

      {/* Aviso de instalación PWA */}
      {!isInstalled && (canInstall || isIOS) && (
        <div className="absolute bottom-6 left-0 right-0 flex justify-center px-4">
          {canInstall ? (
            <button
              onClick={promptInstall}
              className="flex items-center gap-2 text-xs font-medium px-5 py-2.5 rounded-full transition-colors border"
              style={{
                background: 'linear-gradient(135deg, rgba(220,38,38,0.08), rgba(239,68,68,0.12))',
                borderColor: 'rgba(220,38,38,0.15)',
                color: '#ef4444',
              }}
            >
              <Download size={13} />
              Instalar como app
            </button>
          ) : (
            <p className="flex items-center gap-1.5 text-xs t-muted text-center font-light">
              <Share2 size={12} />
              Para instalar: toca{' '}
              <span className="font-medium t-secondary">Compartir → Añadir a pantalla de inicio</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
