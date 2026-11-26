import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import AccountBalanceOutlinedIcon from '@mui/icons-material/AccountBalanceOutlined';
import DirectionsBoatOutlinedIcon from '@mui/icons-material/DirectionsBoatOutlined';
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined';
import AdminPanelSettingsOutlinedIcon from '@mui/icons-material/AdminPanelSettingsOutlined';
import { ROLES } from '@/utils/constants';

/**
 * Left navigation. `module` (+ optional `action`, default view) ties an item to the permission
 * registry; `roles` restricts to specific roles. Items the user can't access are hidden.
 * `match` = path prefix that keeps the group highlighted.
 */
export const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: <DashboardOutlinedIcon />, to: '/' },
  {
    id: 'contracts',
    module: 'sales_contract',
    label: 'Sales Contract',
    icon: <DescriptionOutlinedIcon />,
    match: '/contracts',
    children: [
      { label: 'New Contract', to: '/contracts/new', action: 'create' },
      { label: 'Contract List', to: '/contracts' },
    ],
  },
  {
    id: 'pi',
    module: 'pi',
    label: 'Proforma Invoice',
    icon: <ReceiptLongOutlinedIcon />,
    match: '/pi',
    children: [
      { label: 'New PI / SPI', to: '/pi/new', action: 'create' },
      { label: 'PI List', to: '/pi' },
    ],
  },
  {
    id: 'lc',
    module: 'lc',
    label: 'Letter of Credit',
    icon: <AccountBalanceOutlinedIcon />,
    match: '/lc',
    children: [
      { label: 'Open LC', to: '/lc/new', action: 'create' },
      { label: 'LC List', to: '/lc' },
    ],
  },
  {
    id: 'shipments',
    module: 'shipment',
    label: 'Shipment',
    icon: <DirectionsBoatOutlinedIcon />,
    match: '/shipments',
    children: [
      { label: 'New Shipment', to: '/shipments/new', action: 'create' },
      { label: 'Shipment List', to: '/shipments' },
    ],
  },
  {
    id: 'reports',
    module: 'reports',
    label: 'Reports',
    icon: <AssessmentOutlinedIcon />,
    match: '/reports',
    children: [{ label: 'Vessel Report', to: '/reports/vessels' }],
  },
  {
    id: 'admin',
    label: 'Administration',
    icon: <AdminPanelSettingsOutlinedIcon />,
    match: '/admin',
    children: [
      { label: 'Users', to: '/admin/users', roles: [ROLES.SYSTEM_ADMIN] },
      { label: 'Settings & Lookups', to: '/admin/settings', module: 'settings' },
    ],
  },
];
