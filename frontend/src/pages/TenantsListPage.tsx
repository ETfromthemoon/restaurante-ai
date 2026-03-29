import { useEffect, useState } from 'react';
import { useWebmasterStore, Tenant } from '../store/useWebmasterStore';

// ── Status badge ──────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  active:    'bg-green-900/60 text-green-300 border border-green-700',
  suspended: 'bg-red-900/60 text-red-300 border border-red-700',
  trial:     'bg-yellow-900/60 text-yellow-300 border border-yellow-700',
};

const STATUS_LABELS: Record<string, string> = {
  active:    'Activo',
  suspended: 'Suspendido',
  trial:     'Trial',
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLES[status] ?? STATUS_STYLES.active}`}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

// ── Create Tenant Modal ───────────────────────────────────────────────────────

interface CreateResult {
  tenant: Tenant;
  credentials: { email: string; tempPassword: string };
}

function CreateTenantModal({ onClose }: { onClose: () => void }) {
  const { createTenant } = useWebmasterStore();
  const [form, setForm] = useState({ slug: '', name: '', admin_email: '', plan: 'basic' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CreateResult | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await createTenant(form);
      setResult(res);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-900 rounded-2xl shadow-2xl p-6 w-full max-w-md border border-gray-700">
          <div className="text-center mb-4">
            <div className="text-4xl mb-2">✅</div>
            <h2 className="text-xl font-bold text-white">Restaurante creado</h2>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 space-y-2 mb-4">
            <p className="text-sm text-gray-300">
              <span className="text-gray-500">Nombre:</span>{' '}
              <span className="font-medium text-white">{result.tenant.name}</span>
            </p>
            <p className="text-sm text-gray-300">
              <span className="text-gray-500">Subdominio:</span>{' '}
              <span className="font-mono text-purple-400">{result.tenant.slug}.miapp.com</span>
            </p>
          </div>
          <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-4 space-y-2 mb-4">
            <p className="text-xs font-bold text-yellow-300 uppercase tracking-wide mb-1">
              Credenciales de acceso — comparte con el cliente
            </p>
            <p className="text-sm text-yellow-200">
              <span className="text-yellow-400">Email:</span> {result.credentials.email}
            </p>
            <p className="text-sm text-yellow-200">
              <span className="text-yellow-400">Password temporal:</span>{' '}
              <span className="font-mono bg-yellow-900/50 px-2 py-0.5 rounded">
                {result.credentials.tempPassword}
              </span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors"
          >
            Listo
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-2xl shadow-2xl p-6 w-full max-w-md border border-gray-700">
        <h2 className="text-xl font-bold text-white mb-5">Nuevo restaurante</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Nombre del restaurante</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              required
              placeholder="El Fogón Peruano"
              className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white
                         placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Slug (subdominio)
            </label>
            <div className="flex items-center gap-0">
              <input
                type="text"
                value={form.slug}
                onChange={e => setForm(f => ({ ...f, slug: e.target.value.toLowerCase() }))}
                required
                placeholder="elfogon"
                pattern="[a-z0-9-]+"
                className="flex-1 px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-l-lg text-white
                           placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <span className="px-3 py-2.5 bg-gray-700 border border-l-0 border-gray-700 rounded-r-lg
                               text-gray-400 text-sm whitespace-nowrap">
                .miapp.com
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">Solo letras minúsculas, números y guiones</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Email del administrador</label>
            <input
              type="email"
              value={form.admin_email}
              onChange={e => setForm(f => ({ ...f, admin_email: e.target.value }))}
              required
              placeholder="gerente@elfogon.com"
              className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white
                         placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Plan</label>
            <select
              value={form.plan}
              onChange={e => setForm(f => ({ ...f, plan: e.target.value }))}
              className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white
                         focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="basic">Basic</option>
              <option value="pro">Pro</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </div>

          {error && (
            <div className="text-sm text-red-400 bg-red-900/30 border border-red-800 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white
                         font-semibold rounded-lg transition-colors"
            >
              {submitting ? 'Creando...' : 'Crear restaurante'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function TenantsListPage() {
  const { tenants, loading, error, fetchTenants, suspendTenant, activateTenant, deleteTenant } = useWebmasterStore();
  const [showCreate, setShowCreate] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => { fetchTenants(); }, []);

  async function handleSuspend(t: Tenant) {
    if (!confirm(`¿Suspender "${t.name}"? Los usuarios no podrán acceder.`)) return;
    setActionLoading(t.id);
    try { await suspendTenant(t.id); } finally { setActionLoading(null); }
  }

  async function handleActivate(t: Tenant) {
    setActionLoading(t.id);
    try { await activateTenant(t.id); } finally { setActionLoading(null); }
  }

  async function handleDelete(t: Tenant) {
    if (!confirm(`¿Eliminar definitivamente "${t.name}"? Esta acción no se puede deshacer.`)) return;
    setActionLoading(t.id);
    try { await deleteTenant(t.id); } finally { setActionLoading(null); }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Restaurantes</h1>
          <p className="text-gray-400 text-sm mt-0.5">{tenants.length} restaurante{tenants.length !== 1 ? 's' : ''} registrados</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white
                     font-semibold rounded-lg transition-colors"
        >
          <span>+</span> Nuevo restaurante
        </button>
      </div>

      {error && (
        <div className="mb-4 text-sm text-red-400 bg-red-900/30 border border-red-800 rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {/* Table */}
      {loading && tenants.length === 0 ? (
        <div className="text-center py-16 text-gray-500">Cargando...</div>
      ) : tenants.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <div className="text-4xl mb-3">🏪</div>
          <p>Aún no hay restaurantes registrados</p>
          <button
            onClick={() => setShowCreate(true)}
            className="mt-4 text-purple-400 hover:text-purple-300 text-sm underline"
          >
            Crear el primero
          </button>
        </div>
      ) : (
        <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-800 bg-gray-800/50">
              <tr>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Restaurante</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Subdominio</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Plan</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Estado</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Creado</th>
                <th className="text-right px-4 py-3 text-gray-400 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {tenants.map(tenant => (
                <tr key={tenant.id} className="hover:bg-gray-800/30 transition-colors">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-white">{tenant.name}</p>
                      <p className="text-xs text-gray-500">{tenant.admin_email}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-purple-400 text-xs">
                      {tenant.slug}.miapp.com
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="capitalize text-gray-300">{tenant.plan}</span>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={tenant.status} />
                  </td>
                  <td className="px-4 py-3 text-gray-400">
                    {new Date(tenant.created_at).toLocaleDateString('es-PE', {
                      day: '2-digit', month: 'short', year: 'numeric'
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {tenant.status === 'suspended' ? (
                        <button
                          onClick={() => handleActivate(tenant)}
                          disabled={actionLoading === tenant.id}
                          className="text-xs px-2.5 py-1 bg-green-900/50 hover:bg-green-900 text-green-300
                                     border border-green-700 rounded-md transition-colors disabled:opacity-50"
                        >
                          Activar
                        </button>
                      ) : (
                        <button
                          onClick={() => handleSuspend(tenant)}
                          disabled={actionLoading === tenant.id}
                          className="text-xs px-2.5 py-1 bg-yellow-900/50 hover:bg-yellow-900 text-yellow-300
                                     border border-yellow-700 rounded-md transition-colors disabled:opacity-50"
                        >
                          Suspender
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(tenant)}
                        disabled={actionLoading === tenant.id}
                        className="text-xs px-2.5 py-1 bg-red-900/50 hover:bg-red-900 text-red-300
                                   border border-red-700 rounded-md transition-colors disabled:opacity-50"
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && <CreateTenantModal onClose={() => setShowCreate(false)} />}
    </div>
  );
}
