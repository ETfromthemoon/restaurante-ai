import { useEffect, useState } from 'react';
import { Users, Plus, Pencil, Trash2, X, Eye, EyeOff } from 'lucide-react';
import { useToast } from '../hooks/useToast';
import api from '../services/api';

type UserRole = 'waiter' | 'cook' | 'manager';

interface UserItem {
  id:    string;
  name:  string;
  email: string;
  role:  UserRole;
}

interface FormState {
  name:     string;
  email:    string;
  password: string;
  role:     UserRole;
}

const EMPTY_FORM: FormState = { name: '', email: '', password: '', role: 'waiter' };

const ROLE_LABELS: Record<UserRole, string> = {
  waiter:  'Mesero',
  cook:    'Cocina',
  manager: 'Gerente',
};

const ROLE_COLORS: Record<UserRole, string> = {
  waiter:  'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  cook:    'bg-orange-500/10 text-orange-400 border border-orange-500/20',
  manager: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
};

export default function UsersManagePage() {
  const toast = useToast();
  const [users, setUsers]         = useState<UserItem[]>([]);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [showForm, setShowForm]   = useState(false);
  const [editing, setEditing]     = useState<UserItem | null>(null);
  const [form, setForm]           = useState<FormState>(EMPTY_FORM);
  const [showPass, setShowPass]   = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<UserItem | null>(null);

  async function fetchUsers() {
    try {
      const res = await api.get<UserItem[]>('/users');
      setUsers(res.data);
    } catch (err: any) {
      toast.error(err.message ?? 'Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchUsers(); }, []);

  function openCreate() {
    setForm(EMPTY_FORM);
    setEditing(null);
    setShowPass(false);
    setShowForm(true);
  }

  function openEdit(u: UserItem) {
    setForm({ name: u.name, email: u.email, password: '', role: u.role });
    setEditing(u);
    setShowPass(false);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditing(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        // Solo enviar password si fue rellenado
        const payload: Partial<FormState> = {
          name:  form.name,
          email: form.email,
          role:  form.role,
        };
        if (form.password.trim()) payload.password = form.password;
        await api.patch(`/users/${editing.id}`, payload);
        toast.success('Usuario actualizado');
      } else {
        await api.post('/users', form);
        toast.success('Usuario creado');
      }
      closeForm();
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message ?? 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(u: UserItem) {
    try {
      await api.delete(`/users/${u.id}`);
      toast.success(`Usuario "${u.name}" eliminado`);
      setConfirmDelete(null);
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message ?? 'Error al eliminar');
      setConfirmDelete(null);
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
               style={{ background: 'linear-gradient(135deg, rgba(5,150,105,0.15), rgba(16,185,129,0.2))' }}>
            <Users size={20} className="text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold t-primary">Gestión de Usuarios</h1>
            <p className="text-xs t-muted font-light">{users.length} usuario{users.length !== 1 ? 's' : ''} registrado{users.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white transition-all"
          style={{ background: 'linear-gradient(135deg, #059669, #10b981)', boxShadow: '0 4px 12px rgba(16,185,129,0.25)' }}
        >
          <Plus size={16} />
          Nuevo usuario
        </button>
      </div>

      {/* Users table */}
      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center t-muted text-sm">Cargando usuarios...</div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center t-muted text-sm">No hay usuarios registrados</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th className="text-left px-5 py-3 text-[11px] uppercase tracking-widest t-muted font-medium">Nombre</th>
                <th className="text-left px-5 py-3 text-[11px] uppercase tracking-widest t-muted font-medium">Email</th>
                <th className="text-left px-5 py-3 text-[11px] uppercase tracking-widest t-muted font-medium">Rol</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => (
                <tr
                  key={u.id}
                  style={{ borderBottom: i < users.length - 1 ? '1px solid var(--border)' : 'none' }}
                  className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
                >
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-semibold text-white shrink-0"
                           style={{ background: 'linear-gradient(135deg, #059669, #10b981)' }}>
                        {u.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <span className="text-sm font-medium t-primary">{u.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-sm t-muted">{u.email}</td>
                  <td className="px-5 py-3.5">
                    <span className={`text-[11px] font-medium px-2.5 py-1 rounded-lg ${ROLE_COLORS[u.role]}`}>
                      {ROLE_LABELS[u.role]}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEdit(u)}
                        className="p-1.5 rounded-lg t-muted hover:t-primary hover:bg-black/[0.05] dark:hover:bg-white/[0.05] transition-all"
                        title="Editar"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => setConfirmDelete(u)}
                        className="p-1.5 rounded-lg text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-all"
                        title="Eliminar"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create / Edit modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
             style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
             onClick={e => { if (e.target === e.currentTarget) closeForm(); }}>
          <div className="glass-card w-full max-w-md p-6 space-y-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold t-primary">
                {editing ? 'Editar usuario' : 'Nuevo usuario'}
              </h2>
              <button onClick={closeForm} className="t-muted hover:t-primary transition-colors">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Nombre */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium t-muted uppercase tracking-wider">Nombre completo</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  required
                  placeholder="Ej: María López"
                  className="w-full px-3 py-2.5 rounded-xl text-sm bg-transparent t-primary"
                  style={{ border: '1px solid var(--border)' }}
                />
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium t-muted uppercase tracking-wider">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  required
                  placeholder="usuario@restaurante.com"
                  className="w-full px-3 py-2.5 rounded-xl text-sm bg-transparent t-primary"
                  style={{ border: '1px solid var(--border)' }}
                />
              </div>

              {/* Contraseña */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium t-muted uppercase tracking-wider">
                  Contraseña {editing && <span className="normal-case font-normal t-muted">(dejar vacío para no cambiar)</span>}
                </label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    required={!editing}
                    minLength={editing ? undefined : 6}
                    placeholder={editing ? '••••••' : 'Mínimo 6 caracteres'}
                    className="w-full px-3 py-2.5 pr-10 rounded-xl text-sm bg-transparent t-primary"
                    style={{ border: '1px solid var(--border)' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(s => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 t-muted hover:t-primary transition-colors"
                  >
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Rol */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium t-muted uppercase tracking-wider">Rol</label>
                <select
                  value={form.role}
                  onChange={e => setForm(f => ({ ...f, role: e.target.value as UserRole }))}
                  className="w-full px-3 py-2.5 rounded-xl text-sm bg-transparent t-primary cursor-pointer"
                  style={{ border: '1px solid var(--border)' }}
                >
                  <option value="waiter">Mesero</option>
                  <option value="cook">Cocina</option>
                  <option value="manager">Gerente</option>
                </select>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={closeForm}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium t-muted transition-all"
                  style={{ border: '1px solid var(--border)' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-white transition-all disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg, #059669, #10b981)' }}
                >
                  {saving ? 'Guardando...' : editing ? 'Guardar cambios' : 'Crear usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirm modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
             style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
             onClick={() => setConfirmDelete(null)}>
          <div className="glass-card w-full max-w-sm p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-red-500/10">
                <Trash2 size={18} className="text-red-400" />
              </div>
              <div>
                <h2 className="text-sm font-semibold t-primary">Eliminar usuario</h2>
                <p className="text-xs t-muted">Esta acción no se puede deshacer</p>
              </div>
            </div>
            <p className="text-sm t-primary">
              ¿Estás seguro de que deseas eliminar a <strong>{confirmDelete.name}</strong>?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium t-muted transition-all"
                style={{ border: '1px solid var(--border)' }}
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-white bg-red-500 hover:bg-red-600 transition-all"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
