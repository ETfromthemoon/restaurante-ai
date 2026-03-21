import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAppStore } from './store/useAppStore';
import { socketService } from './services/socketService';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './components/DashboardLayout';
import PWAInstallBanner from './components/ui/PWAInstallBanner';
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

export default function App() {
  const { user, token, error, clearError, handleOrderUpdated, handleTableUpdated, handleOrderReady, handleItemStatus } = useAppStore();

  useEffect(() => {
    if (error) {
      alert(error);
      clearError();
    }
  }, [error]);

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

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={!user ? <LoginPage /> : <Navigate to={home} />} />

        <Route element={<ProtectedRoute roles={['waiter', 'manager']} />}>
          <Route path="/mesas"                        element={<DashboardLayout><TableMapPage /></DashboardLayout>} />
          <Route path="/mesas/:tableId/pedido"        element={<DashboardLayout><OrderPage /></DashboardLayout>} />
          <Route path="/mesas/:tableId/pedido/menu"   element={<DashboardLayout><MenuSelectPage /></DashboardLayout>} />
          <Route path="/mesas/:tableId/historial"     element={<DashboardLayout><TableOrderHistoryPage /></DashboardLayout>} />
        </Route>

        <Route element={<ProtectedRoute roles={['cook']} />}>
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
        </Route>

        <Route path="*" element={<Navigate to={home} />} />
      </Routes>

      {/* Banner de instalación PWA — se muestra automáticamente */}
      <PWAInstallBanner />
    </BrowserRouter>
  );
}
