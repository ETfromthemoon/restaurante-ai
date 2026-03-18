import { Navigate, Outlet } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { UserRole } from '../types';

export default function ProtectedRoute({ roles }: { roles: UserRole[] }) {
  const user = useAppStore(s => s.user);
  if (!user) return <Navigate to="/login" />;
  if (!roles.includes(user.role)) return <Navigate to="/login" />;
  return <Outlet />;
}
