import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
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
  const {
    currentOrder, fetchOrCreateOrder,
    removeOrderItem, sendOrderToKitchen,
    requestBilling, markDelivered, closeTable, orderLoading: loading,
  } = useAppStore();

  useEffect(() => {
    if (!tableId) return;
    // Solo re-fetch si no tenemos ya el pedido de esta mesa
    if (currentOrder?.table_id === tableId) return;
    fetchOrCreateOrder(tableId);
  }, [tableId]);

  const total = currentOrder?.items?.reduce(
    (sum, i) => sum + (i.menu_item?.price ?? 0) * i.quantity, 0
  ) ?? 0;

  const isKitchen = currentOrder?.status === 'kitchen';
  const isReady   = currentOrder?.status === 'ready';
  const isBilling = currentOrder?.status === 'billing';
  const isServed  = isReady && !!currentOrder?.delivered_at;
  const isOpen    = !currentOrder || currentOrder.status === 'open' || isServed;

  const handleKitchen = () => {
    if (!currentOrder || !currentOrder.items?.length) { alert('Agrega al menos un plato.'); return; }
    if (confirm(`Enviar ${currentOrder.items.length} platos a cocina?`)) {
      sendOrderToKitchen(currentOrder.id);
    }
  };

  const handleDeliver = () => {
    if (confirm('¿Marcar platos como entregados a la mesa?')) {
      markDelivered(currentOrder!.id);
    }
  };

  const handleBilling = () => {
    if (confirm(`Solicitar cuenta? Total: S/ ${total.toFixed(2)}`)) {
      if (currentOrder) requestBilling(currentOrder.id);
    }
  };

  const handleCloseTable = () => {
    if (confirm(`¿Confirmar cobro de S/ ${total.toFixed(2)} y liberar la mesa?`)) {
      closeTable(currentOrder!.id).then(() => navigate('/mesas'));
    }
  };

  const handleRemove = (item: OrderItem) => {
    if (confirm(`Quitar ${item.menu_item?.name}?`)) {
      removeOrderItem(currentOrder!.id, item.id);
    }
  };

  if (loading && !currentOrder) {
    return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-500">Cargando...</p></div>;
  }

  const banner = BANNER[currentOrder?.status ?? 'open'];
  const tableNum = currentOrder?.table?.number ?? tableId?.replace('t', '');

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <div className="bg-red-500 text-white px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate('/mesas')} className="text-red-200 text-lg">←</button>
        <h1 className="font-bold text-lg">Mesa {tableNum}</h1>
      </div>

      {banner && (
        <div className={`${banner.bg} text-white text-center py-2 text-sm font-medium`}>
          {banner.label}
        </div>
      )}

      {/* Badge de entrega */}
      {currentOrder?.delivered_at && (
        <div className="bg-teal-50 border-b border-teal-200 px-4 py-2 flex items-center gap-2">
          <span className="text-teal-600 text-lg">🛎️</span>
          <div>
            <p className="text-teal-700 text-sm font-semibold">Platos entregados a la mesa</p>
            <p className="text-teal-500 text-xs">{elapsed(currentOrder.delivered_at)}</p>
          </div>
        </div>
      )}

      {/* Items */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {!currentOrder?.items?.length ? (
          <div className="text-center pt-16">
            <p className="text-5xl">🍽️</p>
            <p className="text-gray-500 font-semibold mt-4">Pedido vacío</p>
            <p className="text-gray-400 text-sm mt-1">Agrega platos del menú</p>
          </div>
        ) : (
          currentOrder.items.map(item => (
            <div key={item.id} className="bg-white rounded-xl p-3 flex items-center justify-between shadow-sm">
              <div className="flex-1">
                <p className="font-semibold text-gray-800 text-sm">{item.menu_item?.name}</p>
                <p className="text-gray-400 text-xs mt-0.5">
                  x{item.quantity} · S/ {((item.menu_item?.price ?? 0) * item.quantity).toFixed(2)}
                </p>
                {item.notes && <p className="text-gray-400 text-xs italic mt-0.5">📝 {item.notes}</p>}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xl">{ITEM_STATUS[item.status]}</span>
                {isOpen && (
                  <button
                    onClick={() => handleRemove(item)}
                    className="text-red-400 font-bold text-lg w-7 h-7 flex items-center justify-center"
                  >✕</button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="bg-white border-t border-gray-100 p-4 space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-gray-500 font-medium">Total</span>
          <span className="text-red-500 font-bold text-2xl">S/ {total.toFixed(2)}</span>
        </div>

        {isOpen && (
          <>
            <button
              onClick={() => navigate(`/mesas/${tableId}/pedido/menu`)}
              className="w-full border-2 border-dashed border-red-400 text-red-500 rounded-xl py-3 text-sm font-semibold"
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
          <p className="text-center text-gray-400 text-sm">Esperando que cocina termine los platos...</p>
        )}

        {isReady && !isServed && (
          <button
            onClick={handleDeliver}
            disabled={loading}
            className="w-full bg-teal-500 text-white rounded-xl py-3 font-bold disabled:opacity-50"
          >
            🛎️ Entregar a mesa
          </button>
        )}

        {(isServed || isReady) && (
          <button
            onClick={handleBilling}
            disabled={loading}
            className="w-full bg-yellow-500 text-white rounded-xl py-3 font-bold disabled:opacity-50"
          >
            Solicitar Cuenta 💰
          </button>
        )}

        {isBilling && (
          <button
            onClick={handleCloseTable}
            disabled={loading}
            className="w-full bg-red-600 text-white rounded-xl py-4 font-bold text-base disabled:opacity-50"
          >
            ✅ Cobrado — Liberar mesa
          </button>
        )}
      </div>
    </div>
  );
}
