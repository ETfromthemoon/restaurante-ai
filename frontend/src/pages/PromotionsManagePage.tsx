import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { Promotion, PromotionType, PromotionAppliesTo } from '../types';

const DAYS = [
  { label: 'Lun', value: 1 },
  { label: 'Mar', value: 2 },
  { label: 'Mié', value: 3 },
  { label: 'Jue', value: 4 },
  { label: 'Vie', value: 5 },
  { label: 'Sáb', value: 6 },
  { label: 'Dom', value: 7 },
];

interface FormState {
  name: string;
  type: PromotionType;
  value: string;
  applies_to: PromotionAppliesTo;
  target_id: string;
  days_of_week: number[];
  time_start: string;
  time_end: string;
}

const EMPTY_FORM: FormState = {
  name: '',
  type: 'percentage',
  value: '0',
  applies_to: 'all',
  target_id: '',
  days_of_week: [1, 2, 3, 4, 5],
  time_start: '12:00',
  time_end: '15:00',
};

export default function PromotionsManagePage() {
  const navigate = useNavigate();
  const { promotions, menuItems, fetchAllPromotions, fetchMenu, createPromotion, updatePromotion } = useAppStore();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing]   = useState<Promotion | null>(null);
  const [form, setForm]         = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving]     = useState(false);

  useEffect(() => {
    fetchAllPromotions();
    if (menuItems.length === 0) fetchMenu();
  }, []);

  const categories = [...new Set(menuItems.map(m => m.category))];

  function openCreate() {
    setForm(EMPTY_FORM);
    setEditing(null);
    setShowForm(true);
  }

  function openEdit(p: Promotion) {
    setForm({
      name:         p.name,
      type:         p.type,
      value:        String(p.value),
      applies_to:   p.applies_to,
      target_id:    p.target_id ?? '',
      days_of_week: p.days_of_week,
      time_start:   p.time_start,
      time_end:     p.time_end,
    });
    setEditing(p);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditing(null);
  }

  function toggleDay(day: number) {
    setForm(f => ({
      ...f,
      days_of_week: f.days_of_week.includes(day)
        ? f.days_of_week.filter(d => d !== day)
        : [...f.days_of_week, day].sort(),
    }));
  }

  async function handleSave() {
    if (!form.name.trim() || form.days_of_week.length === 0) return;
    setSaving(true);
    try {
      const payload = {
        name:         form.name.trim(),
        type:         form.type,
        value:        parseFloat(form.value) || 0,
        applies_to:   form.applies_to,
        target_id:    form.applies_to === 'all' ? null : form.target_id || null,
        days_of_week: form.days_of_week,
        time_start:   form.time_start,
        time_end:     form.time_end,
        active:       true,
      };
      if (editing) {
        await updatePromotion(editing.id, payload);
      } else {
        await createPromotion(payload);
      }
      closeForm();
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(p: Promotion) {
    await updatePromotion(p.id, { active: !p.active });
  }

  function typeLabel(type: PromotionType): string {
    if (type === '2x1')        return '2×1';
    if (type === 'percentage') return '%';
    if (type === 'fixed')      return 'S/ fijo';
    return type;
  }

  return (
    <div className="min-h-screen bg-gray-100 pb-6">
      {/* Header */}
      <div className="bg-red-500 text-white px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => navigate('/gerente')} className="text-red-200 text-lg">←</button>
        <h1 className="font-bold text-lg flex-1">🏷️ Gestionar Promociones</h1>
        <button
          onClick={openCreate}
          className="bg-white text-red-500 rounded-lg px-3 py-1 text-sm font-bold"
        >
          + Nueva
        </button>
      </div>

      {/* Formulario */}
      {showForm && (
        <div className="bg-white mx-4 mt-4 rounded-xl p-4 shadow-sm space-y-3">
          <h2 className="font-bold text-gray-700 text-sm">
            {editing ? `Editando: ${editing.name}` : 'Nueva promoción'}
          </h2>

          <input
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-red-400"
            placeholder="Nombre *"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          />

          {/* Tipo */}
          <div className="flex gap-2">
            {(['2x1', 'percentage', 'fixed'] as PromotionType[]).map(t => (
              <button
                key={t}
                onClick={() => setForm(f => ({ ...f, type: t }))}
                className={`flex-1 py-2 rounded-lg text-sm font-bold border transition-colors ${
                  form.type === t
                    ? 'bg-red-500 text-white border-red-500'
                    : 'bg-white text-gray-600 border-gray-200'
                }`}
              >
                {t === '2x1' ? '2×1' : t === 'percentage' ? 'Porcentaje' : 'Monto fijo'}
              </button>
            ))}
          </div>

          {form.type !== '2x1' && (
            <input
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-red-400"
              placeholder={form.type === 'percentage' ? 'Porcentaje (ej: 20)' : 'Monto a descontar (S/)'}
              type="number"
              min="0"
              step="0.5"
              value={form.value}
              onChange={e => setForm(f => ({ ...f, value: e.target.value }))}
            />
          )}

          {/* Aplica a */}
          <div>
            <p className="text-xs text-gray-500 mb-1">Aplica a</p>
            <div className="flex gap-2">
              {(['all', 'category', 'item'] as PromotionAppliesTo[]).map(a => (
                <button
                  key={a}
                  onClick={() => setForm(f => ({ ...f, applies_to: a, target_id: '' }))}
                  className={`flex-1 py-2 rounded-lg text-sm font-bold border transition-colors ${
                    form.applies_to === a
                      ? 'bg-orange-500 text-white border-orange-500'
                      : 'bg-white text-gray-600 border-gray-200'
                  }`}
                >
                  {a === 'all' ? 'Todo' : a === 'category' ? 'Categoría' : 'Plato'}
                </button>
              ))}
            </div>
          </div>

          {form.applies_to === 'category' && (
            <select
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-red-400 bg-white"
              value={form.target_id}
              onChange={e => setForm(f => ({ ...f, target_id: e.target.value }))}
            >
              <option value="">— Seleccionar categoría —</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          )}

          {form.applies_to === 'item' && (
            <select
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-red-400 bg-white"
              value={form.target_id}
              onChange={e => setForm(f => ({ ...f, target_id: e.target.value }))}
            >
              <option value="">— Seleccionar plato —</option>
              {menuItems.filter(m => m.available).map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          )}

          {/* Días */}
          <div>
            <p className="text-xs text-gray-500 mb-1">Días activos</p>
            <div className="flex gap-1">
              {DAYS.map(d => (
                <button
                  key={d.value}
                  onClick={() => toggleDay(d.value)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                    form.days_of_week.includes(d.value)
                      ? 'bg-blue-500 text-white border-blue-500'
                      : 'bg-white text-gray-500 border-gray-200'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Horario */}
          <div className="flex gap-2">
            <div className="flex-1">
              <p className="text-xs text-gray-500 mb-1">Hora inicio</p>
              <input
                type="time"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-red-400"
                value={form.time_start}
                onChange={e => setForm(f => ({ ...f, time_start: e.target.value }))}
              />
            </div>
            <div className="flex-1">
              <p className="text-xs text-gray-500 mb-1">Hora fin</p>
              <input
                type="time"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-red-400"
                value={form.time_end}
                onChange={e => setForm(f => ({ ...f, time_end: e.target.value }))}
              />
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={handleSave}
              disabled={saving || !form.name.trim() || form.days_of_week.length === 0}
              className="flex-1 bg-red-500 text-white rounded-xl py-2.5 font-bold text-sm disabled:opacity-50"
            >
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
            <button
              onClick={closeForm}
              className="flex-1 bg-gray-100 text-gray-600 rounded-xl py-2.5 font-bold text-sm"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Lista de promociones */}
      <div className="mt-4 divide-y divide-gray-100">
        {promotions.length === 0 ? (
          <div className="text-center pt-16">
            <p className="text-gray-400 font-medium">Sin promociones aún</p>
            <p className="text-gray-300 text-sm mt-1">Crea tu primera promoción</p>
          </div>
        ) : (
          promotions.map(p => (
            <div key={p.id} className="bg-white px-4 py-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className={`font-semibold text-sm truncate ${p.active ? 'text-gray-800' : 'text-gray-400'}`}>
                    {p.name}
                  </p>
                  <span className="bg-orange-100 text-orange-600 text-xs font-bold px-1.5 py-0.5 rounded-full flex-shrink-0">
                    {typeLabel(p.type)}{p.type !== '2x1' ? ` ${p.value}` : ''}
                  </span>
                </div>
                <p className="text-gray-400 text-xs mt-0.5">
                  {p.applies_to === 'all' ? 'Todo el menú' :
                   p.applies_to === 'category' ? `Cat: ${p.target_id}` :
                   `Plato: ${menuItems.find(m => m.id === p.target_id)?.name ?? p.target_id}`}
                  {' · '}
                  {DAYS.filter(d => p.days_of_week.includes(d.value)).map(d => d.label).join(' ')}
                  {' · '}
                  {p.time_start}–{p.time_end}
                </p>
              </div>

              <button
                onClick={() => toggleActive(p)}
                className={`text-xs px-2.5 py-1 rounded-full font-semibold flex-shrink-0 ${
                  p.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                }`}
              >
                {p.active ? 'Activa' : 'Inactiva'}
              </button>

              <button
                onClick={() => openEdit(p)}
                className="text-red-500 text-sm font-semibold px-1 flex-shrink-0"
              >
                Editar
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
