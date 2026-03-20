import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import api, { aiService, ShiftSummaryResponse, DelayCheckResponse } from '../services/api';
import GlassCard from '../components/ui/GlassCard';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Download, BookOpen, Tag, Users, Wallet, ClipboardList, Sparkles, AlertTriangle, RefreshCw } from 'lucide-react';

interface DashboardData {
  sales_today:         number;
  orders_today:        number;
  tables_occupied:     number;
  top_items:           { name: string; total_qty: number }[];
  avg_service_minutes: number | null;
}

const chartData = [
  { time: '11am', ventas: 320 }, { time: '12pm', ventas: 580 },
  { time: '1pm', ventas: 1200 }, { time: '2pm', ventas: 1800 },
  { time: '3pm', ventas: 2400 }, { time: '4pm', ventas: 3200 },
  { time: '5pm', ventas: 4385 },
];

export default function ManagerDashboardPage() {
  const navigate = useNavigate();
  const { activeCajaSession, fetchActiveCaja } = useAppStore();

  useEffect(() => { fetchActiveCaja(); }, []);
  const [data, setData]       = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const [aiSummary, setAiSummary]               = useState<ShiftSummaryResponse | null>(null);
  const [aiSummaryLoading, setAiSummaryLoading] = useState(false);
  const [aiSummaryOpen, setAiSummaryOpen]       = useState(false);
  const [delayData, setDelayData]               = useState<DelayCheckResponse | null>(null);
  const [delayLoading, setDelayLoading]         = useState(false);

  useEffect(() => {
    api.get('/dashboard').then(r => setData(r.data)).finally(() => setLoading(false));
    checkDelays();
  }, []);

  const checkDelays = async () => {
    setDelayLoading(true);
    try { const res = await aiService.getDelayCheck(); setDelayData(res); }
    catch { /* silencioso */ }
    finally { setDelayLoading(false); }
  };

  const fetchAiSummary = async () => {
    setAiSummaryLoading(true);
    setAiSummaryOpen(true);
    try { const res = await aiService.getShiftSummary(); setAiSummary(res); }
    catch { setAiSummary(null); }
    finally { setAiSummaryLoading(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <p className="t-muted animate-pulse">Cargando dashboard...</p>
    </div>
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-6 gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold t-primary">Dashboard</h1>
          <p className="text-sm mt-1 t-muted">
            Resumen del día · {new Date().toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={fetchAiSummary} disabled={aiSummaryLoading} className="btn-accent flex items-center gap-2">
            <Sparkles size={16} />
            {aiSummaryLoading ? 'Generando...' : 'Resumen IA'}
          </button>
          <button className="btn-ghost flex items-center gap-2">
            <Download size={16} /> Exportar
          </button>
        </div>
      </div>

      {delayData && delayData.alerts.length > 0 && (
        <div className="mb-4 glass rounded-xl p-4 flex items-start gap-3" style={{ borderColor: 'rgba(251,146,60,0.3)' }}>
          <AlertTriangle size={18} className="text-orange-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-orange-400">⚠️ Demoras detectadas</p>
            <p className="text-xs mt-1 t-muted">{delayData.message}</p>
            <div className="flex flex-wrap gap-2 mt-2">
              {delayData.alerts.map(a => (
                <span key={a.orderId} className="bg-orange-400/10 border border-orange-400/20 text-orange-500 dark:text-orange-400 text-xs px-2 py-0.5 rounded-full">
                  Mesa {a.tableId}: {a.elapsedMinutes} min
                </span>
              ))}
            </div>
          </div>
          <button onClick={checkDelays} disabled={delayLoading} className="t-muted hover:t-primary transition-colors">
            <RefreshCw size={14} className={delayLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      )}

      {aiSummaryOpen && (
        <div className="fixed inset-0 bg-black/60 z-30 flex items-center justify-center p-4">
          <div className="glass-strong rounded-2xl p-6 max-w-lg w-full space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-accent" />
                <h3 className="font-bold text-lg t-primary">Resumen del Turno</h3>
              </div>
              <button onClick={() => setAiSummaryOpen(false)} className="text-2xl leading-none t-muted hover:t-primary">×</button>
            </div>
            {aiSummaryLoading ? (
              <div className="py-8 flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
                <p className="text-sm t-muted">Claude está analizando el turno...</p>
              </div>
            ) : aiSummary ? (
              <>
                <p className="text-sm leading-relaxed t-secondary">{aiSummary.summary}</p>
                <div className="grid grid-cols-2 gap-2 pt-2">
                  {Object.entries(aiSummary.stats).map(([k, v]) => (
                    <div key={k} className="glass rounded-lg p-2.5">
                      <p className="text-[10px] uppercase tracking-wider t-muted">{k.replace(/_/g, ' ')}</p>
                      <p className="text-sm font-semibold mt-0.5 t-primary">{String(v)}</p>
                    </div>
                  ))}
                </div>
                <button onClick={fetchAiSummary} className="btn-ghost w-full justify-center text-sm gap-2 flex items-center">
                  <RefreshCw size={14} /> Regenerar
                </button>
              </>
            ) : (
              <p className="text-sm text-center py-6 t-muted">No se pudo generar el resumen</p>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <GlassCard className="relative overflow-hidden">
          <p className="text-xs mb-2 t-muted">Ventas Hoy</p>
          <p className="text-2xl font-bold text-accent-light">S/ {data?.sales_today.toFixed(2) ?? '0.00'}</p>
          <p className="text-[11px] text-accent mt-1">
            {data?.orders_today ?? 0} pedido{(data?.orders_today ?? 0) !== 1 ? 's' : ''} cerrado{(data?.orders_today ?? 0) !== 1 ? 's' : ''}
          </p>
          <div className="absolute -top-5 -right-5 w-20 h-20 rounded-full bg-accent opacity-5" />
        </GlassCard>
        <GlassCard className="relative overflow-hidden">
          <p className="text-xs mb-2 t-muted">Pedidos Cerrados</p>
          <p className="text-2xl font-bold t-primary">{data?.orders_today ?? 0}</p>
          <div className="absolute -top-5 -right-5 w-20 h-20 rounded-full bg-accent opacity-5" />
        </GlassCard>
        <GlassCard className="relative overflow-hidden">
          <p className="text-xs mb-2 t-muted">Mesas Activas</p>
          <p className="text-2xl font-bold t-primary">{data?.tables_occupied ?? 0} / 10</p>
          <div className="absolute -top-5 -right-5 w-20 h-20 rounded-full bg-accent opacity-5" />
        </GlassCard>
        <GlassCard className="relative overflow-hidden">
          <p className="text-xs mb-2 t-muted">Tiempo Promedio</p>
          <p className="text-2xl font-bold t-primary">
            {data?.avg_service_minutes != null ? data.avg_service_minutes : '—'}
            {data?.avg_service_minutes != null && <span className="text-base font-normal t-muted ml-1">min</span>}
          </p>
          <div className="absolute -top-5 -right-5 w-20 h-20 rounded-full bg-accent opacity-5" />
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <GlassCard className="lg:col-span-2 !p-0">
          <div className="p-5 pb-0 flex justify-between items-center">
            <h3 className="text-sm font-semibold t-primary">Ventas del Día</h3>
          </div>
          <div className="h-56 px-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: 'var(--bg-surface-strong)', border: '1px solid var(--border-strong)', borderRadius: 8, color: '#10b981', fontSize: 13 }}
                  formatter={(v: any) => [`S/ ${Number(v).toFixed(2)}`, 'Ventas']}
                />
                <Area type="monotone" dataKey="ventas" stroke="#10b981" strokeWidth={2} fill="url(#salesGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
        <GlassCard>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-semibold t-primary">Top Platos Hoy</h3>
            <span className="text-[11px] text-accent cursor-pointer">Ver todo</span>
          </div>
          {!data?.top_items.length ? (
            <p className="text-sm text-center py-8 t-muted">Sin datos aún</p>
          ) : (
            data.top_items.map((item, i) => (
              <div key={i} className="flex justify-between items-center py-2.5 last:border-0" style={{ borderBottom: '1px solid var(--border)' }}>
                <span className="text-sm t-secondary">{item.name}</span>
                <span className="text-sm font-semibold t-primary">{item.total_qty} uds</span>
              </div>
            ))
          )}
        </GlassCard>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <button onClick={() => navigate('/gerente/menu')} className="btn-ghost justify-center flex-col gap-1 !py-4">
          <BookOpen size={20} className="text-accent" /><span className="text-xs">Menú</span>
        </button>
        <button onClick={() => navigate('/gerente/promociones')} className="btn-ghost justify-center flex-col gap-1 !py-4">
          <Tag size={20} className="text-orange-400" /><span className="text-xs">Promociones</span>
        </button>
        <button onClick={() => navigate('/gerente/mesas/asignar')} className="btn-ghost justify-center flex-col gap-1 !py-4">
          <Users size={20} className="text-blue-400" /><span className="text-xs">Asignar Mesas</span>
        </button>
        <button onClick={() => navigate('/gerente/caja')} className="btn-ghost justify-center flex-col gap-1 !py-4 relative">
          <Wallet size={20} className="text-emerald-500" /><span className="text-xs">Caja</span>
          <span className={`absolute top-2 right-2 w-2 h-2 rounded-full ${activeCajaSession ? 'bg-emerald-400 shadow-[0_0_6px_theme(colors.emerald.400)]' : 'bg-red-400'}`} />
        </button>
        <button onClick={() => navigate('/gerente/caja/historial')} className="btn-ghost justify-center flex-col gap-1 !py-4">
          <ClipboardList size={20} className="text-blue-400" /><span className="text-xs">Historial</span>
        </button>
        <button onClick={() => navigate('/mesas')} className="btn-ghost justify-center flex-col gap-1 !py-4">
          <span className="text-xl">🍽</span><span className="text-xs">Ver Mesas</span>
        </button>
      </div>
    </div>
  );
}
