import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { MenuItem } from '../types';

const CATEGORY_ICONS: Record<string, string> = {
  'Entradas':    '🥗',
  'Principales': '🍽️',
  'Postres':     '🍰',
  'Bebidas':     '🥤',
};

export default function MenuSelectPage() {
  const { tableId } = useParams<{ tableId: string }>();
  const navigate = useNavigate();
  const { menuItems, fetchMenu, addOrderItem, menuLoading, orderLoading } = useAppStore();
  const [adding, setAdding] = useState<string | null>(null);
  const [added, setAdded] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (menuItems.length === 0) fetchMenu();
  }, []);

  const categories = menuItems
    .filter(m => m.available)
    .reduce((acc, item) => {
      if (!acc[item.category]) acc[item.category] = [];
      acc[item.category].push(item);
      return acc;
    }, {} as Record<string, MenuItem[]>);

  const handleAdd = async (item: MenuItem) => {
    if (!tableId) return;
    setAdding(item.id);
    await addOrderItem(tableId, item.id, 1);
    setAdding(null);
    setAdded(prev => new Set(prev).add(item.id));
  };

  return (
    <div className="min-h-screen bg-gray-100 pb-24">
      {/* Header */}
      <div className="bg-red-500 text-white px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="text-red-200 text-lg">←</button>
        <h1 className="font-bold text-lg">🍴 Agregar Platos</h1>
        {orderLoading && (
          <span className="text-red-200 text-xs ml-auto animate-pulse">Cargando pedido...</span>
        )}
      </div>

      {/* Estado del menú */}
      {menuLoading ? (
        <div className="flex flex-col items-center justify-center pt-24 gap-3">
          <p className="text-gray-400 text-lg animate-pulse">Cargando menú...</p>
        </div>
      ) : menuItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center pt-24 gap-4">
          <p className="text-gray-400 font-medium">No se pudo cargar el menú</p>
          <button
            onClick={() => fetchMenu()}
            className="bg-red-500 text-white px-6 py-2 rounded-xl font-semibold"
          >
            Reintentar
          </button>
        </div>
      ) : (
        Object.entries(categories).map(([category, items]) => (
          <div key={category}>
            <div className="bg-gray-200 px-4 py-2 sticky top-14 z-10">
              <p className="text-xs font-bold text-red-500 uppercase tracking-wider">
                {CATEGORY_ICONS[category] ?? '🍴'} {category}
              </p>
            </div>
            <div className="divide-y divide-gray-100">
              {items.map(item => {
                const isAdded   = added.has(item.id);
                const isLoading = adding === item.id;
                return (
                  <div key={item.id} className="bg-white px-4 py-3 flex items-center gap-3">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-800 text-sm">{item.name}</p>
                      <p className="text-gray-400 text-xs mt-0.5">{item.description}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-red-500 text-sm">S/ {item.price}</span>
                      <button
                        onClick={() => handleAdd(item)}
                        disabled={isLoading || orderLoading}
                        className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xl transition-colors
                          ${isLoading || orderLoading ? 'bg-gray-300' : isAdded ? 'bg-green-500' : 'bg-red-500 active:bg-red-600'}`}
                      >
                        {isLoading ? '·' : isAdded ? '✓' : '+'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}

      {/* Botón ver pedido */}
      {added.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100">
          <button
            onClick={() => navigate(-1)}
            className="w-full bg-green-500 text-white rounded-xl py-3 font-bold"
          >
            ✅ Ver pedido ({added.size} agregados)
          </button>
        </div>
      )}
    </div>
  );
}
