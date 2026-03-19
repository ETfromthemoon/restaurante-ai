import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAppStore } from './store/useAppStore';
import { socketService } from './services/socketService';
import ProtectedRoute from './components/ProtectedRoute';
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
          <Route path="/mesas"                        element={<TableMapPage />} />
          <Route path="/mesas/:tableId/pedido"        element={<OrderPage />} />
          <Route path="/mesas/:tableId/pedido/menu"   element={<MenuSelectPage />} />
          <Route path="/mesas/:tableId/historial"     element={<TableOrderHistoryPage />} />
        </Route>

        <Route element={<ProtectedRoute roles={['cook']} />}>
          <Route path="/cocina"          element={<KitchenQueuePage />} />
          <Route path="/cocina/:orderId" element={<KitchenOrderDetailPage />} />
        </Route>

        <Route element={<ProtectedRoute roles={['manager']} />}>
          <Route path="/gerente"                    element={<ManagerDashboardPage />} />
          <Route path="/gerente/menu"               element={<MenuManagePage />} />
          <Route path="/gerente/promociones"        element={<PromotionsManagePage />} />
          <Route path="/gerente/caja"               element={<CajaPage />} />
          <Route path="/gerente/caja/historial"     element={<CajaHistorialPage />} />
          <Route path="/gerente/mesas/asignar"      element={<TableAssignmentPage />} />
        </Route>

        <Route path="*" element={<Navigate to={home} />} />
      </Routes>
    </BrowserRouter>
  );
}
