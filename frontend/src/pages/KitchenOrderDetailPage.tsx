import { useParams, useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { OrderItemStatus } from '../types';
import GlassCard from '../components/ui/GlassCard';
import StatusBadge from '../components/ui/StatusBadge';

const ITEM_CONFIG: Record<OrderItemStatus, {
  nextStatus: OrderItemStatus | null; nextLabel: string; btnClass: string;
}> = {
  pending:   { nextStatus: 'preparing', nextLabel: 'Iniciar 🔥', btnClass: 'btn-metallic-orange' },
  preparing: { nextStatus: 'done',      nextLabel: 'Listo ✓',   btnClass: 'bg-accent hover:bg-accent-dark text-white' },
  done:      { nextStatus: null,         nextLabel: '',          btnClass: '' },
};

export default function KitchenOrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { kitchenOrders, updateItemStatus, completeOrder } = useAppStore();

  const order = kitchenOrders.find(o => o.id === orderId);

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <p className="t-muted">Pedido no encontrado o ya completado.</p>
        <button onClick={() => navigate('/cocina')} className="btn-ghost">← Volver</button>
      </div>
    );
  }

  const allDone = (order.items?.length ?? 0) > 0 && order.items?.every(i => i.status === 'done');
  const doneCount = order.items?.filter(i => i.status === 'done').length ?? 0;
  const total = order.items?.length ?? 0;
  const pct = total > 0 ? (doneCount / total) * 100 : 0;

  const handleComplete = async () => {
    if (confirm('¿Marcar pedido como completo? Se notificará al mesero.')) {
      await completeOrder(order.id);
      navigate('/cocina');
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/cocina')}
            className="btn-ghost !px-3 !py-2"
          >
            ←
          </button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight t-primary">Mesa {order.table?.number ?? '?'}</h1>
            <p className="text-sm mt-0.5 t-muted font-light">{total} platos en este pedido</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-lg font-semibold text-accent">{doneCount}/{total}</p>
          <p className="text-xs t-muted">listos</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-6 glass-card !py-3 !px-5">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs t-muted">Progreso</span>
          <span className="text-xs font-semibold text-accent">{Math.round(pct)}%</span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${pct}%`,
              background: 'linear-gradient(90deg, #059669, #34d399)',
              boxShadow: '0 0 10px rgba(16,185,129,0.4)',
            }}
          />
        </div>
      </div>

      {/* Items */}
      <div className="space-y-3 mb-6">
        {order.items?.map(item => {
          const cfg = ITEM_CONFIG[item.status];
          return (
            <GlassCard key={item.id} className="!py-3 !px-4">
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-sm t-primary">{item.menu_item?.name}</p>
                    <StatusBadge status={item.status} />
                  </div>
                  <p className="text-xs t-muted">Cantidad: {item.quantity}</p>
                  {item.notes && (
                    <p className="text-xs mt-1 italic" style={{ color: '#d97706' }}>📝 {item.notes}</p>
                  )}
                </div>
                {cfg.nextStatus && (
                  <button
                    onClick={() => updateItemStatus(item.id, cfg.nextStatus!)}
                    className={`${cfg.btnClass} text-xs font-medium px-3 py-2 rounded-lg flex-shrink-0 transition-colors`}
                  >
                    {cfg.nextLabel}
                  </button>
                )}
              </div>
            </GlassCard>
          );
        })}
      </div>

      {/* Complete button */}
      {allDone && (
        <button
          onClick={handleComplete}
          className="btn-accent w-full justify-center !py-4 text-base"
        >
          ✅ Pedido completo — Notificar mesero
        </button>
      )}
    </div>
  );
}
