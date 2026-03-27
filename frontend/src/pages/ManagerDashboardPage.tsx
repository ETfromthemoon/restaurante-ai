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
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
        <p className="t-muted text-sm font-light">Cargando dashboard...</p>
      </div>
    </div>
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-8 gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold t-primary tracking-tight">Dashboard</h1>
          <p className="text-sm mt-1.5 t-muted font-light">
            Resumen del día · {new Date().toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={fetchAiSummary} disabled={aiSummaryLoading} className="btn-accent flex items-center gap-2">
            <Sparkles size={15} />
            {aiSummaryLoading ? 'Generando...' : 'Resumen IA'}
          </button>
          <button className="btn-ghost flex items-center gap-2">
            <Download size={15} /> Exportar
          </button>
        </div>
      </div>

      {delayData && delayData.alerts.length > 0 && (
        <div className="mb-5 glass rounded-2xl p-4 flex items-start gap-3" style={{ borderColor: 'rgba(251,146,60,0.2)' }}>
          <AlertTriangle size={17} className="text-orange-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-orange-400">⚠️ Demoras detectadas</p>
            <p className="text-xs mt-1 t-muted font-light">{delayData.message}</p>
            <div className="flex flex-wrap gap-2 mt-2">
              {delayData.alerts.map(a => (
                <span key={a.orderId} className="text-xs px-2.5 py-1 rounded-full font-medium"
                      style={{ background: 'rgba(251,146,60,0.08)', border: '1px solid rgba(251,146,60,0.15)', color: '#fb923c' }}>
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 flex items-center justify-center p-4">
          <div className="glass-strong rounded-2xl p-7 max-w-lg w-full space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Sparkles size={17} className="text-accent" />
                <h3 className="font-semibold text-lg t-primary">Resumen del Turno</h3>
              </div>
              <button onClick={() => setAiSummaryOpen(false)} className="text-2xl leading-none t-muted hover:t-primary">×</button>
            </div>
            {aiSummaryLoading ? (
              <div className="py-10 flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
                <p className="text-sm t-muted font-light">Claude está analizando el turno...</p>
              </div>
            ) : aiSummary ? (
              <>
                <p className="text-sm leading-relaxed t-secondary font-light">{aiSummary.summary}</p>
                <div className="grid grid-cols-2 gap-2 pt-2">
                  {Object.entries(aiSummary.stats).map(([k, v]) => (
                    <div key={k} className="glass rounded-xl p-3">
                      <p className="text-[10px] uppercase tracking-[0.12em] t-muted font-medium">{k.replace(/_/g, ' ')}</p>
                      <p className="text-sm font-medium mt-1 t-primary">{String(v)}</p>
                    </div>
                  ))}
                </div>
                <button onClick={fetchAiSummary} className="btn-ghost w-full justify-center text-sm gap-2 flex items-center">
                  <RefreshCw size={14} /> Regenerar
                </button>
              </>
            ) : (
              <p className="text-sm text-center py-8 t-muted font-light">No se pudo generar el resumen</p>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <GlassCard className="relative overflow-hidden">
          <p className="text-[11px] mb-2 t-muted font-medium uppercase tracking-[0.1em]">Ventas Hoy</p>
          <p className="text-2xl font-semibold" style={{ background: 'linear-gradient(135deg, #059669, #34d399)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            S/ {data?.sales_today.toFixed(2) ?? '0.00'}
          </p>
          <p className="text-[11px] text-accent mt-1.5 font-light">
            {data?.orders_today ?? 0} pedido{(data?.orders_today ?? 0) !== 1 ? 's' : ''} cerrado{(data?.orders_today ?? 0) !== 1 ? 's' : ''}
          </p>
          <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-[0.04]" style={{ background: 'linear-gradient(135deg, #059669, #34d399)' }} />
        </GlassCard>
        <GlassCard className="relative overflow-hidden">
          <p className="text-[11px] mb-2 t-muted font-medium uppercase tracking-[0.08em] leading-tight">Pedidos</p>
          <p className="text-2xl font-semibold t-primary">{data?.orders_today ?? 0}</p>
          <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-[0.04]" style={{ background: 'linear-gradient(135deg, #3b82f6, #60a5fa)' }} />
        </GlassCard>
        <GlassCard className="relative overflow-hidden">
          <p className="text-[11px] mb-2 t-muted font-medium uppercase tracking-[0.1em]">Mesas Activas</p>
          <p className="text-2xl font-semibold t-primary">{data?.tables_occupied ?? 0} / 10</p>
          <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-[0.04]" style={{ background: 'linear-gradient(135deg, #f59e0b, #fbbf24)' }} />
        </GlassCard>
        <GlassCard className="relative overflow-hidden">
          <p className="text-[11px] mb-2 t-muted font-medium uppercase tracking-[0.08em] leading-tight">T. Promedio</p>
          <p className="text-2xl font-semibold t-primary">
            {data?.avg_service_minutes != null ? data.avg_service_minutes : '—'}
            {data?.avg_service_minutes != null && <span className="text-base font-light t-muted ml-1">min</span>}
          </p>
          <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-[0.04]" style={{ background: 'linear-gradient(135deg, #a855f7, #c084fc)' }} />
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <GlassCard className="lg:col-span-2 !p-0">
          <div className="p-6 pb-0 flex justify-between items-center">
            <h3 className="text-sm font-medium t-primary">Ventas del Día</h3>
          </div>
          <div className="h-56 px-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: 'var(--bg-surface-strong)', border: '1px solid var(--border-strong)', borderRadius: 14, color: '#10b981', fontSize: 13 }}
                  formatter={(v: any) => [`S/ ${Number(v).toFixed(2)}`, 'Ventas']}
                />
                <Area type="monotone" dataKey="ventas" stroke="#10b981" strokeWidth={2} fill="url(#salesGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
        <GlassCard>
          <div className="flex justify-between items-center mb-5">
            <h3 className="text-sm font-medium t-primary">Top Platos Hoy</h3>
            <span className="text-[11px] text-accent cursor-pointer font-medium">Ver todo</span>
          </div>
          {!data?.top_items.length ? (
            <p className="text-sm text-center py-10 t-muted font-light">Sin datos aún</p>
          ) : (
            data.top_items.map((item, i) => (
              <div key={i} className="flex justify-between items-center py-3 last:border-0" style={{ borderBottom: '1px solid var(--border)' }}>
                <span className="text-sm t-secondary font-light">{item.name}</span>
                <span className="text-sm font-medium t-primary">{item.total_qty} uds</span>
              </div>
            ))
          )}
        </GlassCard>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <button onClick={() => navigate('/gerente/menu')} className="btn-ghost justify-center flex-col gap-1.5 !py-5">
          <BookOpen size={19} className="text-accent" /><span className="text-xs font-light">Menú</span>
        </button>
        <button onClick={() => navigate('/gerente/promociones')} className="btn-ghost justify-center flex-col gap-1.5 !py-5">
          <Tag size={19} className="text-orange-400" /><span className="text-xs font-light">Promociones</span>
        </button>
        <button onClick={() => navigate('/gerente/mesas/asignar')} className="btn-ghost justify-center flex-col gap-1.5 !py-5">
          <Users size={19} className="text-blue-400" /><span className="text-xs font-light">Asignar Mesas</span>
        </button>
        <button onClick={() => navigate('/gerente/caja')} className="btn-ghost justify-center flex-col gap-1.5 !py-5 relative">
          <Wallet size={19} className="text-emerald-500" /><span className="text-xs font-light">Caja</span>
          <span className={`absolute top-2 right-2 w-2 h-2 rounded-full ${activeCajaSession ? 'bg-emerald-400 shadow-[0_0_6px_theme(colors.emerald.400)]' : 'bg-red-400'}`} />
        </button>
        <button onClick={() => navigate('/gerente/caja/historial')} className="btn-ghost justify-center flex-col gap-1.5 !py-5">
          <ClipboardList size={19} className="text-blue-400" /><span className="text-xs font-light">Historial</span>
        </button>
        <button onClick={() => navigate('/mesas')} className="btn-ghost justify-center flex-col gap-1.5 !py-5">
          <span className="text-xl">🍽</span><span className="text-xs font-light">Ver Mesas</span>
        </button>
      </div>
    </div>
  );
}
