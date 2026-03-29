import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWebmasterStore } from '../store/useWebmasterStore';

export default function WebmasterLoginPage() {
  const { login, loading, error, clearError } = useWebmasterStore();
  const navigate = useNavigate();

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    clearError();
    await login(email, password);
    const { token } = useWebmasterStore.getState();
    if (token) navigate('/webmaster/tenants');
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-gray-900 rounded-2xl shadow-2xl p-8 border border-gray-800">
        {/* Logo / título */}
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">🏢</div>
          <h1 className="text-2xl font-bold text-white">Panel Webmaster</h1>
          <p className="text-gray-400 text-sm mt-1">Gestión de restaurantes</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoFocus
              placeholder="admin@miapp.com"
              className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white
                         placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white
                         placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          {error && (
            <div className="text-sm text-red-400 bg-red-900/30 border border-red-800 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50
                       text-white font-semibold rounded-lg transition-colors"
          >
            {loading ? 'Entrando...' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  );
}
