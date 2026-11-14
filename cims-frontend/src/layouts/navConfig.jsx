import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import AccountBalanceOutlinedIcon from '@mui/icons-material/AccountBalanceOutlined';
import DirectionsBoatOutlinedIcon from '@mui/icons-material/DirectionsBoatOutlined';
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined';
import AdminPanelSettingsOutlinedIcon from '@mui/icons-material/AdminPanelSettingsOutlined';
import { ROLES } from '@/utils/constants';

/** Left navigation. `match` = path prefix that keeps the group highlighted. */
export const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: <DashboardOutlinedIcon />, to: '/' },
  {
    id: 'contracts',
    label: 'Sales Contract',
    icon: <DescriptionOutlinedIcon />,
    match: '/contracts',
    children: [
      { label: 'New Contract', to: '/contracts/new' },
      { label: 'Contract List', to: '/contracts' },
    ],
  },
  {
    id: 'pi',
    label: 'Proforma Invoice',
    icon: <ReceiptLongOutlinedIcon />,
    match: '/pi',
    children: [
      { label: 'New PI / SPI', to: '/pi/new' },
      { label: 'PI List', to: '/pi' },
    ],
  },
  {
    id: 'lc',
    label: 'Letter of Credit',
    icon: <AccountBalanceOutlinedIcon />,
    match: '/lc',
    children: [
      { label: 'Open LC', to: '/lc/new' },
      { label: 'LC List', to: '/lc' },
    ],
  },
  {
    id: 'shipments',
    label: 'Shipment',
    icon: <DirectionsBoatOutlinedIcon />,
    match: '/shipments',
    children: [
      { label: 'New Shipment', to: '/shipments/new' },
      { label: 'Shipment List', to: '/shipments' },
    ],
  },
  {
    id: 'reports',
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
    role: ROLES.ADMIN,
    children: [
      { label: 'Users', to: '/admin/users' },
      { label: 'Settings & Lookups', to: '/admin/settings' },
    ],
  },
];
