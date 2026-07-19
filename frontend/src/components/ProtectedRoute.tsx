import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  // If a customer session is active, redirect to home — no admin access
  if (localStorage.getItem('loomcraftrugs_customer_token')) {
    return <Navigate to="/" replace />;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  const adminRoles = ['admin', 'owner', 'staff', 'manager'];
  if (!adminRoles.includes(user.role)) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
