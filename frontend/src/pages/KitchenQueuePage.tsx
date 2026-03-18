import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { Order } from '../types';

function elapsed(createdAt: string) {
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
}

export default function KitchenQueuePage() {
  const navigate = useNavigate();
  const { kitchenOrders, fetchKitchenOrders, logout, user } = useAppStore();

  useEffect(() => {
    fetchKitchenOrders();
    const interval = setInterval(fetchKitchenOrders, 30_000);
    return () => clearInterval(interval);
  }, []);

  const sorted = [...kitchenOrders].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div className="bg-gray-800 text-white px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="font-bold text-lg">🍳 Cocina</h1>
          <p className="text-gray-400 text-xs">Hola, {user?.name.split(' ')[0]}</p>
        </div>
        <button onClick={logout} className="text-gray-400 text-sm">Salir</button>
      </div>

      <div className="p-3 space-y-3">
        {sorted.length === 0 ? (
          <div className="text-center pt-20">
            <p className="text-5xl">✅</p>
            <p className="text-gray-400 font-semibold mt-4">Sin pedidos pendientes</p>
          </div>
        ) : (
          sorted.map((order: Order) => {
            const mins      = elapsed(order.created_at);
            const urgent    = mins > 20;
            const doneCount = order.items?.filter(i => i.status === 'done').length ?? 0;
            const total     = order.items?.length ?? 0;
            const pct       = total > 0 ? (doneCount / total) * 100 : 0;

            return (
              <button
                key={order.id}
                onClick={() => navigate(`/cocina/${order.id}`)}
                className={`w-full text-left bg-gray-800 rounded-2xl p-4 border-l-4 ${urgent ? 'border-red-500' : 'border-orange-400'}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-white font-bold text-xl">Mesa {order.table?.number ?? '?'}</span>
                  <span className={`text-xs font-semibold px-3 py-1 rounded-full ${urgent ? 'bg-red-500 text-white' : 'bg-orange-500 text-white'}`}>
                    {mins}min {urgent ? '🔥' : '⏱️'}
                  </span>
                </div>
                <p className="text-gray-400 text-sm mb-2">{total} platos</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-700 rounded-full h-2 overflow-hidden">
                    <div className="bg-green-400 h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-green-400 text-sm font-bold">{doneCount}/{total}</span>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
