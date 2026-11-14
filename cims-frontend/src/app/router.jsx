import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { Box, LinearProgress } from '@mui/material';
import AppLayout from '@/layouts/AppLayout';
import { ProtectedRoute, RoleGuard, GuestRoute } from '@/features/auth/guards';
import RouteError from '@/features/misc/RouteError';
import { ROLES } from '@/utils/constants';

const page = (loader) => {
  const C = lazy(loader);
  return (
    <Suspense
      fallback={
        <Box sx={{ p: 2 }}>
          <LinearProgress color="secondary" />
        </Box>
      }
    >
      <C />
    </Suspense>
  );
};

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <GuestRoute>{page(() => import('@/features/auth/LoginPage'))}</GuestRoute>,
    errorElement: <RouteError />,
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    errorElement: <RouteError />,
    children: [
      { index: true, element: page(() => import('@/features/dashboard/DashboardPage')) },

      { path: 'contracts', element: page(() => import('@/features/contracts/ContractListPage')) },
      { path: 'contracts/new', element: page(() => import('@/features/contracts/ContractFormPage')) },
      { path: 'contracts/:id', element: page(() => import('@/features/contracts/ContractViewPage')) },
      { path: 'contracts/:id/edit', element: page(() => import('@/features/contracts/ContractFormPage')) },

      { path: 'pi', element: page(() => import('@/features/pi/PIListPage')) },
      { path: 'pi/new', element: page(() => import('@/features/pi/PIFormPage')) },
      { path: 'pi/:id', element: page(() => import('@/features/pi/PIViewPage')) },
      { path: 'pi/:id/edit', element: page(() => import('@/features/pi/PIFormPage')) },

      { path: 'lc', element: page(() => import('@/features/lc/LCListPage')) },
      { path: 'lc/new', element: page(() => import('@/features/lc/LCFormPage')) },
      { path: 'lc/:id', element: page(() => import('@/features/lc/LCViewPage')) },
      { path: 'lc/:id/edit', element: page(() => import('@/features/lc/LCFormPage')) },

      { path: 'shipments', element: page(() => import('@/features/shipments/ShipmentListPage')) },
      { path: 'shipments/new', element: page(() => import('@/features/shipments/ShipmentFormPage')) },
      { path: 'shipments/:id', element: page(() => import('@/features/shipments/ShipmentViewPage')) },
      { path: 'shipments/:id/edit', element: page(() => import('@/features/shipments/ShipmentFormPage')) },

      { path: 'reports', element: <Navigate to="/reports/vessels" replace /> },
      { path: 'reports/vessels', element: page(() => import('@/features/reports/VesselReportPage')) },
      { path: 'reports/vessels/:shipmentId', element: page(() => import('@/features/reports/VesselDetailPage')) },

      {
        path: 'admin',
        element: <RoleGuard role={ROLES.ADMIN} />,
        children: [
          { path: 'users', element: page(() => import('@/features/users/UserListPage')) },
          { path: 'settings', element: page(() => import('@/features/settings/SettingsPage')) },
        ],
      },
      { path: '*', element: page(() => import('@/features/misc/NotFoundPage')) },
    ],
  },
]);
