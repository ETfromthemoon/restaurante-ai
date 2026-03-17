import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { MenuItem } from '../types';

const CATEGORIES = ['Entradas', 'Principales', 'Postres', 'Bebidas'];

interface FormState {
  name:        string;
  description: string;
  price:       string;
  category:    string;
  available:   boolean;
}

const EMPTY_FORM: FormState = {
  name: '', description: '', price: '', category: 'Principales', available: true,
};

export default function MenuManagePage() {
  const navigate = useNavigate();
  const [items, setItems]       = useState<MenuItem[]>([]);
  const [editing, setEditing]   = useState<MenuItem | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm]         = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving]     = useState(false);

  useEffect(() => { loadMenu(); }, []);

  async function loadMenu() {
    const { data } = await api.get('/menu');
    setItems(data);
  }

  function openCreate() {
    setForm(EMPTY_FORM);
    setCreating(true);
    setEditing(null);
  }

  function openEdit(item: MenuItem) {
    setForm({
      name:        item.name,
      description: item.description,
      price:       String(item.price),
      category:    item.category,
      available:   item.available,
    });
    setEditing(item);
    setCreating(false);
  }

  function closeForm() {
    setCreating(false);
    setEditing(null);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const payload = { ...form, price: parseFloat(form.price) };
      if (creating) {
        await api.post('/menu', payload);
      } else if (editing) {
        await api.patch(`/menu/${editing.id}`, payload);
      }
      await loadMenu();
      closeForm();
    } finally {
      setSaving(false);
    }
  }

  async function toggleAvailable(item: MenuItem) {
    await api.patch(`/menu/${item.id}`, { available: !item.available });
    loadMenu();
  }

  const showForm = creating || !!editing;
  const canSave  = !!form.name.trim() && !!form.price && parseFloat(form.price) > 0;

  return (
    <div className="min-h-screen bg-gray-100 pb-6">
      {/* Header */}
      <div className="bg-red-500 text-white px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => navigate('/gerente')} className="text-red-200 text-lg">←</button>
        <h1 className="font-bold text-lg flex-1">Gestionar Menú</h1>
        <button
          onClick={openCreate}
          className="bg-white text-red-500 rounded-lg px-3 py-1 text-sm font-bold"
        >
          + Nuevo
        </button>
      </div>

      {/* Formulario crear / editar */}
      {showForm && (
        <div className="bg-white mx-4 mt-4 rounded-xl p-4 shadow-sm space-y-3">
          <h2 className="font-bold text-gray-700 text-sm">
            {creating ? 'Nuevo plato' : `Editando: ${editing?.name}`}
          </h2>

          <input
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-red-400"
            placeholder="Nombre *"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          />
          <input
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-red-400"
            placeholder="Descripción"
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          />

          <div className="flex gap-2">
            <input
              className="w-1/2 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-red-400"
              placeholder="Precio *"
              type="number"
              min="0"
              step="0.5"
              value={form.price}
              onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
            />
            <select
              className="w-1/2 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-red-400 bg-white"
              value={form.category}
              onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
            >
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={form.available}
              onChange={e => setForm(f => ({ ...f, available: e.target.checked }))}
            />
            Disponible en el menú
          </label>

          <div className="flex gap-2 pt-1">
            <button
              onClick={handleSave}
              disabled={saving || !canSave}
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

      {/* Lista de platos agrupados por categoría */}
      {CATEGORIES.map(category => {
        const categoryItems = items.filter(i => i.category === category);
        if (categoryItems.length === 0) return null;
        return (
          <div key={category} className="mt-4">
            <div className="px-4 py-2 bg-gray-200">
              <p className="text-xs font-bold text-red-500 uppercase tracking-wider">{category}</p>
            </div>
            <div className="divide-y divide-gray-100">
              {categoryItems.map(item => (
                <div key={item.id} className="bg-white px-4 py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`font-semibold text-sm truncate ${item.available ? 'text-gray-800' : 'text-gray-400 line-through'}`}>
                        {item.name}
                      </p>
                    </div>
                    <p className="text-gray-400 text-xs mt-0.5">S/ {item.price.toFixed(2)}</p>
                  </div>

                  <button
                    onClick={() => toggleAvailable(item)}
                    className={`text-xs px-2.5 py-1 rounded-full font-semibold flex-shrink-0 ${
                      item.available
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {item.available ? 'Activo' : 'Inactivo'}
                  </button>

                  <button
                    onClick={() => openEdit(item)}
                    className="text-red-500 text-sm font-semibold px-1 flex-shrink-0"
                  >
                    Editar
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
