import { useState, useEffect } from 'react';
import { Outlet, NavLink, useLocation, useNavigate, matchPath } from 'react-router-dom';
import {
  AppBar, Toolbar, Box, Drawer, IconButton, List, ListItemButton, ListItemIcon, ListItemText, Collapse,
  Tooltip, Typography, Avatar, Menu, MenuItem, Divider, useMediaQuery, Stack, Chip, alpha,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import MenuIcon from '@mui/icons-material/Menu';
import MenuOpenIcon from '@mui/icons-material/MenuOpen';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import LogoutIcon from '@mui/icons-material/Logout';
import { useUiStore } from '@/store/uiStore';
import { useAuthStore } from '@/store/authStore';
import { ROLE_LABELS } from '@/utils/constants';
import { can } from '@/utils/permissions';
import { useQueryClient } from '@tanstack/react-query';
import { NAV } from './navConfig';
import { api } from '@/services/api';
import { BRAND } from '@/theme/theme';

const FULL = 264;
const MINI = 76;

function Logo({ collapsed }) {
  return (
    <Stack direction="row" spacing={1.25} alignItems="center" sx={{ px: collapsed ? 0 : 2.5, justifyContent: collapsed ? 'center' : 'flex-start', height: 64 }}>
      <Box component="img" src="/favicon.svg" alt="" sx={{ width: 34, height: 34 }} />
      {!collapsed && (
        <Box>
          <Typography fontWeight={800} color="#fff" lineHeight={1.1} letterSpacing="0.02em">
            CIMS
          </Typography>
          <Typography fontSize={11} sx={{ color: alpha('#fff', 0.6) }} lineHeight={1.2}>
            Contract & Import Management
          </Typography>
        </Box>
      )}
    </Stack>
  );
}

function NavContent({ collapsed, onNavigate, onExpand }) {
  const { pathname } = useLocation();
  const role = useAuthStore((s) => s.user?.role);
  const user = useAuthStore((s) => s.user);
  const allowed = (n) => (!n.roles || n.roles.includes(role)) && (!n.module || can(user, n.module, n.action || 'view'));
  const items = NAV.map((n) => (n.children ? { ...n, children: n.children.filter((c) => allowed({ module: n.module, ...c })) } : n)).filter((n) => allowed(n) && (!n.children || n.children.length > 0));
  const activeGroup = items.find((n) => n.match && pathname.startsWith(n.match))?.id;
  const [open, setOpen] = useState(() => ({ [activeGroup]: true }));

  useEffect(() => {
    if (activeGroup) setOpen((o) => ({ ...o, [activeGroup]: true }));
  }, [activeGroup]);

  const isExact = (to) => !!matchPath({ path: to, end: true }, pathname);

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: BRAND.navy, color: alpha('#fff', 0.82) }}>
      <Logo collapsed={collapsed} />
      <Divider sx={{ borderColor: alpha('#fff', 0.08) }} />
      <List sx={{ flex: 1, overflowY: 'auto', py: 1.5 }}>
        {items.map((item) => {
          const groupActive = item.id === activeGroup || (item.to && isExact(item.to));
          const button = (
            <ListItemButton
              key={item.id}
              selected={!item.children && groupActive}
              component={item.to ? NavLink : 'div'}
              to={item.to}
              onClick={() => {
                if (item.children) {
                  if (collapsed) onExpand?.();
                  setOpen((o) => ({ ...o, [item.id]: collapsed ? true : !o[item.id] }));
                } else onNavigate?.();
              }}
              sx={{
                minHeight: 44,
                justifyContent: collapsed ? 'center' : 'flex-start',
                px: collapsed ? 0 : 1.5,
                color: groupActive ? '#fff' : 'inherit',
                '&:hover': { bgcolor: alpha('#fff', 0.06) },
              }}
            >
              <ListItemIcon sx={{ minWidth: collapsed ? 0 : 38, color: groupActive ? BRAND.teal : alpha('#fff', 0.65) }}>{item.icon}</ListItemIcon>
              {!collapsed && <ListItemText primary={item.label} slotProps={{ primary: { fontSize: 14, fontWeight: groupActive ? 650 : 500 } }} />}
              {!collapsed && item.children && (open[item.id] ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />)}
            </ListItemButton>
          );
          return (
            <Box key={item.id}>
              {collapsed ? (
                <Tooltip title={item.label} placement="right">
                  {button}
                </Tooltip>
              ) : (
                button
              )}
              {item.children && !collapsed && (
                <Collapse in={!!open[item.id]} timeout="auto" unmountOnExit>
                  <List disablePadding>
                    {item.children.map((c) => (
                      <ListItemButton
                        key={c.to}
                        component={NavLink}
                        to={c.to}
                        end
                        selected={isExact(c.to)}
                        onClick={onNavigate}
                        sx={{ pl: 6.25, minHeight: 38, '&:hover': { bgcolor: alpha('#fff', 0.06) } }}
                      >
                        <ListItemText primary={c.label} slotProps={{ primary: { fontSize: 13.5 } }} />
                      </ListItemButton>
                    ))}
                  </List>
                </Collapse>
              )}
            </Box>
          );
        })}
      </List>
      {!collapsed && (
        <Typography variant="caption" sx={{ px: 2.5, py: 2, color: alpha('#fff', 0.4) }}>
          v0.1 · Frontend preview (mock data)
        </Typography>
      )}
    </Box>
  );
}

export default function AppLayout() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { themeMode, toggleTheme, drawerCollapsed, toggleDrawer, mobileDrawerOpen, setMobileDrawer } = useUiStore();
  const { user, logout } = useAuthStore();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const setUser = useAuthStore((s) => s.setUser);
  const [anchor, setAnchor] = useState(null);

  // Pick up permission changes made by the System Administrator since this session started.
  const userId = user?.id;
  useEffect(() => {
    if (!userId) return;
    api.auth
      .me(userId)
      .then(setUser)
      .catch(() => {
        logout();
        navigate('/login', { replace: true });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const collapsed = !isMobile && drawerCollapsed;
  const width = isMobile ? 0 : collapsed ? MINI : FULL;

  const handleLogout = () => {
    setAnchor(null);
    logout();
    qc.clear();
    navigate('/login', { replace: true });
  };

  const initials = (user?.name || user?.userId || '?').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar
        position="fixed"
        elevation={0}
        color="inherit"
        sx={{
          width: { md: `calc(100% - ${width}px)` },
          ml: { md: `${width}px` },
          bgcolor: alpha(theme.palette.background.paper, 0.85),
          backdropFilter: 'blur(8px)',
          borderBottom: `1px solid ${theme.palette.divider}`,
          transition: theme.transitions.create(['width', 'margin']),
        }}
      >
        <Toolbar sx={{ gap: 1 }}>
          <IconButton edge="start" onClick={() => (isMobile ? setMobileDrawer(true) : toggleDrawer())} aria-label="Toggle navigation">
            {collapsed || isMobile ? <MenuIcon /> : <MenuOpenIcon />}
          </IconButton>
          <Typography variant="subtitle1" sx={{ flex: 1, display: { xs: 'none', sm: 'block' } }} noWrap>
            {import.meta.env.VITE_COMPANY_NAME || 'CIMS'}
          </Typography>
          <Box sx={{ flex: 1, display: { xs: 'block', sm: 'none' } }} />
          <Tooltip title={themeMode === 'dark' ? 'Light mode' : 'Dark mode'}>
            <IconButton onClick={toggleTheme}>{themeMode === 'dark' ? <LightModeOutlinedIcon /> : <DarkModeOutlinedIcon />}</IconButton>
          </Tooltip>
          <Box
            onClick={(e) => setAnchor(e.currentTarget)}
            sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer', pl: 1, py: 0.5, pr: 0.5, borderRadius: 6, '&:hover': { bgcolor: 'action.hover' } }}
          >
            <Box sx={{ textAlign: 'right', display: { xs: 'none', sm: 'block' } }}>
              <Typography variant="body2" fontWeight={650} lineHeight={1.2}>
                {user?.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {ROLE_LABELS[user?.role] ?? 'User'}
              </Typography>
            </Box>
            <Avatar sx={{ width: 36, height: 36, bgcolor: 'secondary.main', fontSize: 14, fontWeight: 700 }}>{initials}</Avatar>
          </Box>
          <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)} anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }} transformOrigin={{ horizontal: 'right', vertical: 'top' }}>
            <Box sx={{ px: 2, py: 1 }}>
              <Typography fontWeight={650}>{user?.name}</Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="caption" color="text.secondary">
                  @{user?.userId}
                </Typography>
                <Chip size="small" label={user?.role?.replace('_', ' ')} color={user?.role === 'SYSTEM_ADMIN' ? 'error' : user?.role === 'ADMIN' ? 'secondary' : 'default'} sx={{ height: 18, fontSize: 10 }} />
              </Stack>
            </Box>
            <Divider />
            <MenuItem onClick={handleLogout}>
              <ListItemIcon>
                <LogoutIcon fontSize="small" />
              </ListItemIcon>
              Sign out
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Box component="nav" className="cims-nav" sx={{ width: { md: width }, flexShrink: 0, transition: theme.transitions.create('width') }}>
        {isMobile ? (
          <Drawer variant="temporary" open={mobileDrawerOpen} onClose={() => setMobileDrawer(false)} ModalProps={{ keepMounted: true }} slotProps={{ paper: { sx: { width: FULL, border: 0 } } }}>
            <NavContent onNavigate={() => setMobileDrawer(false)} />
          </Drawer>
        ) : (
          <Drawer
            variant="permanent"
            open
            slotProps={{
              paper: { sx: { width, border: 0, overflowX: 'hidden', transition: theme.transitions.create('width') } },
            }}
          >
            <NavContent collapsed={collapsed} onExpand={toggleDrawer} />
          </Drawer>
        )}
      </Box>

      <Box component="main" sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <Toolbar />
        <Box sx={{ flex: 1, p: { xs: 2, md: 3 }, maxWidth: 1600, width: '100%', mx: 'auto' }}>
          <Outlet />
        </Box>
        <Box component="footer" className="cims-footer" sx={{ px: 3, py: 2, borderTop: `1px solid ${theme.palette.divider}`, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
          <Typography variant="caption" color="text.secondary">
            © {new Date().getFullYear()} {import.meta.env.VITE_COMPANY_NAME || 'CIMS'} · Contract & Import Management System
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Data is stored locally in this browser (preview mode)
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
