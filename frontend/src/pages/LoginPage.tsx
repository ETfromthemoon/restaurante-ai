import { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { UtensilsCrossed, ChefHat, Briefcase } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, orderLoading: loading } = useAppStore();

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
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden" style={{ background: '#060b14' }}>
      {/* Glow */}
      <div className="absolute w-[500px] h-[500px] rounded-full top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-emerald-500 blur-[150px] opacity-[0.08] pointer-events-none" />

      <div className="glass-strong glow-soft w-full max-w-sm p-8 relative z-10">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent to-accent-dark flex items-center justify-center text-2xl mx-auto mb-5">
            🍽
          </div>
          <h1 className="text-xl font-bold">Restaurante AI</h1>
          <p className="text-slate-500 text-sm mt-1">Inicia sesión para gestionar tu restaurante</p>
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
            className="btn-accent w-full justify-center !py-3 !mt-4 disabled:opacity-50"
          >
            {loading ? 'Ingresando...' : 'Iniciar Sesión'}
          </button>
        </form>

        <div className="mt-6">
          <p className="text-center text-slate-600 text-[11px] mb-3">Acceso rápido demo</p>
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
    </div>
  );
}
