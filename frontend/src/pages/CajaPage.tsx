import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import api from '../services/api';

interface Summary {
  session: { id: string; cashier_name: string; opened_at: string; closed_at?: string };
  orders: any[];
  total: number;
}

export default function CajaPage() {
  const navigate = useNavigate();
  const { activeCajaSession, cajaHistory, fetchActiveCaja, openCaja, closeCaja, fetchCajaHistory } = useAppStore();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchActiveCaja();
    fetchCajaHistory();
  }, []);

  async function handleOpen() {
    setLoading(true);
    await openCaja();
    await fetchActiveCaja();
    await fetchCajaHistory();
    setLoading(false);
  }

  async function handleCloseClick() {
    if (!activeCajaSession) return;
    setLoading(true);
    try {
      const { data } = await api.get(`/caja/${activeCajaSession.id}/summary`);
      setSummary(data);
      setShowConfirm(true);
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirmClose() {
    if (!activeCajaSession) return;
    setLoading(true);
    await closeCaja(activeCajaSession.id);
    await fetchCajaHistory();
    setSummary(null);
    setShowConfirm(false);
    setLoading(false);
  }

  function fmt(iso: string) {
    return new Date(iso).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' });
  }

  return (
    <div className="min-h-screen pb-8" style={{ background: 'var(--bg-base)' }}>
      {/* Header */}
      <div className="banner-metallic-red text-white px-5 py-4 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => navigate('/gerente')} className="text-red-200 text-lg">←</button>
        <h1 className="font-semibold text-lg tracking-tight flex-1">Caja</h1>
      </div>

      <div className="p-4 space-y-4">
        {/* Estado de caja */}
        {!activeCajaSession ? (
          <div className="card-mobile !p-6 text-center space-y-3">
            <div className="text-4xl">🔒</div>
            <p className="font-semibold t-primary">Sin caja abierta</p>
            <p className="t-muted text-sm font-light">Abre un turno para registrar cobros</p>
            <button
              onClick={handleOpen}
              disabled={loading}
              className="w-full btn-metallic-teal rounded-xl py-3 font-medium disabled:opacity-50"
            >
              {loading ? 'Abriendo...' : 'Abrir Caja'}
            </button>
          </div>
        ) : (
          <div className="card-mobile !p-6 space-y-3">
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></span>
              <p className="font-semibold t-primary">Caja abierta</p>
            </div>
            <p className="text-sm t-secondary">Cajero: <span className="font-medium">{activeCajaSession.cashier_name}</span></p>
            <p className="text-sm t-secondary">Apertura: <span className="font-medium">{fmt(activeCajaSession.opened_at)}</span></p>
            <button
              onClick={handleCloseClick}
              disabled={loading}
              className="w-full btn-metallic-red rounded-xl py-3 font-medium disabled:opacity-50"
            >
              {loading ? 'Cargando...' : 'Cerrar Caja'}
            </button>
          </div>
        )}

        {/* Modal de confirmación de cierre */}
        {showConfirm && summary && (
          <div className="fixed inset-0 bg-black/50 flex items-end z-50" onClick={() => setShowConfirm(false)}>
            <div className="w-full rounded-t-2xl p-6 space-y-4" style={{ background: 'var(--bg-surface-strong)' }} onClick={e => e.stopPropagation()}>
              <h2 className="font-semibold t-primary text-lg tracking-tight">Resumen de cierre</h2>
              <div className="flex justify-between">
                <span className="t-muted text-sm">Pedidos cobrados</span>
                <span className="font-semibold">{summary.orders.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="t-muted text-sm">Total recaudado</span>
                <span className="font-semibold text-green-600 text-xl">S/ {summary.total.toFixed(2)}</span>
              </div>
              <button
                onClick={handleConfirmClose}
                disabled={loading}
                className="w-full btn-metallic-red rounded-xl py-3 font-medium disabled:opacity-50"
              >
                {loading ? 'Cerrando...' : 'Confirmar cierre'}
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                className="btn-ghost w-full rounded-xl py-3 font-medium"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Historial */}
        <button
          onClick={() => navigate('/gerente/caja/historial')}
          className="w-full bg-gray-700 text-white rounded-xl py-3 font-medium"
        >
          Ver historial de turnos 🗂️
        </button>
      </div>
    </div>
  );
}
