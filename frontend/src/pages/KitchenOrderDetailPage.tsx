import { useParams, useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { OrderItemStatus } from '../types';

const ITEM_CONFIG: Record<OrderItemStatus, {
  dot: string; label: string;
  nextStatus: OrderItemStatus | null; nextLabel: string; btnColor: string;
}> = {
  pending:   { dot: 'bg-gray-400',   label: 'Pendiente',  nextStatus: 'preparing', nextLabel: 'Iniciar 🔥', btnColor: 'bg-orange-500' },
  preparing: { dot: 'bg-orange-400', label: 'Preparando', nextStatus: 'done',      nextLabel: 'Listo ✓',   btnColor: 'bg-green-500' },
  done:      { dot: 'bg-green-400',  label: 'Listo',      nextStatus: null,         nextLabel: '',          btnColor: '' },
};

export default function KitchenOrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { kitchenOrders, updateItemStatus, completeOrder } = useAppStore();

  const order = kitchenOrders.find(o => o.id === orderId);

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center gap-4">
        <p className="text-gray-400">Pedido no encontrado o ya completado.</p>
        <button onClick={() => navigate('/cocina')} className="text-red-400 text-sm">← Volver</button>
      </div>
    );
  }

  const allDone = (order.items?.length ?? 0) > 0 && order.items?.every(i => i.status === 'done');
  const doneCount = order.items?.filter(i => i.status === 'done').length ?? 0;

  const handleComplete = async () => {
    if (confirm('¿Marcar pedido como completo? Se notificará al mesero.')) {
      await completeOrder(order.id);
      navigate('/cocina');
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 text-white px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate('/cocina')} className="text-gray-400 text-lg">←</button>
        <div className="flex-1">
          <h1 className="font-bold text-lg">Mesa {order.table?.number ?? '?'}</h1>
          <p className="text-gray-400 text-xs">{order.items?.length ?? 0} platos</p>
        </div>
        <span className="text-green-400 font-bold text-sm">{doneCount}/{order.items?.length ?? 0} listos</span>
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {order.items?.map(item => {
          const cfg = ITEM_CONFIG[item.status];
          return (
            <div key={item.id} className="bg-gray-800 rounded-xl p-4 flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full flex-shrink-0 ${cfg.dot}`} />
              <div className="flex-1">
                <p className="text-white font-semibold text-sm">{item.menu_item?.name}</p>
                <p className="text-gray-400 text-xs mt-0.5">Cantidad: {item.quantity}</p>
                {item.notes && <p className="text-yellow-400 text-xs mt-0.5 italic">📝 {item.notes}</p>}
                <p className={`text-xs mt-1 font-medium ${cfg.dot.replace('bg-', 'text-')}`}>{cfg.label}</p>
              </div>
              {cfg.nextStatus && (
                <button
                  onClick={() => updateItemStatus(item.id, cfg.nextStatus!)}
                  className={`${cfg.btnColor} text-white text-xs font-bold px-3 py-2 rounded-lg flex-shrink-0`}
                >
                  {cfg.nextLabel}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Complete button */}
      {allDone && (
        <div className="p-4 bg-gray-800 border-t border-gray-700">
          <button
            onClick={handleComplete}
            className="w-full bg-green-500 text-white rounded-xl py-4 font-bold text-sm"
          >
            ✅ Pedido completo — Notificar mesero
          </button>
        </div>
      )}
    </div>
  );
}
