import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { MenuItem, Promotion } from '../types';

const CATEGORY_ICONS: Record<string, string> = {
  'Entradas':    '🥗',
  'Principales': '🍽️',
  'Postres':     '🍰',
  'Bebidas':     '🥤',
};

export default function MenuSelectPage() {
  const { tableId } = useParams<{ tableId: string }>();
  const navigate = useNavigate();
  const { menuItems, fetchMenu, addOrderItem, menuLoading, orderLoading, activePromotions, fetchActivePromotions } = useAppStore();
  const [adding, setAdding]     = useState<string | null>(null);
  const [added, setAdded]       = useState<Set<string>>(new Set());
  const [noteItem, setNoteItem] = useState<MenuItem | null>(null);
  const [noteText, setNoteText] = useState('');

  useEffect(() => {
    if (menuItems.length === 0) fetchMenu();
    fetchActivePromotions();
  }, []);

  function getPromoForItem(item: MenuItem): Promotion | undefined {
    const priority: Record<string, number> = { item: 0, category: 1, all: 2 };
    return [...activePromotions]
      .sort((a, b) => priority[a.applies_to] - priority[b.applies_to])
      .find(p =>
        p.applies_to === 'item'     ? p.target_id === item.id :
        p.applies_to === 'category' ? p.target_id === item.category : true
      );
  }

  function promoBadge(p: Promotion): string {
    if (p.type === '2x1')        return '2×1';
    if (p.type === 'percentage') return `-${p.value}%`;
    if (p.type === 'fixed')      return `-S/${p.value}`;
    return '🏷️';
  }

  function discountedPrice(item: MenuItem, p: Promotion): number | null {
    if (p.type === 'percentage') return item.price * (1 - p.value / 100);
    if (p.type === 'fixed')      return Math.max(0, item.price - p.value);
    return null; // 2x1 depende de la cantidad, no muestra precio fijo
  }

  const categories = menuItems
    .filter(m => m.available)
    .reduce((acc, item) => {
      if (!acc[item.category]) acc[item.category] = [];
      acc[item.category].push(item);
      return acc;
    }, {} as Record<string, MenuItem[]>);

  const handleAddClick = (item: MenuItem) => {
    setNoteItem(item);
    setNoteText('');
  };

  const handleConfirmAdd = async () => {
    if (!tableId || !noteItem) return;
    setAdding(noteItem.id);
    await addOrderItem(tableId, noteItem.id, 1, noteText.trim() || undefined);
    setAdding(null);
    setAdded(prev => new Set(prev).add(noteItem.id));
    setNoteItem(null);
  };

  return (
    <div className="min-h-screen bg-gray-100 pb-24">
      {/* Header */}
      <div className="bg-red-500 text-white px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="text-red-200 text-lg">←</button>
        <h1 className="font-bold text-lg">🍴 Agregar Platos</h1>
        {orderLoading && (
          <span className="text-red-200 text-xs ml-auto animate-pulse">Guardando...</span>
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
                const promo     = getPromoForItem(item);
                return (
                  <div key={item.id} className="bg-white px-4 py-3 flex items-center gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-800 text-sm">{item.name}</p>
                        {promo && (
                          <span className="bg-orange-100 text-orange-600 text-xs font-bold px-1.5 py-0.5 rounded-full">
                            {promoBadge(promo)}
                          </span>
                        )}
                      </div>
                      <p className="text-gray-400 text-xs mt-0.5">{item.description}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        {promo && discountedPrice(item, promo) !== null ? (
                          <>
                            <span className="text-gray-300 text-xs line-through block">S/ {item.price}</span>
                            <span className="font-bold text-orange-500 text-sm">S/ {discountedPrice(item, promo)!.toFixed(2)}</span>
                          </>
                        ) : promo?.type === '2x1' ? (
                          <>
                            <span className="font-bold text-red-500 text-sm">S/ {item.price}</span>
                            <span className="text-orange-500 text-xs block">lleva 2, paga 1</span>
                          </>
                        ) : (
                          <span className="font-bold text-red-500 text-sm">S/ {item.price}</span>
                        )}
                      </div>
                      <button
                        onClick={() => handleAddClick(item)}
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

      {/* Modal de notas */}
      {noteItem && (
        <div className="fixed inset-0 bg-black/50 z-20 flex items-end">
          <div className="bg-white w-full rounded-t-2xl p-4 space-y-3">
            <div>
              <p className="font-bold text-gray-800">{noteItem.name}</p>
              <p className="text-gray-400 text-xs">S/ {noteItem.price}</p>
            </div>
            <p className="text-gray-500 text-sm">¿Alguna indicación para cocina? (opcional)</p>
            <textarea
              autoFocus
              rows={2}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none outline-none focus:border-red-400"
              placeholder="Ej: sin cebolla, término medio, sin gluten..."
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
            />
            <div className="flex gap-2">
              <button
                onClick={handleConfirmAdd}
                disabled={adding === noteItem.id}
                className="flex-1 bg-red-500 text-white rounded-xl py-3 font-bold disabled:opacity-50"
              >
                {adding === noteItem.id ? 'Agregando...' : 'Agregar al pedido'}
              </button>
              <button
                onClick={() => setNoteItem(null)}
                className="bg-gray-100 text-gray-600 rounded-xl px-4 font-bold"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
