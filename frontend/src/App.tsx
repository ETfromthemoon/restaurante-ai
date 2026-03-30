import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import { useAppStore } from './store/useAppStore';
import { useWebmasterStore } from './store/useWebmasterStore';
import { socketService } from './services/socketService';
import { ToastProvider, useToast } from './hooks/useToast';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './components/DashboardLayout';
import WebmasterLayout from './components/WebmasterLayout';
import PWAInstallBanner from './components/ui/PWAInstallBanner';
import ToastContainer  from './components/ui/ToastContainer';
import WebmasterLoginPage from './pages/WebmasterLoginPage';
import TenantsListPage    from './pages/TenantsListPage';
import SignupPage         from './pages/SignupPage';
import LoginPage                from './pages/LoginPage';
import TableMapPage             from './pages/TableMapPage';
import OrderPage                from './pages/OrderPage';
import MenuSelectPage           from './pages/MenuSelectPage';
import KitchenQueuePage         from './pages/KitchenQueuePage';
import KitchenOrderDetailPage   from './pages/KitchenOrderDetailPage';
import ManagerDashboardPage     from './pages/ManagerDashboardPage';
import MenuManagePage           from './pages/MenuManagePage';
import PromotionsManagePage     from './pages/PromotionsManagePage';
import TableOrderHistoryPage    from './pages/TableOrderHistoryPage';
import CajaPage                 from './pages/CajaPage';
import CajaHistorialPage        from './pages/CajaHistorialPage';
import TableAssignmentPage      from './pages/TableAssignmentPage';
import UsersManagePage          from './pages/UsersManagePage';

// Componente interno que ya tiene acceso al ToastContext
function AppInner() {
  const { user, token, error, clearError, handleOrderUpdated, handleTableUpdated, handleOrderReady, handleItemStatus } = useAppStore();
  const toast = useToast();

  // Toast de bienvenida al iniciar sesión
  const prevUserId = useRef<string | null>(null);
  useEffect(() => {
    if (user && user.id !== prevUserId.current) {
      const roleLabel = user.role === 'cook' ? 'Cocinero' : user.role === 'manager' ? 'Gerente' : 'Mesero';
      toast.success(`Bienvenido, ${user.name} (${roleLabel}) 👋`);
    }
    prevUserId.current = user?.id ?? null;
  }, [user?.id]);

  // Reemplaza alert(error) — muestra toast rojo no bloqueante
  useEffect(() => {
    if (error) {
      toast.error(error);
      clearError();
    }
  }, [error]);

  // Socket.io — conectar al autenticarse
  useEffect(() => {
    if (!user || !token) return;
    socketService.connect(token);
    socketService.on('order:updated',     (d: any) => handleOrderUpdated(d.order));
    socketService.on('table:updated',     (d: any) => handleTableUpdated(d.table));
    socketService.on('order:ready',       (d: any) => handleOrderReady(d));
    socketService.on('order:item_status', (d: any) => handleItemStatus(d));
    return () => socketService.disconnect();
  }, [user?.id]);

  const home = !user ? '/login'
    : user.role === 'cook'    ? '/cocina'
    : user.role === 'manager' ? '/gerente'
    : '/mesas';

  const { token: wmToken } = useWebmasterStore();

  return (
    <BrowserRouter>
      <Routes>
        {/* ── Webmaster routes ─────────────────────────────────────────── */}
        <Route
          path="/webmaster/login"
          element={!wmToken ? <WebmasterLoginPage /> : <Navigate to="/webmaster/tenants" />}
        />
        <Route
          path="/webmaster/tenants"
          element={wmToken
            ? <WebmasterLayout><TenantsListPage /></WebmasterLayout>
            : <Navigate to="/webmaster/login" />
          }
        />
        <Route path="/webmaster" element={<Navigate to={wmToken ? '/webmaster/tenants' : '/webmaster/login'} />} />

        {/* ── Public routes (no auth) ──────────────────────────────────── */}
        <Route path="/signup" element={<SignupPage />} />

        {/* ── Tenant app routes ─────────────────────────────────────────── */}
        <Route path="/login" element={!user ? <LoginPage /> : <Navigate to={home} />} />

        <Route element={<ProtectedRoute roles={['waiter', 'manager']} />}>
          <Route path="/mesas"                        element={<DashboardLayout><TableMapPage /></DashboardLayout>} />
          <Route path="/mesas/:tableId/pedido"        element={<DashboardLayout><OrderPage /></DashboardLayout>} />
          <Route path="/mesas/:tableId/pedido/menu"   element={<DashboardLayout><MenuSelectPage /></DashboardLayout>} />
          <Route path="/mesas/:tableId/historial"     element={<DashboardLayout><TableOrderHistoryPage /></DashboardLayout>} />
        </Route>

        <Route element={<ProtectedRoute roles={['cook', 'manager']} />}>
          <Route path="/cocina"          element={<DashboardLayout><KitchenQueuePage /></DashboardLayout>} />
          <Route path="/cocina/:orderId" element={<DashboardLayout><KitchenOrderDetailPage /></DashboardLayout>} />
        </Route>

        <Route element={<ProtectedRoute roles={['manager']} />}>
          <Route path="/gerente"                    element={<DashboardLayout><ManagerDashboardPage /></DashboardLayout>} />
          <Route path="/gerente/menu"               element={<DashboardLayout><MenuManagePage /></DashboardLayout>} />
          <Route path="/gerente/promociones"        element={<DashboardLayout><PromotionsManagePage /></DashboardLayout>} />
          <Route path="/gerente/caja"               element={<DashboardLayout><CajaPage /></DashboardLayout>} />
          <Route path="/gerente/caja/historial"     element={<DashboardLayout><CajaHistorialPage /></DashboardLayout>} />
          <Route path="/gerente/mesas/asignar"      element={<DashboardLayout><TableAssignmentPage /></DashboardLayout>} />
          <Route path="/gerente/usuarios"           element={<DashboardLayout><UsersManagePage /></DashboardLayout>} />
        </Route>

        <Route path="*" element={<Navigate to={home} />} />
      </Routes>

      {/* Toasts — top-right, z-[100] */}
      <ToastContainer />

      {/* Banner de instalación PWA */}
      <PWAInstallBanner />
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppInner />
    </ToastProvider>
  );
}
