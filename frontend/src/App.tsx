import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAppStore } from './store/useAppStore';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage              from './pages/LoginPage';
import TableMapPage           from './pages/TableMapPage';
import OrderPage              from './pages/OrderPage';
import MenuSelectPage         from './pages/MenuSelectPage';
import KitchenQueuePage       from './pages/KitchenQueuePage';
import KitchenOrderDetailPage from './pages/KitchenOrderDetailPage';
import ManagerDashboardPage   from './pages/ManagerDashboardPage';
import MenuManagePage         from './pages/MenuManagePage';

export default function App() {
  const { user, error, clearError } = useAppStore();

  useEffect(() => {
    if (error) {
      alert(error);
      clearError();
    }
  }, [error]);

  const home = !user ? '/login'
    : user.role === 'cook'    ? '/cocina'
    : user.role === 'manager' ? '/gerente'
    : '/mesas';

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={!user ? <LoginPage /> : <Navigate to={home} />} />

        <Route element={<ProtectedRoute roles={['waiter', 'manager']} />}>
          <Route path="/mesas"                      element={<TableMapPage />} />
          <Route path="/mesas/:tableId/pedido"      element={<OrderPage />} />
          <Route path="/mesas/:tableId/pedido/menu" element={<MenuSelectPage />} />
        </Route>

        <Route element={<ProtectedRoute roles={['cook']} />}>
          <Route path="/cocina"          element={<KitchenQueuePage />} />
          <Route path="/cocina/:orderId" element={<KitchenOrderDetailPage />} />
        </Route>

        <Route element={<ProtectedRoute roles={['manager']} />}>
          <Route path="/gerente"      element={<ManagerDashboardPage />} />
          <Route path="/gerente/menu" element={<MenuManagePage />} />
        </Route>

        <Route path="*" element={<Navigate to={home} />} />
      </Routes>
    </BrowserRouter>
  );
}
