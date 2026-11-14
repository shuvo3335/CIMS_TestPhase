import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { EmptyState } from '@/components/States';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';

export function ProtectedRoute({ children }) {
  const token = useAuthStore((s) => s.token);
  const location = useLocation();
  if (!token) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return children;
}

export function GuestRoute({ children }) {
  const token = useAuthStore((s) => s.token);
  if (token) return <Navigate to="/" replace />;
  return children;
}

export function RoleGuard({ role }) {
  const user = useAuthStore((s) => s.user);
  if (user?.role !== role) {
    return (
      <EmptyState
        icon={<LockOutlinedIcon />}
        title="Access denied"
        message="You don't have permission to view this page. Contact your administrator if you need access."
      />
    );
  }
  return <Outlet />;
}
