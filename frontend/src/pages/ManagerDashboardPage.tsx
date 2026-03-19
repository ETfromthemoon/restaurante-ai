import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import api from '../services/api';

interface DashboardData {
  sales_today:         number;
  orders_today:        number;
  tables_occupied:     number;
  top_items:           { name: string; total_qty: number }[];
  avg_service_minutes: number | null;
}

export default function ManagerDashboardPage() {
  const navigate = useNavigate();
  const { logout, user, activeCajaSession, fetchActiveCaja } = useAppStore();

  useEffect(() => { fetchActiveCaja(); }, []);
  const [data, setData]       = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard')
      .then(r => setData(r.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <p className="text-gray-400 animate-pulse">Cargando dashboard...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-red-500 text-white px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="font-bold text-lg">Dashboard</h1>
          <p className="text-red-200 text-xs">Hola, {user?.name.split(' ')[0]}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/mesas')}
            className="text-red-200 text-sm font-medium"
          >
            Mesas
          </button>
          <button onClick={logout} className="text-red-200 text-sm font-medium">
            Salir
          </button>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {/* Ventas del día */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-gray-400 text-xs uppercase font-bold tracking-wider">Ventas hoy</p>
          <p className="text-4xl font-bold text-red-500 mt-1">
            S/ {data?.sales_today.toFixed(2) ?? '0.00'}
          </p>
          <p className="text-gray-400 text-sm mt-1">
            {data?.orders_today ?? 0} pedido{data?.orders_today !== 1 ? 's' : ''} cerrado{data?.orders_today !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Métricas rápidas */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <p className="text-gray-400 text-xs uppercase font-bold tracking-wider">Mesas activas</p>
            <p className="text-3xl font-bold text-orange-500 mt-1">{data?.tables_occupied ?? 0}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <p className="text-gray-400 text-xs uppercase font-bold tracking-wider">Tiempo de atención prom. (cocina→entrega)</p>
            <p className="text-3xl font-bold text-blue-500 mt-1">
              {data?.avg_service_minutes != null ? `${data.avg_service_minutes}` : '—'}
              {data?.avg_service_minutes != null && (
                <span className="text-base font-normal text-gray-400 ml-1">min</span>
              )}
            </p>
          </div>
        </div>

        {/* Top platos */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-gray-400 text-xs uppercase font-bold tracking-wider mb-3">
            Platos más pedidos hoy
          </p>
          {!data?.top_items.length ? (
            <p className="text-gray-400 text-sm text-center py-4">Sin datos aún</p>
          ) : (
            data.top_items.map((item, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b last:border-0 border-gray-50">
                <div className="flex items-center gap-3">
                  <span className="w-5 h-5 rounded-full bg-red-100 text-red-500 text-xs font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                  <span className="text-sm text-gray-800">{item.name}</span>
                </div>
                <span className="font-bold text-red-500 text-sm">×{item.total_qty}</span>
              </div>
            ))
          )}
        </div>

        {/* Acciones */}
        <button
          onClick={() => navigate('/gerente/menu')}
          className="w-full bg-red-500 text-white rounded-xl py-3 font-bold"
        >
          Gestionar Menú
        </button>
        <button
          onClick={() => navigate('/gerente/promociones')}
          className="w-full bg-orange-500 text-white rounded-xl py-3 font-bold"
        >
          🏷️ Gestionar Promociones
        </button>
        <button
          onClick={() => navigate('/gerente/mesas/asignar')}
          className="w-full bg-blue-500 text-white rounded-xl py-3 font-bold"
        >
          Asignar Mesas 🗺️
        </button>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => navigate('/gerente/caja')}
            className="bg-green-600 text-white rounded-xl py-3 font-bold flex items-center justify-center gap-2"
          >
            <span>Caja 💰</span>
            <span className={`w-2.5 h-2.5 rounded-full ${activeCajaSession ? 'bg-green-300' : 'bg-red-300'}`}></span>
          </button>
          <button
            onClick={() => navigate('/gerente/caja/historial')}
            className="bg-gray-700 text-white rounded-xl py-3 font-bold"
          >
            Historial 🗂️
          </button>
        </div>
      </div>
    </div>
  );
}
