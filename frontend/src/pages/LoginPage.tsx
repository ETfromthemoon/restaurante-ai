import { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { useTheme } from '../store/useTheme';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { UtensilsCrossed, ChefHat, Briefcase, Sun, Moon, Download, Share2 } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, orderLoading: loading } = useAppStore();
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
      <div className="absolute w-[500px] h-[500px] rounded-full top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-emerald-500 blur-[150px]"
           style={{ opacity: 'var(--glow-opacity)', pointerEvents: 'none' }} />

      {/* Theme toggle — top right */}
      <button
        onClick={toggle}
        title={isDark ? 'Modo claro' : 'Modo oscuro'}
        className="absolute top-4 right-4 z-10 btn-ghost !px-3 !py-2"
      >
        {isDark
          ? <><Sun size={15} className="text-yellow-400" /><span className="text-xs">Claro</span></>
          : <><Moon size={15} className="text-indigo-500" /><span className="text-xs">Oscuro</span></>
        }
      </button>

      <div className="glass-strong glow-soft w-full max-w-sm p-8 relative z-10">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent to-accent-dark flex items-center justify-center text-2xl mx-auto mb-5">
            🍽
          </div>
          <h1 className="text-xl font-bold t-primary">Restaurante AI</h1>
          <p className="text-sm mt-1 t-muted">Inicia sesión para gestionar tu restaurante</p>
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
            className="btn-accent w-full justify-center !py-3 !mt-4"
          >
            {loading ? 'Ingresando...' : 'Iniciar Sesión'}
          </button>
        </form>

        <div className="mt-6">
          <p className="text-center text-[11px] mb-3 t-faint">Acceso rápido demo</p>
          <div className="grid grid-cols-3 gap-2">
            <button onClick={() => fillDemo('waiter')} className="btn-ghost !py-2 justify-center text-xs gap-1.5">
              <UtensilsCrossed size={14} /> Mesero
            </button>
            <button onClick={() => fillDemo('cook')} className="btn-ghost !py-2 justify-center text-xs gap-1.5">
              <ChefHat size={14} /> Cocina
            </button>
            <button onClick={() => fillDemo('manager')} className="btn-ghost !py-2 justify-center text-xs gap-1.5">
              <Briefcase size={14} /> Gerente
            </button>
          </div>
        </div>
      </div>

      {/* Aviso de instalación PWA — solo si no está instalada */}
      {!isInstalled && (canInstall || isIOS) && (
        <div className="absolute bottom-6 left-0 right-0 flex justify-center px-4">
          {canInstall ? (
            <button
              onClick={promptInstall}
              className="flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-full
                         bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors border border-red-500/20"
            >
              <Download size={13} />
              Instalar como app
            </button>
          ) : (
            <p className="flex items-center gap-1.5 text-xs t-faint text-center">
              <Share2 size={12} />
              Para instalar: toca{' '}
              <span className="font-semibold t-muted">Compartir → Añadir a pantalla de inicio</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
