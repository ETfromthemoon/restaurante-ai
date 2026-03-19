import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import api from '../services/api';
import GlassCard from '../components/ui/GlassCard';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Download, BookOpen, Tag, Users, Wallet, ClipboardList } from 'lucide-react';

interface DashboardData {
  sales_today:         number;
  orders_today:        number;
  tables_occupied:     number;
  top_items:           { name: string; total_qty: number }[];
  avg_service_minutes: number | null;
}

// Datos simulados para el gráfico (en producción vendrían del backend)
const chartData = [
  { time: '11am', ventas: 320 }, { time: '12pm', ventas: 580 },
  { time: '1pm', ventas: 1200 }, { time: '2pm', ventas: 1800 },
  { time: '3pm', ventas: 2400 }, { time: '4pm', ventas: 3200 },
  { time: '5pm', ventas: 4385 },
];

export default function ManagerDashboardPage() {
  const navigate = useNavigate();
  const { user, activeCajaSession, fetchActiveCaja } = useAppStore();

  useEffect(() => { fetchActiveCaja(); }, []);
  const [data, setData]       = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard')
      .then(r => setData(r.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <p className="text-slate-500 animate-pulse">Cargando dashboard...</p>
    </div>
  );

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-slate-500 text-sm mt-1">
            Resumen del día · {new Date().toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <button className="btn-accent">
          <Download size={16} /> Exportar Reporte
        </button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <GlassCard className="relative overflow-hidden">
          <p className="text-xs text-slate-500 mb-2">Ventas Hoy</p>
          <p className="text-2xl font-bold text-accent-light">S/ {data?.sales_today.toFixed(2) ?? '0.00'}</p>
          <p className="text-[11px] text-accent mt-1">
            {data?.orders_today ?? 0} pedido{(data?.orders_today ?? 0) !== 1 ? 's' : ''} cerrado{(data?.orders_today ?? 0) !== 1 ? 's' : ''}
          </p>
          <div className="absolute -top-5 -right-5 w-20 h-20 rounded-full bg-accent opacity-5" />
        </GlassCard>

        <GlassCard className="relative overflow-hidden">
          <p className="text-xs text-slate-500 mb-2">Pedidos Cerrados</p>
          <p className="text-2xl font-bold">{data?.orders_today ?? 0}</p>
          <div className="absolute -top-5 -right-5 w-20 h-20 rounded-full bg-accent opacity-5" />
        </GlassCard>

        <GlassCard className="relative overflow-hidden">
          <p className="text-xs text-slate-500 mb-2">Mesas Activas</p>
          <p className="text-2xl font-bold">{data?.tables_occupied ?? 0} / 10</p>
          <div className="absolute -top-5 -right-5 w-20 h-20 rounded-full bg-accent opacity-5" />
        </GlassCard>

        <GlassCard className="relative overflow-hidden">
          <p className="text-xs text-slate-500 mb-2">Tiempo Promedio</p>
          <p className="text-2xl font-bold">
            {data?.avg_service_minutes != null ? data.avg_service_minutes : '—'}
            {data?.avg_service_minutes != null && <span className="text-base font-normal text-slate-500 ml-1">min</span>}
          </p>
          <div className="absolute -top-5 -right-5 w-20 h-20 rounded-full bg-accent opacity-5" />
        </GlassCard>
      </div>

      {/* Chart + Top Items */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <GlassCard className="lg:col-span-2 !p-0">
          <div className="p-5 pb-0 flex justify-between items-center">
            <h3 className="text-sm font-semibold">Ventas del Día</h3>
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
                <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: '#111d30', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#34d399', fontSize: 13 }}
                  formatter={(v: any) => [`S/ ${Number(v).toFixed(2)}`, 'Ventas']}
                />
                <Area type="monotone" dataKey="ventas" stroke="#10b981" strokeWidth={2} fill="url(#salesGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <GlassCard>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-semibold">Top Platos Hoy</h3>
            <span className="text-[11px] text-accent cursor-pointer">Ver todo</span>
          </div>
          {!data?.top_items.length ? (
            <p className="text-slate-500 text-sm text-center py-8">Sin datos aún</p>
          ) : (
            data.top_items.map((item, i) => (
              <div key={i} className="flex justify-between items-center py-2.5 border-b border-white/[0.05] last:border-0">
                <span className="text-sm text-slate-300">{item.name}</span>
                <span className="text-sm font-semibold">{item.total_qty} uds</span>
              </div>
            ))
          )}
        </GlassCard>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <button onClick={() => navigate('/gerente/menu')} className="btn-ghost justify-center flex-col gap-1 !py-4">
          <BookOpen size={20} className="text-accent" />
          <span className="text-xs">Menú</span>
        </button>
        <button onClick={() => navigate('/gerente/promociones')} className="btn-ghost justify-center flex-col gap-1 !py-4">
          <Tag size={20} className="text-orange-400" />
          <span className="text-xs">Promociones</span>
        </button>
        <button onClick={() => navigate('/gerente/mesas/asignar')} className="btn-ghost justify-center flex-col gap-1 !py-4">
          <Users size={20} className="text-blue-400" />
          <span className="text-xs">Asignar Mesas</span>
        </button>
        <button onClick={() => navigate('/gerente/caja')} className="btn-ghost justify-center flex-col gap-1 !py-4 relative">
          <Wallet size={20} className="text-emerald-400" />
          <span className="text-xs">Caja</span>
          <span className={`absolute top-2 right-2 w-2 h-2 rounded-full ${activeCajaSession ? 'bg-emerald-400 shadow-[0_0_6px_theme(colors.emerald.400)]' : 'bg-red-400'}`} />
        </button>
        <button onClick={() => navigate('/gerente/caja/historial')} className="btn-ghost justify-center flex-col gap-1 !py-4">
          <ClipboardList size={20} className="text-slate-400" />
          <span className="text-xs">Historial</span>
        </button>
        <button onClick={() => navigate('/mesas')} className="btn-ghost justify-center flex-col gap-1 !py-4">
          <span className="text-xl">🍽</span>
          <span className="text-xs">Ver Mesas</span>
        </button>
      </div>
    </div>
  );
}
