import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import api from '../services/api';

interface OrderSummary {
  id: string;
  table_id: string;
  table?: { number: number };
  items: { menu_item?: { name: string; price: number }; quantity: number; effective_price: number | null }[];
}

interface SessionSummary {
  session: { id: string; cashier_name: string; opened_at: string; closed_at?: string };
  orders: OrderSummary[];
  total: number;
}

function fmt(iso: string) {
  return new Date(iso).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' });
}

function orderTotal(order: OrderSummary): number {
  return order.items.reduce((sum, i) => sum + (i.effective_price ?? i.menu_item?.price ?? 0) * i.quantity, 0);
}

export default function CajaHistorialPage() {
  const navigate = useNavigate();
  const { cajaHistory, fetchCajaHistory } = useAppStore();
  const [summaries, setSummaries] = useState<Record<string, SessionSummary>>({});
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  useEffect(() => { fetchCajaHistory(); }, []);

  async function toggle(sessionId: string) {
    if (expanded === sessionId) { setExpanded(null); return; }
    if (!summaries[sessionId]) {
      setLoadingId(sessionId);
      try {
        const { data } = await api.get(`/caja/${sessionId}/summary`);
        setSummaries(prev => ({ ...prev, [sessionId]: data }));
      } finally {
        setLoadingId(null);
      }
    }
    setExpanded(sessionId);
  }

  return (
    <div className="min-h-screen pb-8" style={{ background: 'var(--bg-base)' }}>
      <div className="banner-metallic-red text-white px-5 py-4 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => navigate('/gerente')} className="text-red-200 text-lg">←</button>
        <h1 className="font-semibold text-lg tracking-tight flex-1">Historial de Caja</h1>
      </div>

      <div className="p-4 space-y-3">
        {cajaHistory.length === 0 ? (
          <div className="card-mobile !p-8 text-center">
            <p className="text-4xl mb-3">🗂️</p>
            <p className="t-muted font-medium">Sin turnos registrados</p>
            <p className="t-faint text-sm mt-1 font-light">Los turnos cerrados aparecerán aquí</p>
          </div>
        ) : (
          cajaHistory.map(session => {
            const isOpen = expanded === session.id;
            const summary = summaries[session.id];
            const isLoading = loadingId === session.id;

            return (
              <div key={session.id} className="card-mobile overflow-hidden">
                {/* Cabecera del turno */}
                <button
                  onClick={() => toggle(session.id)}
                  className="w-full px-4 py-4 flex items-center justify-between text-left"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${session.closed_at ? 'bg-gray-400' : 'bg-green-500'}`} />
                      <p className="font-semibold t-primary text-sm">{session.cashier_name}</p>
                    </div>
                    <p className="text-xs t-faint mt-0.5 pl-4 font-light">
                      {fmt(session.opened_at)}
                      {session.closed_at ? ` → ${fmt(session.closed_at)}` : ' · En curso'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {summary && (
                      <span className="text-green-600 font-semibold text-sm">S/ {summary.total.toFixed(2)}</span>
                    )}
                    <span className="t-faint text-xs">{isLoading ? '...' : isOpen ? '▲' : '▼'}</span>
                  </div>
                </button>

                {/* Detalle expandido */}
                {isOpen && summary && (
                  <div className="px-4 py-3 space-y-3" style={{ borderTop: '1px solid var(--border)' }}>
                    {/* Resumen rápido */}
                    <div className="flex gap-3">
                      <div className="flex-1 rounded-lg p-3 text-center" style={{ background: 'var(--bg-surface)', borderRadius: '0.5rem' }}>
                        <p className="text-2xl font-semibold tracking-tight t-primary">{summary.orders.length}</p>
                        <p className="text-xs t-faint mt-0.5">pedido{summary.orders.length !== 1 ? 's' : ''}</p>
                      </div>
                      <div className="flex-1 bg-green-50 rounded-lg p-3 text-center">
                        <p className="text-2xl font-semibold tracking-tight text-green-600">S/ {summary.total.toFixed(2)}</p>
                        <p className="text-xs t-faint mt-0.5">total recaudado</p>
                      </div>
                    </div>

                    {/* Lista de pedidos */}
                    {summary.orders.length === 0 ? (
                      <p className="t-faint text-sm text-center py-2">Sin pedidos cobrados en este turno</p>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold t-faint uppercase tracking-wider">Pedidos cobrados</p>
                        {summary.orders.map(order => (
                          <div key={order.id} className="rounded-lg p-3" style={{ background: 'var(--bg-surface)', borderRadius: '0.5rem' }}>
                            <div className="flex justify-between items-center mb-2">
                              <span className="font-medium t-secondary text-sm">
                                Mesa {order.table?.number ?? order.table_id}
                              </span>
                              <span className="font-semibold t-primary text-sm">
                                S/ {orderTotal(order).toFixed(2)}
                              </span>
                            </div>
                            {order.items.map((item, idx) => (
                              <div key={idx} className="flex justify-between text-xs t-muted py-0.5">
                                <span>{item.menu_item?.name ?? '—'} ×{item.quantity}</span>
                                <span>S/ {((item.effective_price ?? item.menu_item?.price ?? 0) * item.quantity).toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
