import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { Order } from '../types';
import GlassCard from '../components/ui/GlassCard';
import StatusBadge from '../components/ui/StatusBadge';
import { CheckCircle } from 'lucide-react';

function elapsed(createdAt: string) {
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
}

export default function KitchenQueuePage() {
  const navigate = useNavigate();
  const { kitchenOrders, fetchKitchenOrders } = useAppStore();

  useEffect(() => { fetchKitchenOrders(); }, []);

  const sorted = [...kitchenOrders].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Cola de Cocina</h1>
        <p className="text-slate-500 text-sm mt-1">{sorted.length} pedido{sorted.length !== 1 ? 's' : ''} pendiente{sorted.length !== 1 ? 's' : ''}</p>
      </div>

      {sorted.length === 0 ? (
        <div className="text-center py-24">
          <CheckCircle size={48} className="text-accent mx-auto mb-4 opacity-50" />
          <p className="text-slate-500 font-semibold">Sin pedidos pendientes</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {sorted.map((order: Order) => {
            const mins      = elapsed(order.created_at);
            const urgent    = mins > 20;
            const doneCount = order.items?.filter(i => i.status === 'done').length ?? 0;
            const total     = order.items?.length ?? 0;
            const pct       = total > 0 ? (doneCount / total) * 100 : 0;

            return (
              <GlassCard key={order.id} onClick={() => navigate(`/cocina/${order.id}`)}>
                <div className="flex justify-between items-center mb-4">
                  <span className="font-bold text-lg">Mesa {order.table?.number ?? '?'}</span>
                  <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                    urgent
                      ? 'bg-red-500/20 text-red-400'
                      : 'bg-white/[0.06] text-slate-400'
                  }`}>
                    hace {mins} min {urgent ? '🔥' : ''}
                  </span>
                </div>

                {order.items?.map(item => (
                  <div key={item.id} className="flex justify-between items-center py-1.5 text-sm">
                    <span>
                      <span className="text-accent font-semibold mr-2">{item.quantity}x</span>
                      {item.menu_item?.name ?? 'Plato'}
                    </span>
                    <StatusBadge status={item.status} />
                  </div>
                ))}

                {/* Progress bar */}
                <div className="mt-4 h-1 rounded-full bg-white/[0.06] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${pct}%`,
                      background: 'linear-gradient(90deg, #059669, #34d399)',
                      boxShadow: '0 0 10px rgba(16, 185, 129, 0.3)',
                    }}
                  />
                </div>

                <button className="w-full mt-3 py-2.5 rounded-xl text-sm font-semibold text-accent border border-accent/30 bg-accent/10 hover:bg-accent/20 transition-colors">
                  Marcar como Listo ✓
                </button>
              </GlassCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
