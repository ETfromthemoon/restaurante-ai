import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { MenuItem, Promotion } from '../types';
import { aiService, PairingSuggestion } from '../services/api';

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
  const [adding, setAdding]         = useState<string | null>(null);
  const [added, setAdded]           = useState<Set<string>>(new Set());
  const [noteItem, setNoteItem]     = useState<MenuItem | null>(null);
  const [noteText, setNoteText]     = useState('');
  const [search, setSearch]           = useState('');
  const [activeCategory, setCategory] = useState<string | null>(null);

  // Pairing state
  const [pairingItem, setPairingItem]           = useState<MenuItem | null>(null);
  const [pairingSuggestions, setPairingSuggestions] = useState<PairingSuggestion[]>([]);
  const [pairingLoading, setPairingLoading]     = useState(false);

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
    return null;
  }

  const allCategories = [...new Set(menuItems.filter(m => m.available).map(m => m.category))];

  const filtered = menuItems.filter(m => m.available &&
    (!activeCategory || m.category === activeCategory) &&
    (!search || m.name.toLowerCase().includes(search.toLowerCase()))
  );

  const categories = filtered.reduce((acc, item) => {
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

    // Obtener sugerencias de maridaje en paralelo
    const itemForPairing = noteItem;
    setNoteItem(null);
    setPairingItem(itemForPairing);
    setPairingSuggestions([]);
    setPairingLoading(true);
    try {
      const res = await aiService.getPairing(itemForPairing.id);
      setPairingSuggestions(res.suggestions);
    } catch {
      // silencioso si falla
    } finally {
      setPairingLoading(false);
    }
  };

  const handleAddPairing = async (suggestion: PairingSuggestion) => {
    if (!tableId || !suggestion.id) return;
    setAdding(suggestion.id);
    await addOrderItem(tableId, suggestion.id, 1, undefined);
    setAdding(null);
    setAdded(prev => new Set(prev).add(suggestion.id!));
  };

  return (
    <div className="min-h-screen pb-24" style={{ background: 'var(--bg-base)' }}>
      {/* Header */}
      <div className="banner-metallic-red text-white px-5 py-4 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="text-red-200 text-lg">←</button>
        <h1 className="font-semibold text-lg tracking-tight">🍴 Agregar Platos</h1>
        {orderLoading && (
          <span className="text-red-200 text-xs ml-auto animate-pulse">Guardando...</span>
        )}
      </div>

      {/* Búsqueda y filtro de categorías */}
      {menuItems.length > 0 && (
        <div className="sticky top-14 z-10 px-3 py-2 space-y-2" style={{ background: 'var(--bg-surface-strong)', borderBottom: '1px solid var(--border)' }}>
          <input
            type="text"
            placeholder="Buscar plato..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-glass w-full !rounded-xl !py-2"
          />
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <button
              onClick={() => setCategory(null)}
              className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                !activeCategory ? 'btn-metallic-red border-transparent' : 'btn-ghost border'
              }`}
              style={activeCategory ? { borderColor: 'var(--border)' } : undefined}
            >
              Todos
            </button>
            {allCategories.map(cat => (
              <button
                key={cat}
                onClick={() => setCategory(activeCategory === cat ? null : cat)}
                className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                  activeCategory === cat ? 'btn-metallic-red border-transparent' : 'btn-ghost border'
                }`}
                style={activeCategory !== cat ? { borderColor: 'var(--border)' } : undefined}
              >
                {CATEGORY_ICONS[cat] ?? '🍴'} {cat}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Estado del menú */}
      {menuLoading ? (
        <div className="flex flex-col items-center justify-center pt-24 gap-3">
          <p className="t-faint text-lg animate-pulse">Cargando menú...</p>
        </div>
      ) : menuItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center pt-24 gap-4">
          <p className="t-faint font-medium">No se pudo cargar el menú</p>
          <button
            onClick={() => fetchMenu()}
            className="btn-metallic-red px-6 py-2 rounded-xl font-medium"
          >
            Reintentar
          </button>
        </div>
      ) : Object.keys(categories).length === 0 ? (
        <div className="flex flex-col items-center justify-center pt-24 gap-3">
          <p className="text-4xl">🔍</p>
          <p className="t-faint font-medium">Sin resultados para "{search}"</p>
          <button onClick={() => { setSearch(''); setCategory(null); }} className="text-red-500 text-sm font-semibold">
            Limpiar filtros
          </button>
        </div>
      ) : (
        Object.entries(categories).map(([category, items]) => (
          <div key={category}>
            <div style={{ background: 'var(--border)', padding: '0.5rem 1rem' }} className="sticky top-14 z-10">
              <p className="text-xs font-semibold text-red-500 uppercase tracking-wider">
                {CATEGORY_ICONS[category] ?? '🍴'} {category}
              </p>
            </div>
            <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
              {items.map(item => {
                const isAdded   = added.has(item.id);
                const isLoading = adding === item.id;
                const promo     = getPromoForItem(item);
                return (
                  <div key={item.id} className="px-4 py-3 flex items-center gap-3" style={{ background: 'var(--bg-surface-strong)' }}>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold t-primary text-sm">{item.name}</p>
                        {promo && (
                          <span className="bg-orange-100 text-orange-600 text-xs font-semibold px-1.5 py-0.5 rounded-full">
                            {promoBadge(promo)}
                          </span>
                        )}
                      </div>
                      <p className="t-faint text-xs mt-0.5 font-light">{item.description}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        {promo && discountedPrice(item, promo) !== null ? (
                          <>
                            <span className="t-faint text-xs line-through block">S/ {item.price}</span>
                            <span className="font-semibold text-orange-500 text-sm">S/ {discountedPrice(item, promo)!.toFixed(2)}</span>
                          </>
                        ) : promo?.type === '2x1' ? (
                          <>
                            <span className="font-semibold text-red-500 text-sm">S/ {item.price}</span>
                            <span className="text-orange-500 text-xs block font-light">lleva 2, paga 1</span>
                          </>
                        ) : (
                          <span className="font-semibold text-red-500 text-sm">S/ {item.price}</span>
                        )}
                      </div>
                      <button
                        onClick={() => handleAddClick(item)}
                        disabled={isLoading || orderLoading}
                        className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold text-xl transition-colors
                          ${isLoading || orderLoading ? 'bg-gray-300' : isAdded ? 'bg-green-500' : 'btn-metallic-red'}`}
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
        <div className="fixed bottom-0 left-0 right-0 p-4" style={{ background: 'var(--bg-surface-strong)', borderTop: '1px solid var(--border)' }}>
          <button
            onClick={() => navigate(-1)}
            className="w-full btn-metallic-teal rounded-xl py-3 font-medium"
          >
            ✅ Ver pedido ({added.size} agregados)
          </button>
        </div>
      )}

      {/* Modal de notas */}
      {noteItem && (
        <div className="fixed inset-0 bg-black/50 z-20 flex items-end">
          <div className="w-full rounded-t-2xl p-4 space-y-3" style={{ background: 'var(--bg-surface-strong)' }}>
            <div>
              <p className="font-semibold t-primary">{noteItem.name}</p>
              <p className="t-faint text-xs">S/ {noteItem.price}</p>
            </div>
            <p className="t-muted text-sm font-light">¿Alguna indicación para cocina? (opcional)</p>
            <textarea
              autoFocus
              rows={2}
              className="input-glass w-full !rounded-xl !py-2 resize-none"
              placeholder="Ej: sin cebolla, término medio, sin gluten..."
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
            />
            <div className="flex gap-2">
              <button
                onClick={handleConfirmAdd}
                disabled={adding === noteItem.id}
                className="flex-1 btn-metallic-red rounded-xl py-3 font-medium disabled:opacity-50"
              >
                {adding === noteItem.id ? 'Agregando...' : 'Agregar al pedido'}
              </button>
              <button
                onClick={() => setNoteItem(null)}
                className="btn-ghost rounded-xl px-4 font-medium"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de sugerencias de maridaje */}
      {pairingItem && (
        <div className="fixed inset-0 bg-black/50 z-20 flex items-end">
          <div className="w-full rounded-t-2xl p-4 space-y-3 max-h-[70vh] overflow-y-auto" style={{ background: 'var(--bg-surface-strong)' }}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-orange-500 font-semibold uppercase tracking-wider">✨ Sugerencias de maridaje</p>
                <p className="font-semibold t-primary mt-0.5">Combina bien con {pairingItem.name}</p>
              </div>
              <button
                onClick={() => setPairingItem(null)}
                className="t-faint text-xl leading-none"
              >×</button>
            </div>

            {pairingLoading ? (
              <div className="py-6 flex flex-col items-center gap-2">
                <div className="w-6 h-6 border-2 border-orange-300 border-t-orange-500 rounded-full animate-spin" />
                <p className="t-faint text-sm">Claude está pensando...</p>
              </div>
            ) : pairingSuggestions.length === 0 ? (
              <p className="t-faint text-sm text-center py-4">No se obtuvieron sugerencias</p>
            ) : (
              <div className="space-y-3">
                {pairingSuggestions.map((s, i) => {
                  const isAlreadyAdded = s.id ? added.has(s.id) : false;
                  return (
                    <div key={i} className="rounded-xl p-3 flex items-center gap-3" style={{ border: '1px solid var(--border)' }}>
                      <div className="flex-1">
                        <p className="font-semibold t-primary text-sm">{s.name}</p>
                        <p className="t-faint text-xs mt-0.5 italic">"{s.reason}"</p>
                        {s.price && <p className="text-red-500 font-semibold text-xs mt-1">S/ {s.price}</p>}
                      </div>
                      {s.id && (
                        <button
                          onClick={() => handleAddPairing(s)}
                          disabled={isAlreadyAdded || adding === s.id}
                          className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold text-xl flex-shrink-0 transition-colors
                            ${adding === s.id ? 'bg-gray-300' : isAlreadyAdded ? 'bg-green-500' : 'btn-metallic-orange'}`}
                        >
                          {adding === s.id ? '·' : isAlreadyAdded ? '✓' : '+'}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <button
              onClick={() => setPairingItem(null)}
              className="btn-ghost w-full rounded-xl py-3 font-semibold text-sm"
            >
              Continuar sin agregar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
