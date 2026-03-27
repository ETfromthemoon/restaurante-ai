import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { Table } from '../types';
import GlassCard from '../components/ui/GlassCard';
import StatusBadge from '../components/ui/StatusBadge';
import { Clock, Users, User, Settings, Receipt } from 'lucide-react';

function elapsedMins(iso?: string): number | null {
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
}

function formatTime(mins: number): string {
  if (mins < 1) return 'ahora';
  if (mins < 60) return `${mins}min`;
  return `${Math.floor(mins / 60)}h ${mins % 60}min`;
}

export default function TableMapPage() {
  const navigate = useNavigate();
  const {
    tables, fetchTables, fetchMenu, fetchWaiters,
    user, waiters, readyTableIds, clearReadyTable,
    urgencyMinutes, setUrgencyMinutes,
  } = useAppStore();

  const [showSettings, setShowSettings] = useState(false);
  const [settingsValue, setSettingsValue] = useState(String(urgencyMinutes));

  useEffect(() => { fetchTables(); fetchMenu(); fetchWaiters(); }, []);

  // Audio al llegar pedido listo
  useEffect(() => {
    if (readyTableIds.length === 0) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.5);
    } catch {}
  }, [readyTableIds.length]);

  const handleTable = (table: Table) => {
    if (readyTableIds.includes(table.id)) clearReadyTable(table.id);
    navigate(`/mesas/${table.id}/pedido`);
  };

  const waiterFirstName = (id?: string | null): string | null => {
    if (!id) return null;
    const w = waiters.find(w => w.id === id);
    return w ? w.name.split(' ')[0] : null;
  };

  // Mesero ve SOLO sus mesas; gerente ve todas
  const visibleTables = user?.role === 'waiter'
    ? tables.filter(t => t.assigned_waiter_id === user.id)
    : tables;

  // Orden por número de mesa (posición física definida por el gerente)
  const sortedTables = [...visibleTables].sort((a, b) => a.number - b.number);

  const free        = visibleTables.filter(t => t.status === 'free').length;
  const occupied    = visibleTables.filter(t => t.status !== 'free').length;
  const readyCount  = visibleTables.filter(t => t.status === 'ready').length;
  const billingCount = visibleTables.filter(t => t.status === 'billing').length;

  const handleSaveThreshold = () => {
    const v = parseInt(settingsValue, 10);
    if (!isNaN(v) && v >= 5) setUrgencyMinutes(v);
    setShowSettings(false);
  };

  const topBar: Record<string, string> = {
    occupied: 'bg-red-500',
    ready:    'bg-accent shadow-[0_0_10px_rgba(16,185,129,0.3)]',
    served:   'bg-blue-500',
    billing:  'bg-amber-400',
  };

  const numberColor: Record<string, string> = {
    free:     't-faint',
    occupied: 'text-red-400',
    ready:    'text-accent-light',
    served:   'text-blue-400',
    billing:  'text-amber-400',
  };

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-2xl font-bold">Mesas</h1>
          <p className="t-secondary text-sm mt-1">
            {occupied} ocupada{occupied !== 1 ? 's' : ''} · {free} libre{free !== 1 ? 's' : ''}
            {readyCount > 0 && (
              <span className="text-accent ml-1">· {readyCount} lista{readyCount !== 1 ? 's' : ''}</span>
            )}
            {billingCount > 0 && (
              <span className="text-amber-400 ml-1 font-medium">· {billingCount} pide{billingCount !== 1 ? 'n' : ''} cuenta</span>
            )}
          </p>
        </div>
        {user?.role === 'manager' && (
          <button
            onClick={() => { setShowSettings(s => !s); setSettingsValue(String(urgencyMinutes)); }}
            className="btn-ghost !p-2"
            title="Configurar alerta de tiempo"
          >
            <Settings size={18} className={showSettings ? 'text-accent' : 't-muted'} />
          </button>
        )}
      </div>

      {/* Panel de configuración (solo gerente) */}
      {showSettings && user?.role === 'manager' && (
        <div className="mb-5 glass rounded-xl p-4 border border-[var(--border-strong)]">
          <div className="flex items-center gap-2 mb-3">
            <Clock size={14} className="text-accent" />
            <span className="text-sm font-medium t-primary">Umbral de alerta por tiempo</span>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="5"
                max="180"
                value={settingsValue}
                onChange={e => setSettingsValue(e.target.value)}
                className="w-20 glass rounded-lg px-3 py-1.5 text-sm t-primary text-center border border-[var(--border)] focus:outline-none focus:border-accent"
              />
              <span className="text-sm t-muted">minutos</span>
            </div>
            <button onClick={handleSaveThreshold} className="btn-accent text-sm !py-1.5 !px-4">
              Guardar
            </button>
            <p className="text-[11px] t-muted w-full mt-1">
              El reloj de cada mesa se mostrará en rojo cuando supere este tiempo sin interacción
            </p>
          </div>
        </div>
      )}

      {/* Grilla de mesas */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {sortedTables.map(table => {
          const mins           = elapsedMins(table.last_interaction_at);
          const hasNotification = readyTableIds.includes(table.id);
          const isBilling      = table.status === 'billing';
          const isUrgent       = mins !== null && mins >= urgencyMinutes && table.status !== 'free';
          const assignedName   = waiterFirstName(table.assigned_waiter_id);

          return (
            <GlassCard
              key={table.id}
              className={`relative overflow-hidden text-center
                ${hasNotification ? 'animate-pulse' : ''}
                ${isBilling ? 'ring-2 ring-amber-400/50' : ''}
              `}
              glow={table.status === 'ready'}
              onClick={() => handleTable(table)}
            >
              {/* Barra de color superior por estado */}
              {topBar[table.status] && (
                <div className={`absolute top-0 left-0 right-0 h-[3px] ${topBar[table.status]}`} />
              )}

              {/* Banner de urgencia — pide cuenta */}
              {isBilling && (
                <div className="absolute top-[3px] left-0 right-0 bg-amber-400/15 border-b border-amber-400/25 py-0.5 flex items-center justify-center gap-1">
                  <Receipt size={9} className="text-amber-400" />
                  <span className="text-[9px] font-bold text-amber-400 uppercase tracking-widest">Pide cuenta</span>
                </div>
              )}

              {/* Contenido de la tarjeta */}
              <div>
                {/* Espaciador si hay banner de billing */}
                {isBilling && <div className="h-4" />}

                {/* Número de mesa */}
                <div className={`text-3xl font-bold mb-1 ${numberColor[table.status] ?? 't-faint'}`}>
                  {table.number}
                </div>

                {/* Capacidad */}
                <div className="flex items-center justify-center gap-1 mb-2.5">
                  <Users size={11} className="t-faint" />
                  <span className="text-[11px] t-secondary">{table.capacity} pers.</span>
                </div>

                {/* Estado */}
                <StatusBadge status={table.status} />

                {/* Mesero asignado */}
                {assignedName && (
                  <div className="flex items-center justify-center gap-1 mt-2">
                    <User size={10} className="t-faint" />
                    <span className="text-[10px] t-muted">{assignedName}</span>
                  </div>
                )}

                {/* Tiempo desde última interacción */}
                {mins !== null && table.status !== 'free' && (
                  <div className={`flex items-center justify-center gap-1 mt-1.5 ${isUrgent ? 'text-red-400' : 't-muted'}`}>
                    <Clock size={10} className={isUrgent ? 'text-red-400' : 't-faint'} />
                    <span className={`text-[10px] ${isUrgent ? 'font-semibold' : ''}`}>
                      {formatTime(mins)}
                    </span>
                  </div>
                )}

                {/* Notificación — pedido listo */}
                {hasNotification && (
                  <div className="mt-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-accent/20 text-accent inline-block">
                    Listo para servir
                  </div>
                )}
              </div>
            </GlassCard>
          );
        })}
      </div>

      {/* Mensaje si el mesero no tiene mesas asignadas */}
      {user?.role === 'waiter' && sortedTables.length === 0 && (
        <div className="text-center py-16">
          <Users size={32} className="t-faint mx-auto mb-3" />
          <p className="t-muted text-sm">No tienes mesas asignadas</p>
          <p className="t-faint text-xs mt-1">Contacta al gerente para asignarte mesas</p>
        </div>
      )}
    </div>
  );
}
