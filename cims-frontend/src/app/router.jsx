import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { Box, LinearProgress } from '@mui/material';
import AppLayout from '@/layouts/AppLayout';
import { ProtectedRoute, RoleGuard, PermissionGuard, GuestRoute } from '@/features/auth/guards';
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

/** List/view need "view"; /new needs "create"; /:id/edit needs "edit". */
const crud = (prefix, module, pages) => ({
  element: <PermissionGuard module={module} action="view" />,
  children: [
    { path: prefix, element: page(pages.list) },
    { path: `${prefix}/:id`, element: page(pages.view) },
    { element: <PermissionGuard module={module} action="create" />, children: [{ path: `${prefix}/new`, element: page(pages.form) }] },
    { element: <PermissionGuard module={module} action="edit" />, children: [{ path: `${prefix}/:id/edit`, element: page(pages.form) }] },
  ],
});

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

      crud('contracts', 'sales_contract', {
        list: () => import('@/features/contracts/ContractListPage'),
        view: () => import('@/features/contracts/ContractViewPage'),
        form: () => import('@/features/contracts/ContractFormPage'),
      }),
      crud('pi', 'pi', {
        list: () => import('@/features/pi/PIListPage'),
        view: () => import('@/features/pi/PIViewPage'),
        form: () => import('@/features/pi/PIFormPage'),
      }),
      crud('lc', 'lc', {
        list: () => import('@/features/lc/LCListPage'),
        view: () => import('@/features/lc/LCViewPage'),
        form: () => import('@/features/lc/LCFormPage'),
      }),
      crud('shipments', 'shipment', {
        list: () => import('@/features/shipments/ShipmentListPage'),
        view: () => import('@/features/shipments/ShipmentViewPage'),
        form: () => import('@/features/shipments/ShipmentFormPage'),
      }),

      { path: 'reports', element: <Navigate to="/reports/vessels" replace /> },
      {
        element: <PermissionGuard module="reports" action="view" />,
        children: [
          { path: 'reports/vessels', element: page(() => import('@/features/reports/VesselReportPage')) },
          { path: 'reports/vessels/:shipmentId', element: page(() => import('@/features/reports/VesselDetailPage')) },
        ],
      },

      {
        path: 'admin',
        children: [
          {
            element: <RoleGuard roles={[ROLES.SYSTEM_ADMIN]} />,
            children: [{ path: 'users', element: page(() => import('@/features/users/UserListPage')) }],
          },
          {
            element: <PermissionGuard module="settings" action="view" />,
            children: [{ path: 'settings', element: page(() => import('@/features/settings/SettingsPage')) }],
          },
        ],
      },
      { path: '*', element: page(() => import('@/features/misc/NotFoundPage')) },
    ],
  },
]);
