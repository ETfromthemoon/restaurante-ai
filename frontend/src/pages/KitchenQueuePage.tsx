import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { kitchenService, KitchenStats } from '../services/api';
import { Order } from '../types';
import GlassCard from '../components/ui/GlassCard';
import StatusBadge from '../components/ui/StatusBadge';
import { CheckCircle, Clock, Flame, TrendingUp, Zap, RefreshCw, ChefHat } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

function elapsed(createdAt: string) {
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
}

function KpiCard({
  icon, label, value, sub, accent, urgent
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;
  urgent?: boolean;
}) {
  return (
    <div className="glass-card relative overflow-hidden">
      <div className="flex items-start justify-between mb-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: urgent ? 'rgba(239,68,68,0.10)' : 'rgba(16,185,129,0.08)' }}>
          {icon}
        </div>
        {urgent && (
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(239,68,68,0.08)', color: '#f87171', border: '1px solid rgba(239,68,68,0.15)' }}>
            ⚠ Atención
          </span>
        )}
      </div>
      <p className="text-[10px] t-muted font-medium uppercase tracking-[0.08em] mb-1 leading-tight">{label}</p>
      <p className="text-2xl font-semibold tracking-tight"
        style={{ color: accent ?? 'var(--text-1)' }}>
        {value}
        {sub && <span className="text-sm font-light t-muted ml-1">{sub}</span>}
      </p>
      {/* decorative circle */}
      <div className="absolute -top-5 -right-5 w-20 h-20 rounded-full opacity-[0.04]"
        style={{ background: accent ?? '#10b981' }} />
    </div>
  );
}

function ItemsDonut({ pending, preparing, done }: { pending: number; preparing: number; done: number }) {
  const total = pending + preparing + done;
  if (total === 0) return (
    <div className="flex items-center justify-center h-full">
      <p className="text-sm t-muted font-light">Sin items en cola</p>
    </div>
  );

  const items = [
    { label: 'Pendientes', value: pending, color: '#94a3b8' },
    { label: 'Preparando', value: preparing, color: '#f97316' },
    { label: 'Listos', value: done, color: '#10b981' },
  ].filter(i => i.value > 0);

  return (
    <div className="flex flex-col gap-2">
      {items.map(i => (
        <div key={i.label}>
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs font-light t-secondary">{i.label}</span>
            <span className="text-xs font-medium" style={{ color: i.color }}>{i.value}</span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
            <div className="h-full rounded-full transition-all"
              style={{
                width: `${(i.value / total) * 100}%`,
                background: i.color,
                boxShadow: `0 0 8px ${i.color}44`,
              }} />
          </div>
        </div>
      ))}
      <p className="text-[11px] t-muted font-light mt-1">{total} items en total</p>
    </div>
  );
}

const BUCKET_COLORS: Record<string, string> = {
  '0-10':  '#10b981',
  '10-20': '#f59e0b',
  '20-30': '#f97316',
  '30+':   '#ef4444',
};

export default function KitchenQueuePage() {
  const navigate = useNavigate();
  const { kitchenOrders, fetchKitchenOrders } = useAppStore();
  const [stats, setStats]         = useState<KitchenStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [lastRefresh, setLastRefresh]   = useState(new Date());

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const data = await kitchenService.getStats();
      setStats(data);
      setLastRefresh(new Date());
    } catch { /* silencioso */ }
    finally { setStatsLoading(false); }
  }, []);

  useEffect(() => {
    fetchKitchenOrders();
    loadStats();
    // Auto-refresh cada 30s
    const interval = setInterval(() => {
      fetchKitchenOrders();
      loadStats();
    }, 30_000);
    return () => clearInterval(interval);
  }, []);

  const sorted = [...kitchenOrders].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  const timeLabel = lastRefresh.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="space-y-6">

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <ChefHat size={22} className="text-accent" />
            Panel de Cocina
          </h1>
          <p className="t-muted text-sm mt-1.5 font-light">
            Actualizado a las {timeLabel} · {sorted.length} pedido{sorted.length !== 1 ? 's' : ''} activo{sorted.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => { fetchKitchenOrders(); loadStats(); }}
          disabled={statsLoading}
          className="btn-ghost !px-3 !py-2 gap-1.5"
        >
          <RefreshCw size={14} className={statsLoading ? 'animate-spin' : ''} />
          <span className="text-xs">Actualizar</span>
        </button>
      </div>

      {/* ── Zona 1: KPIs ────────────────────────────────────── */}
      <div data-onboarding-id="kitchen-kpis" className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          icon={<Clock size={18} className="text-accent" />}
          label="En Cola"
          value={statsLoading ? '—' : (stats?.orders_in_queue ?? 0)}
          sub="pedidos"
          accent="#10b981"
        />
        <KpiCard
          icon={<Flame size={18} className={stats?.urgent_count ? 'text-red-400' : 'text-slate-400'} />}
          label="Urgentes"
          value={statsLoading ? '—' : (stats?.urgent_count ?? 0)}
          sub="+20 min"
          accent={stats?.urgent_count ? '#f87171' : undefined}
          urgent={(stats?.urgent_count ?? 0) > 0}
        />
        <KpiCard
          icon={<CheckCircle size={18} className="text-accent" />}
          label="Completados"
          value={statsLoading ? '—' : (stats?.completed_today ?? 0)}
          accent="#10b981"
        />
        <KpiCard
          icon={<TrendingUp size={18} className="text-blue-400" />}
          label="T. Promedio"
          value={statsLoading ? '—' : (stats?.avg_prep_minutes ?? '—')}
          sub={stats?.avg_prep_minutes ? 'min' : undefined}
          accent="#60a5fa"
        />
      </div>

      {/* ── Zona 2: Gráfica + Items status ─────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Histograma de tiempos */}
        <div className="lg:col-span-2 glass-card">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-medium t-primary">Distribución de Tiempos Hoy</h3>
              <p className="text-xs t-muted font-light mt-0.5">Minutos desde pedido hasta entrega</p>
            </div>
            {stats?.fastest_order && (
              <div className="text-right">
                <div className="flex items-center gap-1 justify-end">
                  <Zap size={12} className="text-accent" />
                  <span className="text-xs text-accent font-medium">Récord: {stats.fastest_order.minutes} min</span>
                </div>
                <p className="text-[10px] t-muted font-light">Mesa {stats.fastest_order.table_number}</p>
              </div>
            )}
          </div>

          {statsLoading ? (
            <div className="h-40 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
            </div>
          ) : stats?.time_distribution && stats.time_distribution.some(b => b.count > 0) ? (
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.time_distribution} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--bg-surface-strong)',
                      border: '1px solid var(--border-strong)',
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                    formatter={(v: any) => [`${v} pedido${v !== 1 ? 's' : ''}`, 'Cantidad']}
                    labelFormatter={(l) => `Rango: ${l} min`}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {stats.time_distribution.map((entry) => (
                      <Cell
                        key={entry.label}
                        fill={BUCKET_COLORS[entry.label] ?? '#10b981'}
                        fillOpacity={0.85}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-44 flex flex-col items-center justify-center gap-2">
              <p className="text-sm t-muted font-light">Sin datos de entregas hoy</p>
              <p className="text-xs t-muted font-light">Los datos aparecerán cuando se completen pedidos</p>
            </div>
          )}

          {/* Leyenda de colores */}
          <div className="flex gap-4 mt-4 flex-wrap">
            {Object.entries(BUCKET_COLORS).map(([label, color]) => (
              <div key={label} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                <span className="text-[11px] t-muted font-light">{label} min</span>
              </div>
            ))}
          </div>
        </div>

        {/* Estado actual de items */}
        <div className="glass-card">
          <h3 className="text-sm font-medium t-primary mb-1">Items en Cocina Ahora</h3>
          <p className="text-xs t-muted font-light mb-5">Estado de cada plato en preparación</p>
          {statsLoading ? (
            <div className="flex items-center justify-center h-24">
              <div className="w-6 h-6 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
            </div>
          ) : (
            <ItemsDonut
              pending={stats?.items_by_status.pending ?? 0}
              preparing={stats?.items_by_status.preparing ?? 0}
              done={stats?.items_by_status.done ?? 0}
            />
          )}

          {/* Récord más lento */}
          {stats?.slowest_order && (
            <div className="mt-5 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
              <p className="text-[10px] uppercase tracking-[0.1em] t-muted font-medium mb-2">Más lento hoy</p>
              <div className="flex items-center justify-between">
                <span className="text-xs t-secondary">Mesa {stats.slowest_order.table_number}</span>
                <span className="text-xs font-medium text-red-400">{stats.slowest_order.minutes} min</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Zona 3: Cola activa ─────────────────────────────── */}
      <div>
        <h2 className="text-base font-semibold tracking-tight mb-4 t-primary flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-orange-400 shadow-[0_0_8px_theme(colors.orange.400)]" />
          Cola Activa
        </h2>

        {sorted.length === 0 ? (
          <div className="glass-card text-center py-16">
            <CheckCircle size={40} className="text-accent mx-auto mb-3 opacity-40" />
            <p className="t-secondary font-medium">Sin pedidos en cocina</p>
            <p className="text-sm t-muted font-light mt-1">La cocina está al día 🎉</p>
          </div>
        ) : (
          <div data-onboarding-id="kitchen-queue" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {sorted.map((order: Order, orderIdx: number) => {
              const mins      = elapsed(order.created_at);
              const urgent    = mins > 20;
              const doneCount = order.items?.filter(i => i.status === 'done').length ?? 0;
              const total     = order.items?.length ?? 0;
              const pct       = total > 0 ? (doneCount / total) * 100 : 0;
              const urgencyColor = mins > 30 ? '#ef4444' : mins > 20 ? '#f97316' : mins > 10 ? '#f59e0b' : '#10b981';

              return (
                <GlassCard
                  key={order.id}
                  {...(orderIdx === 0 ? { 'data-onboarding-id': 'kitchen-order-card' } : {})}
                  onClick={() => navigate(`/cocina/${order.id}`)}
                  className={urgent ? '' : ''}
                >
                  {/* Barra de urgencia lateral */}
                  <div className="absolute left-0 top-3 bottom-3 w-[3px] rounded-r-full"
                    style={{ background: urgencyColor, boxShadow: `0 0 8px ${urgencyColor}66` }} />

                  <div className="pl-3">
                    <div className="flex justify-between items-center mb-3">
                      <div>
                        <span className="font-semibold text-base">Mesa {order.table?.number ?? '?'}</span>
                        <span className="text-xs t-muted font-light ml-2">{total} plato{total !== 1 ? 's' : ''}</span>
                      </div>
                      <span
                        className="text-xs font-medium px-2.5 py-1 rounded-full"
                        style={{
                          background: urgent ? 'rgba(239,68,68,0.08)' : 'var(--bg-surface)',
                          border: `1px solid ${urgent ? 'rgba(239,68,68,0.15)' : 'var(--border)'}`,
                          color: urgencyColor,
                        }}
                      >
                        {mins} min {mins > 30 ? '🔥🔥' : mins > 20 ? '🔥' : ''}
                      </span>
                    </div>

                    {order.items?.map(item => (
                      <div key={item.id} className="flex justify-between items-center py-1.5 text-sm border-b last:border-0"
                        style={{ borderColor: 'var(--border)' }}>
                        <span className="font-light t-secondary">
                          <span className="text-accent font-medium mr-2">{item.quantity}×</span>
                          {item.menu_item?.name ?? 'Plato'}
                        </span>
                        <StatusBadge status={item.status} />
                      </div>
                    ))}

                    {/* Progress bar */}
                    <div className="mt-3 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${pct}%`,
                          background: `linear-gradient(90deg, #059669, #34d399)`,
                          boxShadow: '0 0 10px rgba(16,185,129,0.3)',
                        }}
                      />
                    </div>
                    <div className="flex justify-between mt-1.5">
                      <span className="text-[10px] t-muted font-light">{doneCount}/{total} listos</span>
                      <span className="text-[10px] font-medium text-accent">{Math.round(pct)}%</span>
                    </div>
                  </div>
                </GlassCard>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
