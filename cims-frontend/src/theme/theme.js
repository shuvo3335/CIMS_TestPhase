import { createTheme, alpha } from '@mui/material/styles';

export const BRAND = {
  navy: '#0B2545',
  navyLight: '#1B3A66',
  teal: '#13A89E',
  tealDark: '#0E8178',
};

export function buildTheme(mode = 'light') {
  const dark = mode === 'dark';
  const theme = createTheme({
    palette: {
      mode,
      primary: dark
        ? { main: '#5B8DEF', light: '#86AAF3', dark: '#3D6CCB', contrastText: '#fff' }
        : { main: BRAND.navy, light: BRAND.navyLight, dark: '#06172C', contrastText: '#fff' },
      secondary: { main: BRAND.teal, dark: BRAND.tealDark, contrastText: '#fff' },
      success: { main: '#1E9E5A' },
      warning: { main: '#E69A1A' },
      error: { main: '#D64545' },
      info: { main: '#2F80ED' },
      background: dark ? { default: '#0D1421', paper: '#141D2E' } : { default: '#F3F6FA', paper: '#FFFFFF' },
      text: dark ? { primary: '#E6EBF2', secondary: '#9AA7BA' } : { primary: '#16233A', secondary: '#5B6B82' },
      divider: dark ? 'rgba(255,255,255,0.08)' : 'rgba(11,37,69,0.10)',
    },
    shape: { borderRadius: 10 },
    typography: {
      fontFamily: '"Inter", "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      h4: { fontWeight: 700, letterSpacing: '-0.02em' },
      h5: { fontWeight: 700, letterSpacing: '-0.01em' },
      h6: { fontWeight: 650 },
      subtitle1: { fontWeight: 600 },
      subtitle2: { fontWeight: 600 },
      button: { textTransform: 'none', fontWeight: 600 },
      overline: { fontWeight: 700, letterSpacing: '0.08em' },
    },
  });

  const cardShadow = dark ? '0 1px 2px rgba(0,0,0,0.4)' : '0 1px 2px rgba(16,35,64,0.06), 0 4px 16px rgba(16,35,64,0.05)';

  return createTheme(theme, {
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: { backgroundColor: theme.palette.background.default },
          '*::-webkit-scrollbar': { width: 8, height: 8 },
          '*::-webkit-scrollbar-thumb': { backgroundColor: alpha(theme.palette.text.secondary, 0.3), borderRadius: 8 },
        },
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: { root: { borderRadius: 8, paddingInline: 16 } },
      },
      MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
      MuiCard: {
        defaultProps: { elevation: 0 },
        styleOverrides: { root: { border: `1px solid ${theme.palette.divider}`, boxShadow: cardShadow } },
      },
      MuiCardHeader: {
        styleOverrides: {
          root: { padding: '16px 20px', borderBottom: `1px solid ${theme.palette.divider}` },
          title: { fontSize: '1rem', fontWeight: 650 },
          subheader: { fontSize: '0.8rem' },
        },
      },
      MuiCardContent: { styleOverrides: { root: { padding: 20, '&:last-child': { paddingBottom: 20 } } } },
      MuiTextField: { defaultProps: { size: 'small', fullWidth: true } },
      MuiFormControl: { defaultProps: { size: 'small' } },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            backgroundColor: dark ? alpha('#fff', 0.02) : '#fff',
            '&.Mui-disabled': { backgroundColor: dark ? alpha('#fff', 0.04) : '#F5F7FA' },
          },
        },
      },
      MuiInputLabel: { styleOverrides: { asterisk: { color: theme.palette.error.main } } },
      MuiFormLabel: { styleOverrides: { asterisk: { color: theme.palette.error.main } } },
      MuiChip: { styleOverrides: { root: { fontWeight: 600 } } },
      MuiTooltip: { defaultProps: { arrow: true } },
      MuiDialog: { styleOverrides: { paper: { borderRadius: 14 } } },
      MuiTableCell: {
        styleOverrides: {
          head: { fontWeight: 650, backgroundColor: dark ? alpha('#fff', 0.03) : '#F5F7FB' },
        },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            margin: '2px 8px',
            '&.Mui-selected': {
              backgroundColor: alpha(BRAND.teal, 0.16),
              color: dark ? '#7FE0D6' : '#fff',
              '& .MuiListItemIcon-root': { color: 'inherit' },
              '&:hover': { backgroundColor: alpha(BRAND.teal, 0.24) },
            },
          },
        },
      },
    },
  });
}
