import { useState } from 'react';
import { useAppStore } from '../store/useAppStore';

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
    <div className="min-h-screen bg-red-500 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="text-6xl mb-2">🍽️</div>
          <h1 className="text-2xl font-bold text-red-500">Restaurante AI</h1>
          <p className="text-gray-400 text-sm mt-1">Sistema de gestión inteligente</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-red-400 bg-gray-50"
          />
          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-red-400 bg-gray-50"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-red-500 text-white rounded-xl py-3 font-semibold text-sm disabled:opacity-50 active:bg-red-600"
          >
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>

        <div className="mt-6">
          <p className="text-center text-gray-400 text-xs mb-3">Acceso rápido demo</p>
          <div className="grid grid-cols-3 gap-2">
            {(['waiter', 'cook', 'manager'] as const).map((role, i) => (
              <button
                key={role}
                onClick={() => fillDemo(role)}
                className="bg-gray-100 rounded-lg py-2 text-xs text-gray-600 font-medium active:bg-gray-200"
              >
                {['🧑‍🍽️ Mesero', '👨‍🍳 Cocina', '👔 Gerente'][i]}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
