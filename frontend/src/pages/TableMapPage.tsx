import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { Table } from '../types';
import GlassCard from '../components/ui/GlassCard';
import StatusBadge from '../components/ui/StatusBadge';

function elapsed(iso?: string): string | null {
  if (!iso) return null;
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'ahora';
  if (mins < 60) return `${mins}min`;
  return `${Math.floor(mins / 60)}h ${mins % 60}min`;
}

export default function TableMapPage() {
  const navigate = useNavigate();
  const { tables, fetchTables, fetchMenu, user, readyTableIds, clearReadyTable } = useAppStore();

  useEffect(() => { fetchTables(); fetchMenu(); }, []);

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

  const visibleTables = user?.role === 'waiter'
    ? tables.filter(t => t.assigned_waiter_id === user.id || !t.assigned_waiter_id)
    : tables;

  const free = visibleTables.filter(t => t.status === 'free').length;
  const occupied = visibleTables.filter(t => t.status !== 'free').length;
  const readyCount = visibleTables.filter(t => t.status === 'ready').length;

  const borderColor: Record<string, string> = {
    free: '', occupied: 'border-red-500/30', ready: 'border-accent/30',
    served: 'border-blue-500/30', billing: 'border-yellow-500/30',
  };
  const topBar: Record<string, string> = {
    occupied: 'bg-red-500', ready: 'bg-accent shadow-[0_0_10px_rgba(16,185,129,0.3)]',
    served: 'bg-blue-500', billing: 'bg-yellow-500',
  };
  const numberColor: Record<string, string> = {
    free: 't-faint', occupied: 'text-red-400', ready: 'text-accent-light',
    served: 'text-blue-400', billing: 'text-yellow-400',
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Mesas</h1>
          <p className="t-secondary text-sm mt-1">
            {occupied} ocupada{occupied !== 1 ? 's' : ''} · {free} libre{free !== 1 ? 's' : ''}
            {readyCount > 0 && <span className="text-accent ml-1">· {readyCount} lista{readyCount !== 1 ? 's' : ''}</span>}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {visibleTables.map(table => {
          const wait = elapsed(table.last_interaction_at);
          const hasNotification = readyTableIds.includes(table.id);

          return (
            <GlassCard
              key={table.id}
              className={`text-center relative overflow-hidden ${borderColor[table.status] ?? ''} ${hasNotification ? 'animate-pulse' : ''}`}
              glow={table.status === 'ready'}
              onClick={() => handleTable(table)}
            >
              {/* Top color bar */}
              {topBar[table.status] && (
                <div className={`absolute top-0 left-0 right-0 h-[3px] ${topBar[table.status]}`} />
              )}

              <div className={`text-3xl font-bold mb-1 ${numberColor[table.status] ?? 't-faint'}`}>
                {table.number}
              </div>
              <div className="text-[11px] t-secondary mb-2">{table.capacity} personas</div>
              <StatusBadge status={table.status} />

              {hasNotification && (
                <div className="mt-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-accent/20 text-accent inline-block">
                  Listo para servir
                </div>
              )}
              {wait && table.status !== 'free' && (
                <div className="mt-1.5 text-[10px] t-secondary">{wait}</div>
              )}
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
}
