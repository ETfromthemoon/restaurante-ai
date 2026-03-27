import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { useToast } from '../hooks/useToast';
import { OrderItem } from '../types';
import { ArrowLeft, Clock, Plus, Minus } from 'lucide-react';

const ITEM_STATUS: Record<string, string> = {
  pending:   '⏳',
  preparing: '👨‍🍳',
  done:      '✅',
};

const BANNER: Record<string, { cls: string; label: string }> = {
  open:    { cls: 'banner-metallic-blue',   label: '📝 Pedido abierto — agrega platos' },
  kitchen: { cls: 'banner-metallic-orange', label: '👨‍🍳 En cocina...' },
  ready:   { cls: 'banner-metallic-green',  label: '✅ Listo para servir' },
  served:  { cls: 'banner-metallic-teal',   label: '🍴 Platos entregados — segunda ronda?' },
  billing: { cls: 'banner-metallic-yellow', label: '💰 Cuenta solicitada' },
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
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
          <p className="t-muted text-sm font-light">Cargando pedido...</p>
        </div>
      </div>
    );
  }

  const banner = isServed ? BANNER['served'] : BANNER[currentOrder?.status ?? 'open'];
  const tableNum = currentOrder?.table?.number ?? tableId?.replace('t', '');

  return (
    <div className="min-h-screen flex flex-col pb-24" style={{ background: 'var(--bg-base)' }}>
      {/* Header */}
      <div className="banner-metallic-red text-white px-5 py-4 flex items-center gap-3">
        <button onClick={() => navigate('/mesas')} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
          <ArrowLeft size={16} />
        </button>
        <h1 className="font-semibold text-lg tracking-wide">Mesa {tableNum}</h1>
        <button
          onClick={() => navigate(`/mesas/${tableId}/historial`)}
          className="ml-auto text-white/80 text-xs font-medium border border-white/20 rounded-xl px-3 py-1.5 hover:bg-white/10 transition-colors"
        >
          <Clock size={12} className="inline mr-1" />
          Historial
        </button>
      </div>

      {banner && (
        <div className={`${banner.cls} text-white text-center py-2.5 text-sm font-medium tracking-wide`}>
          {banner.label}
        </div>
      )}

      {currentOrder?.delivered_at && (
        <div className="px-5 py-3 flex items-center gap-3" style={{ background: 'rgba(20,184,166,0.06)', borderBottom: '1px solid rgba(20,184,166,0.15)' }}>
          <span className="text-teal-600 dark:text-teal-400 text-lg">🛎️</span>
          <div>
            <p className="text-teal-700 dark:text-teal-400 text-sm font-medium">Platos entregados a la mesa</p>
            <p className="text-teal-600 dark:text-teal-500 text-xs font-light">{elapsed(currentOrder.delivered_at)}</p>
          </div>
        </div>
      )}

      {/* Items agrupados por ronda */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {!currentOrder?.items?.length ? (
          <div className="text-center pt-20">
            <p className="text-5xl">🍽️</p>
            <p className="font-medium mt-5 t-secondary text-base">Pedido vacío</p>
            <p className="text-sm mt-1 t-muted font-light">Agrega platos del menú</p>
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
                  <div className="flex items-center gap-3 mb-2 px-1">
                    <span className="text-[10px] font-medium t-muted uppercase tracking-[0.15em]">Ronda {round}</span>
                    <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
                  </div>
                )}
                {roundItems.map(item => (
                  <div key={item.id} className="card-mobile flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm t-primary">{item.menu_item?.name}</p>
                        {item.promotion_name && (
                          <span className="bg-orange-100 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 text-[10px] font-medium px-2 py-0.5 rounded-full">
                            🏷️ {item.promotion_name}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        {item.effective_price != null && item.effective_price !== item.menu_item?.price ? (
                          <>
                            <span className="text-xs line-through t-muted font-light">
                              S/ {((item.menu_item?.price ?? 0) * item.quantity).toFixed(2)}
                            </span>
                            <span className="text-orange-500 text-sm font-semibold">
                              S/ {(item.effective_price * item.quantity).toFixed(2)}
                            </span>
                            <span className="text-green-600 dark:text-green-400 text-xs font-medium">
                              −S/ {(((item.menu_item?.price ?? 0) - item.effective_price) * item.quantity).toFixed(2)}
                            </span>
                          </>
                        ) : (
                          <span className="text-xs t-muted font-light">
                            S/ {((item.menu_item?.price ?? 0) * item.quantity).toFixed(2)}
                          </span>
                        )}
                      </div>
                      {item.notes && <p className="text-xs italic mt-1 t-muted font-light">📝 {item.notes}</p>}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{ITEM_STATUS[item.status]}</span>
                      {isOpen && (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => {
                              if (item.quantity === 1) handleRemove(item);
                              else updateOrderItemQuantity(currentOrder!.id, item.id, item.quantity - 1);
                            }}
                            className="w-7 h-7 rounded-full flex items-center justify-center transition-colors"
                            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
                          ><Minus size={12} className="t-secondary" /></button>
                          <span className="w-6 text-center text-sm font-medium t-primary">{item.quantity}</span>
                          <button
                            onClick={() => updateOrderItemQuantity(currentOrder!.id, item.id, item.quantity + 1)}
                            disabled={item.menu_item?.stock !== null && item.menu_item?.stock !== undefined && item.quantity >= item.menu_item.stock}
                            className="w-7 h-7 rounded-full btn-metallic-red flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed text-sm"
                          ><Plus size={12} /></button>
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
      <div className="fixed bottom-0 left-0 right-0 p-4 space-y-3 backdrop-blur-2xl" style={{ background: 'var(--bg-surface-strong)', borderTop: '1px solid var(--border)' }}>
        {totalSavings > 0 && (
          <div className="flex justify-between items-center rounded-2xl px-4 py-2.5" style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.12)' }}>
            <span className="text-green-600 dark:text-green-400 text-sm font-medium">🎉 Ahorro total</span>
            <span className="text-green-600 dark:text-green-400 font-semibold">−S/ {totalSavings.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between items-center">
          <span className="font-light t-muted text-sm tracking-wide">Total</span>
          <span className="text-2xl font-semibold" style={{ background: 'linear-gradient(135deg, #b91c1c, #ef4444)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>S/ {total.toFixed(2)}</span>
        </div>

        {isOpen && (
          <>
            <button
              onClick={() => navigate(`/mesas/${tableId}/pedido/menu`)}
              className="w-full rounded-2xl py-3.5 text-sm font-medium border-2 border-dashed transition-colors"
              style={{ borderColor: 'rgba(220, 38, 38, 0.3)', color: '#ef4444' }}
            >
              + Agregar Platos
            </button>
            {!!currentOrder?.items?.length && (
              <button
                onClick={handleKitchen}
                disabled={loading}
                className="w-full btn-metallic-orange py-3.5 font-medium disabled:opacity-50 text-sm tracking-wide"
              >
                Enviar a Cocina 🍳
              </button>
            )}
          </>
        )}
        {isKitchen && (
          <p className="text-center text-sm t-muted font-light">Esperando que cocina termine los platos...</p>
        )}
        {isReady && !isServed && (
          <button onClick={handleDeliver} disabled={loading} className="w-full btn-metallic-teal py-3.5 font-medium disabled:opacity-50 text-sm tracking-wide">
            🛎️ Entregar a mesa
          </button>
        )}
        {(isServed || isReady) && (
          <button onClick={handleBilling} disabled={loading} className="w-full btn-metallic-yellow py-3.5 font-medium disabled:opacity-50 text-sm tracking-wide">
            Solicitar Cuenta 💰
          </button>
        )}
        {isBilling && (
          <button onClick={handleCloseTable} disabled={loading} className="w-full btn-metallic-red py-4 font-medium text-base disabled:opacity-50 tracking-wide">
            ✅ Cobrado — Liberar mesa
          </button>
        )}
      </div>
    </div>
  );
}
