import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { Table, User } from '../types';

export default function TableAssignmentPage() {
  const navigate = useNavigate();
  const { tables, waiters, fetchTables, fetchWaiters, assignTableWaiter } = useAppStore();
  const [selected, setSelected] = useState<Table | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchTables();
    fetchWaiters();
  }, []);

  function getWaiterName(id: string | null | undefined): string {
    if (!id) return 'Sin asignar';
    return waiters.find(w => w.id === id)?.name ?? 'Sin asignar';
  }

  async function handleAssign(waiterId: string | null) {
    if (!selected) return;
    setSaving(true);
    await assignTableWaiter(selected.id, waiterId);
    setSaving(false);
    setSelected(null);
  }

  return (
    <div className="min-h-screen bg-gray-100 pb-8">
      {/* Header */}
      <div className="bg-red-500 text-white px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => navigate('/gerente')} className="text-red-200 text-lg">←</button>
        <h1 className="font-bold text-lg flex-1">Asignar Mesas</h1>
      </div>

      {/* Grid de mesas */}
      <div className="p-3 grid grid-cols-2 gap-3">
        {tables.map(table => {
          const waiterName = getWaiterName(table.assigned_waiter_id);
          const hasWaiter = !!table.assigned_waiter_id;
          return (
            <button
              key={table.id}
              onClick={() => setSelected(table)}
              className="bg-white border-2 border-gray-200 rounded-2xl p-4 flex flex-col items-center gap-1 active:scale-95 transition-transform shadow-sm"
            >
              <span className="text-3xl">🍽️</span>
              <span className="font-bold text-gray-800 text-base">Mesa {table.number}</span>
              <span className="text-xs text-gray-400">👥 {table.capacity} personas</span>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full mt-1 ${
                hasWaiter ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
              }`}>
                {hasWaiter ? `👤 ${waiterName}` : 'Sin asignar'}
              </span>
            </button>
          );
        })}
      </div>

      {/* Bottom sheet de asignación */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 flex items-end z-50" onClick={() => setSelected(null)}>
          <div className="bg-white w-full rounded-t-2xl p-6 space-y-3" onClick={e => e.stopPropagation()}>
            <h2 className="font-bold text-gray-800 text-lg">Mesa {selected.number} — Asignar mesero</h2>

            {/* Opción sin asignar */}
            <button
              onClick={() => handleAssign(null)}
              disabled={saving}
              className={`w-full text-left px-4 py-3 rounded-xl border-2 font-semibold text-sm transition ${
                !selected.assigned_waiter_id
                  ? 'border-red-400 bg-red-50 text-red-600'
                  : 'border-gray-200 text-gray-600'
              }`}
            >
              Sin asignar
            </button>

            {/* Lista de meseros */}
            {waiters.map(w => (
              <button
                key={w.id}
                onClick={() => handleAssign(w.id)}
                disabled={saving}
                className={`w-full text-left px-4 py-3 rounded-xl border-2 font-semibold text-sm transition ${
                  selected.assigned_waiter_id === w.id
                    ? 'border-blue-400 bg-blue-50 text-blue-700'
                    : 'border-gray-200 text-gray-700'
                }`}
              >
                👤 {w.name}
              </button>
            ))}

            <button
              onClick={() => setSelected(null)}
              className="w-full bg-gray-100 text-gray-600 rounded-xl py-3 font-bold"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
