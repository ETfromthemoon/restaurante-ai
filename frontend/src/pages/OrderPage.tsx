import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { useToast } from '../hooks/useToast';
import { OrderItem } from '../types';

const ITEM_STATUS: Record<string, string> = {
  pending:   '⏳',
  preparing: '👨‍🍳',
  done:      '✅',
};

const BANNER: Record<string, { bg: string; label: string }> = {
  open:    { bg: 'bg-blue-500',   label: '📝 Pedido abierto — agrega platos' },
  kitchen: { bg: 'bg-orange-500', label: '👨‍🍳 En cocina...' },
  ready:   { bg: 'bg-green-500',  label: '✅ Listo para servir' },
  served:  { bg: 'bg-teal-500',   label: '🍴 Platos entregados — segunda ronda?' },
  billing: { bg: 'bg-yellow-500', label: '💰 Cuenta solicitada' },
};

function elapsed(iso?: string): string | null {
  if (!iso) return null;
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'justo ahora';
  if (mins < 60) return `hace ${mins} min`;
  return `hace ${Math.floor(mins / 60)}h ${mins % 60}min`;
}

export default function OrderPage() {
  const { tableId } = useParams<{ tableId: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const {
    currentOrder, fetchOrCreateOrder,
    removeOrderItem, updateOrderItemQuantity, sendOrderToKitchen,
    requestBilling, markDelivered, closeTable, orderLoading: loading,
  } = useAppStore();

  useEffect(() => {
    if (tableId) fetchOrCreateOrder(tableId);
  }, [tableId]);

  const total = currentOrder?.items?.reduce(
    (sum, i) => sum + (i.effective_price ?? i.menu_item?.price ?? 0) * i.quantity, 0
  ) ?? 0;

  const totalSavings = currentOrder?.items?.reduce((sum, i) => {
    if (!i.menu_item) return sum;
    const original = i.menu_item.price * i.quantity;
    const paid     = (i.effective_price ?? i.menu_item.price) * i.quantity;
    return sum + (original - paid);
  }, 0) ?? 0;

  const isKitchen = currentOrder?.status === 'kitchen';
  const isReady   = currentOrder?.status === 'ready';
  const isBilling = currentOrder?.status === 'billing';
  const isServed  = isReady && !!currentOrder?.delivered_at;
  const isOpen    = !currentOrder || currentOrder.status === 'open' || isServed;

  const handleKitchen = () => {
    if (!currentOrder || !currentOrder.items?.length) { toast.warning('Agrega al menos un plato.'); return; }
    if (confirm(`Enviar ${currentOrder.items.length} platos a cocina?`)) {
      sendOrderToKitchen(currentOrder.id);
      toast.success('Pedido enviado a cocina 🍳');
    }
  };

  const handleDeliver = () => {
    if (confirm('¿Marcar platos como entregados a la mesa?')) {
      markDelivered(currentOrder!.id);
      toast.success('Platos entregados a la mesa 🛎️');
    }
  };

  const handleBilling = () => {
    if (confirm(`Solicitar cuenta? Total: S/ ${total.toFixed(2)}`)) {
      if (currentOrder) {
        requestBilling(currentOrder.id);
        toast.info('Cuenta solicitada — esperando cobro 💰');
      }
    }
  };

  const handleCloseTable = () => {
    if (confirm(`¿Confirmar cobro de S/ ${total.toFixed(2)} y liberar la mesa?`)) {
      closeTable(currentOrder!.id).then(() => {
        toast.success('Mesa liberada ✅');
        navigate('/mesas');
      });
    }
  };

  const handleRemove = (item: OrderItem) => {
    if (confirm(`Quitar ${item.menu_item?.name}?`)) {
      removeOrderItem(currentOrder!.id, item.id);
    }
  };

  if (loading && !currentOrder) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-base)' }}>
        <p className="t-muted">Cargando...</p>
      </div>
    );
  }

  const banner = isServed ? BANNER['served'] : BANNER[currentOrder?.status ?? 'open'];
  const tableNum = currentOrder?.table?.number ?? tableId?.replace('t', '');

  return (
    <div className="min-h-screen flex flex-col pb-24" style={{ background: 'var(--bg-base)' }}>
      {/* Header */}
      <div className="bg-red-500 text-white px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate('/mesas')} className="text-red-200 text-lg">←</button>
        <h1 className="font-bold text-lg">Mesa {tableNum}</h1>
        <button
          onClick={() => navigate(`/mesas/${tableId}/historial`)}
          className="ml-auto text-red-200 text-xs font-semibold border border-red-300 rounded-lg px-2 py-1"
        >
          Historial
        </button>
      </div>

      {banner && (
        <div className={`${banner.bg} text-white text-center py-2 text-sm font-medium`}>
          {banner.label}
        </div>
      )}

      {currentOrder?.delivered_at && (
        <div className="px-4 py-2 flex items-center gap-2" style={{ background: 'rgba(20,184,166,0.08)', borderBottom: '1px solid rgba(20,184,166,0.2)' }}>
          <span className="text-teal-600 dark:text-teal-400 text-lg">🛎️</span>
          <div>
            <p className="text-teal-700 dark:text-teal-400 text-sm font-semibold">Platos entregados a la mesa</p>
            <p className="text-teal-600 dark:text-teal-500 text-xs">{elapsed(currentOrder.delivered_at)}</p>
          </div>
        </div>
      )}

      {/* Items agrupados por ronda */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {!currentOrder?.items?.length ? (
          <div className="text-center pt-16">
            <p className="text-5xl">🍽️</p>
            <p className="font-semibold mt-4 t-secondary">Pedido vacío</p>
            <p className="text-sm mt-1 t-muted">Agrega platos del menú</p>
          </div>
        ) : (() => {
          const maxRound = Math.max(...(currentOrder.items?.map(i => i.round ?? 1) ?? [1]));
          const rounds = Array.from({ length: maxRound }, (_, i) => i + 1);
          return rounds.map(round => {
            const roundItems = (currentOrder.items ?? []).filter(i => (i.round ?? 1) === round);
            if (roundItems.length === 0) return null;
            return (
              <div key={round}>
                {maxRound > 1 && (
                  <div className="flex items-center gap-2 mb-1 px-1">
                    <span className="text-xs font-bold t-muted uppercase tracking-wider">Ronda {round}</span>
                    <div className="flex-1" style={{ borderTop: '1px solid var(--border)' }} />
                  </div>
                )}
                {roundItems.map(item => (
                  <div key={item.id} className="card-mobile flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="font-semibold text-sm t-primary">{item.menu_item?.name}</p>
                        {item.promotion_name && (
                          <span className="bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 text-xs font-bold px-1.5 py-0.5 rounded-full">
                            🏷️ {item.promotion_name}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {item.effective_price != null && item.effective_price !== item.menu_item?.price ? (
                          <>
                            <span className="text-xs line-through t-muted">
                              S/ {((item.menu_item?.price ?? 0) * item.quantity).toFixed(2)}
                            </span>
                            <span className="text-orange-500 text-sm font-bold">
                              S/ {(item.effective_price * item.quantity).toFixed(2)}
                            </span>
                            <span className="text-green-600 dark:text-green-400 text-xs font-semibold">
                              −S/ {(((item.menu_item?.price ?? 0) - item.effective_price) * item.quantity).toFixed(2)}
                            </span>
                          </>
                        ) : (
                          <span className="text-xs t-muted">
                            S/ {((item.menu_item?.price ?? 0) * item.quantity).toFixed(2)}
                          </span>
                        )}
                      </div>
                      {item.notes && <p className="text-xs italic mt-0.5 t-muted">📝 {item.notes}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{ITEM_STATUS[item.status]}</span>
                      {isOpen && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              if (item.quantity === 1) handleRemove(item);
                              else updateOrderItemQuantity(currentOrder!.id, item.id, item.quantity - 1);
                            }}
                            className="w-7 h-7 rounded-full flex items-center justify-center font-bold"
                            style={{ background: 'var(--border)', color: 'var(--text-2)' }}
                          >−</button>
                          <span className="w-6 text-center text-sm font-bold t-primary">{item.quantity}</span>
                          <button
                            onClick={() => updateOrderItemQuantity(currentOrder!.id, item.id, item.quantity + 1)}
                            disabled={item.menu_item?.stock !== null && item.menu_item?.stock !== undefined && item.quantity >= item.menu_item.stock}
                            className="w-7 h-7 rounded-full bg-red-500 text-white font-bold flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed"
                          >+</button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            );
          });
        })()}
      </div>

      {/* Footer */}
      <div className="fixed bottom-0 left-0 right-0 p-4 space-y-3" style={{ background: 'var(--bg-surface-strong)', borderTop: '1px solid var(--border)' }}>
        {totalSavings > 0 && (
          <div className="flex justify-between items-center rounded-xl px-3 py-2" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
            <span className="text-green-600 dark:text-green-400 text-sm font-semibold">🎉 Ahorro total</span>
            <span className="text-green-600 dark:text-green-400 font-bold">−S/ {totalSavings.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between items-center">
          <span className="font-medium t-muted">Total</span>
          <span className="text-red-500 font-bold text-2xl">S/ {total.toFixed(2)}</span>
        </div>

        {isOpen && (
          <>
            <button
              onClick={() => navigate(`/mesas/${tableId}/pedido/menu`)}
              className="w-full rounded-xl py-3 text-sm font-semibold border-2 border-dashed border-red-400 text-red-500"
            >
              + Agregar Platos
            </button>
            {!!currentOrder?.items?.length && (
              <button
                onClick={handleKitchen}
                disabled={loading}
                className="w-full bg-orange-500 text-white rounded-xl py-3 font-bold disabled:opacity-50"
              >
                Enviar a Cocina 🍳
              </button>
            )}
          </>
        )}
        {isKitchen && (
          <p className="text-center text-sm t-muted">Esperando que cocina termine los platos...</p>
        )}
        {isReady && !isServed && (
          <button onClick={handleDeliver} disabled={loading} className="w-full bg-teal-500 text-white rounded-xl py-3 font-bold disabled:opacity-50">
            🛎️ Entregar a mesa
          </button>
        )}
        {(isServed || isReady) && (
          <button onClick={handleBilling} disabled={loading} className="w-full bg-yellow-500 text-white rounded-xl py-3 font-bold disabled:opacity-50">
            Solicitar Cuenta 💰
          </button>
        )}
        {isBilling && (
          <button onClick={handleCloseTable} disabled={loading} className="w-full bg-red-600 text-white rounded-xl py-4 font-bold text-base disabled:opacity-50">
            ✅ Cobrado — Liberar mesa
          </button>
        )}
      </div>
    </div>
  );
}
