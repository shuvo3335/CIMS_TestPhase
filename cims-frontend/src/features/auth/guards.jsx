import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { can } from '@/utils/permissions';
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

export function RoleGuard({ roles }) {
  const user = useAuthStore((s) => s.user);
  if (!roles.includes(user?.role)) {
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

/** Route guard driven by the permission registry: `<PermissionGuard module="lc" action="create" />` */
export function PermissionGuard({ module, action = 'view' }) {
  const user = useAuthStore((s) => s.user);
  if (!can(user, module, action)) {
    return (
      <EmptyState
        icon={<LockOutlinedIcon />}
        title="Access denied"
        message="You don't have permission to view this page. Contact your System Administrator if you need access."
      />
    );
  }
  return <Outlet />;
}
