import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';

const STATUS_LABEL: Record<string, string> = {
  open:    '📝 Abierto',
  kitchen: '🍳 En cocina',
  ready:   '✅ Listo',
  billing: '💰 Cuenta',
  billed:  '✔️ Cobrado',
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('es-PE', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function TableOrderHistoryPage() {
  const { tableId } = useParams<{ tableId: string }>();
  const navigate = useNavigate();
  const { tableOrderHistory, fetchTableOrderHistory } = useAppStore();

  useEffect(() => {
    if (tableId) fetchTableOrderHistory(tableId);
  }, [tableId]);

  const tableNum = tableId?.replace('t', '');

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-red-500 text-white px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate(`/mesas/${tableId}/pedido`)}
          className="text-red-200 text-lg"
        >
          ←
        </button>
        <h1 className="font-bold text-lg">Historial Mesa {tableNum}</h1>
      </div>

      <div className="p-3 space-y-3">
        {tableOrderHistory.length === 0 ? (
          <div className="text-center pt-20">
            <p className="text-4xl">📋</p>
            <p className="text-gray-400 font-semibold mt-4">Sin historial de pedidos</p>
          </div>
        ) : (
          tableOrderHistory.map(order => {
            const total = order.items?.reduce(
              (sum, i) => sum + (i.effective_price ?? i.menu_item?.price ?? 0) * i.quantity, 0
            ) ?? 0;
            return (
              <div key={order.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                {/* Cabecera del pedido */}
                <div className="px-4 py-3 flex items-center justify-between border-b border-gray-50">
                  <div>
                    <p className="font-bold text-gray-800 text-sm">{STATUS_LABEL[order.status] ?? order.status}</p>
                    <p className="text-gray-400 text-xs mt-0.5">{formatDate(order.created_at)}</p>
                  </div>
                  <span className="font-bold text-red-500 text-base">S/ {total.toFixed(2)}</span>
                </div>
                {/* Items */}
                {order.items && order.items.length > 0 && (
                  <div className="px-4 py-2 space-y-1">
                    {order.items.map(item => (
                      <div key={item.id} className="flex justify-between items-center">
                        <span className="text-gray-700 text-sm">
                          {item.quantity}× {item.menu_item?.name ?? item.menu_item_id}
                        </span>
                        <span className="text-gray-400 text-xs">
                          S/ {((item.effective_price ?? item.menu_item?.price ?? 0) * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    ))}
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
