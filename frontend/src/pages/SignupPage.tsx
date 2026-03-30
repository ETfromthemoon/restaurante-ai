import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';

// ── Helpers ───────────────────────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 30);
}

const COUNTRIES = [
  { code: 'PE', flag: '🇵🇪', name: 'Perú' },
  { code: 'MX', flag: '🇲🇽', name: 'México' },
  { code: 'CO', flag: '🇨🇴', name: 'Colombia' },
  { code: 'AR', flag: '🇦🇷', name: 'Argentina' },
  { code: 'CL', flag: '🇨🇱', name: 'Chile' },
  { code: 'EC', flag: '🇪🇨', name: 'Ecuador' },
  { code: 'US', flag: '🇺🇸', name: 'USA' },
];

// ── Slug availability checker ─────────────────────────────────────────────────

type SlugState = 'idle' | 'checking' | 'available' | 'taken' | 'invalid';

function useSlugCheck(slug: string): SlugState {
  const [state, setState] = useState<SlugState>('idle');

  useEffect(() => {
    if (!slug || slug.length < 2) { setState('idle'); return; }
    if (!/^[a-z0-9-]+$/.test(slug)) { setState('invalid'); return; }

    setState('checking');
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/public/api/check-slug/${slug}`);
        const data = await res.json();
        setState(data.available ? 'available' : 'taken');
      } catch {
        setState('idle');
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [slug]);

  return state;
}

function SlugIndicator({ state, slug }: { state: SlugState; slug: string }) {
  if (!slug || slug.length < 2) return null;
  const map: Record<SlugState, { icon: string; text: string; color: string }> = {
    idle:      { icon: '',  text: '',                              color: '' },
    checking:  { icon: '⏳', text: 'Verificando...',               color: 'text-gray-400' },
    available: { icon: '✅', text: `${slug}.miapp.com disponible`, color: 'text-green-400' },
    taken:     { icon: '❌', text: 'Subdominio no disponible',      color: 'text-red-400' },
    invalid:   { icon: '⚠️', text: 'Solo letras, números y guiones', color: 'text-yellow-400' },
  };
  const m = map[state];
  if (!m.text) return null;
  return <p className={`text-xs mt-1 ${m.color}`}>{m.icon} {m.text}</p>;
}

// ── Main component ────────────────────────────────────────────────────────────

export default function SignupPage() {
  const [form, setForm] = useState({
    name: '', slug: '', email: '', password: '', country: 'PE',
  });
  const [slugEdited, setSlugEdited] = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [showPass,   setShowPass]   = useState(false);

  const slugState = useSlugCheck(form.slug);

  // Auto-generate slug from name while user hasn't manually edited it
  const handleNameChange = useCallback((name: string) => {
    setForm(f => ({
      ...f,
      name,
      slug: slugEdited ? f.slug : slugify(name),
    }));
  }, [slugEdited]);

  const handleSlugChange = useCallback((raw: string) => {
    const slug = raw.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setForm(f => ({ ...f, slug }));
    setSlugEdited(true);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (slugState === 'taken' || slugState === 'invalid') return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/public/api/signup', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Error al crear la cuenta');
        return;
      }

      // Redirect to Dodo checkout or directly to login
      window.location.href = data.redirectTo;
    } catch {
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  const canSubmit = (
    form.name.length >= 2 &&
    form.slug.length >= 2 &&
    form.email.includes('@') &&
    form.password.length >= 8 &&
    slugState !== 'taken' &&
    slugState !== 'invalid' &&
    slugState !== 'checking'
  );

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🍽️</div>
          <h1 className="text-3xl font-bold text-white">Crea tu cuenta</h1>
          <p className="text-gray-400 mt-2">
            Gestiona tu restaurante en minutos
          </p>
        </div>

        <div className="bg-gray-900 rounded-2xl shadow-2xl p-8 border border-gray-800">
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Nombre del restaurante */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Nombre del restaurante
              </label>
              <input
                type="text"
                value={form.name}
                onChange={e => handleNameChange(e.target.value)}
                required
                autoFocus
                placeholder="El Fogón Peruano"
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white
                           placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500
                           focus:border-transparent transition"
              />
            </div>

            {/* Subdominio */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Subdominio
              </label>
              <div className="flex items-center">
                <input
                  type="text"
                  value={form.slug}
                  onChange={e => handleSlugChange(e.target.value)}
                  required
                  placeholder="elfogon"
                  maxLength={30}
                  className="flex-1 px-4 py-3 bg-gray-800 border border-gray-700 rounded-l-xl text-white
                             placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500
                             focus:border-transparent transition"
                />
                <span className="px-3 py-3 bg-gray-700 border border-l-0 border-gray-700
                                 rounded-r-xl text-gray-400 text-sm whitespace-nowrap">
                  .miapp.com
                </span>
              </div>
              <SlugIndicator state={slugState} slug={form.slug} />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Email del gerente
              </label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                required
                placeholder="gerente@muestrario.com"
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white
                           placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500
                           focus:border-transparent transition"
              />
            </div>

            {/* Contraseña */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  required
                  minLength={8}
                  placeholder="Mínimo 8 caracteres"
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white
                             placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500
                             focus:border-transparent transition pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200
                             text-xs transition"
                >
                  {showPass ? 'Ocultar' : 'Ver'}
                </button>
              </div>
              {form.password.length > 0 && form.password.length < 8 && (
                <p className="text-xs text-yellow-400 mt-1">
                  ⚠️ Mínimo 8 caracteres ({form.password.length}/8)
                </p>
              )}
            </div>

            {/* País */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                País
              </label>
              <select
                value={form.country}
                onChange={e => setForm(f => ({ ...f, country: e.target.value }))}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white
                           focus:outline-none focus:ring-2 focus:ring-orange-500 transition"
              >
                {COUNTRIES.map(c => (
                  <option key={c.code} value={c.code}>
                    {c.flag} {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Error */}
            {error && (
              <div className="text-sm text-red-400 bg-red-900/30 border border-red-800
                              rounded-xl px-4 py-3">
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={!canSubmit || loading}
              className="w-full py-3.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-40
                         disabled:cursor-not-allowed text-white font-bold rounded-xl
                         transition-colors text-base shadow-lg shadow-orange-900/30"
            >
              {loading
                ? 'Creando cuenta...'
                : '🚀 Crear cuenta y pagar'}
            </button>

            {/* Fine print */}
            <p className="text-xs text-gray-500 text-center leading-relaxed">
              Al crear tu cuenta aceptas los términos de servicio.
              Serás redirigido a la pasarela de pago segura.
            </p>
          </form>
        </div>

        {/* Login link */}
        <p className="text-center text-gray-500 text-sm mt-6">
          ¿Ya tienes una cuenta?{' '}
          <Link to="/login" className="text-orange-400 hover:text-orange-300 font-medium">
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
