import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { Table } from '../types';

const STATUS = {
  free:     { bg: 'bg-green-50',   border: 'border-green-400',  text: 'text-green-600',  label: 'Libre',           emoji: '✅' },
  occupied: { bg: 'bg-orange-50',  border: 'border-orange-400', text: 'text-orange-500', label: 'En cocina 🍳',    emoji: '🔴' },
  ready:    { bg: 'bg-blue-50',    border: 'border-blue-500',   text: 'text-blue-600',   label: '¡Listo! servir',  emoji: '🔔' },
  served:   { bg: 'bg-purple-50',  border: 'border-purple-400', text: 'text-purple-600', label: 'Comiendo 🍴',     emoji: '🍴' },
  billing:  { bg: 'bg-yellow-50',  border: 'border-yellow-400', text: 'text-yellow-600', label: 'Cuenta 💰',       emoji: '💰' },
};

function elapsed(iso?: string): string | null {
  if (!iso) return null;
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'ahora';
  if (mins < 60) return `${mins}min`;
  return `${Math.floor(mins / 60)}h ${mins % 60}min`;
}

export default function TableMapPage() {
  const navigate = useNavigate();
  const { tables, fetchTables, fetchMenu, logout, user } = useAppStore();

  useEffect(() => {
    fetchTables();
    fetchMenu(); // precargar menú para que esté listo al agregar platos
    const interval = setInterval(fetchTables, 30_000);
    return () => clearInterval(interval);
  }, []);

  const handleTable = (table: Table) => {
    navigate(`/mesas/${table.id}/pedido`);
  };

  const free       = tables.filter(t => t.status === 'free').length;
  const occupied   = tables.filter(t => t.status !== 'free').length;
  const readyCount = tables.filter(t => t.status === 'ready').length;
  const isReady    = (table: typeof tables[0]) => table.status === 'ready';

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-red-500 text-white px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="font-bold text-lg">🍽️ Mesas</h1>
          <p className="text-red-200 text-xs">Hola, {user?.name.split(' ')[0]}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-center">
            <p className="font-bold text-lg">{free}</p>
            <p className="text-red-200 text-xs">Libres</p>
          </div>
          <div className="text-center">
            <p className="font-bold text-lg text-yellow-300">{occupied}</p>
            <p className="text-red-200 text-xs">Ocupadas</p>
          </div>
          {readyCount > 0 && (
            <div className="text-center bg-blue-600 rounded-lg px-2 py-1 animate-pulse">
              <p className="font-bold text-lg">{readyCount}</p>
              <p className="text-blue-200 text-xs">Listas</p>
            </div>
          )}
          <button onClick={logout} className="text-red-200 text-sm font-medium">
            Salir
          </button>
        </div>
      </div>

      {/* Grid de mesas */}
      <div className="p-3 grid grid-cols-2 gap-3">
        {tables.map(table => {
          const s = STATUS[table.status];
          const wait = elapsed(table.last_interaction_at);
          const ready = isReady(table);
          return (
            <button
              key={table.id}
              onClick={() => handleTable(table)}
              className={`${s.bg} ${s.border} border-2 rounded-2xl p-4 flex flex-col items-center gap-1 active:scale-95 transition-transform shadow-sm ${ready ? 'ring-2 ring-blue-400' : ''}`}
            >
              <span className="text-3xl">{s.emoji}</span>
              <span className="font-bold text-gray-800 text-base">Mesa {table.number}</span>
              <span className={`text-xs font-semibold ${s.text}`}>{s.label}</span>
              <span className="text-gray-400 text-xs">👥 {table.capacity} personas</span>
              {wait && table.status !== 'free' && (
                <span className={`text-xs font-bold mt-1 px-2 py-0.5 rounded-full ${
                  ready ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-600'
                }`}>
                  ⏱ {
                    table.status === 'ready'   ? `Esperando servicio ${wait}` :
                    table.status === 'served'  ? `Comiendo desde ${wait}` :
                    table.status === 'billing' ? `Cuenta solicitada ${wait}` :
                                                 `Pedido enviado ${wait}`
                  }
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
