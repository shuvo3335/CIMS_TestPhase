import { useMemo } from 'react';
import { RouterProvider } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SnackbarProvider } from 'notistack';
import { buildTheme } from '@/theme/theme';
import { useUiStore } from '@/store/uiStore';
import { ConfirmProvider } from '@/components/ConfirmProvider';
import { router } from './router';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { refetchOnWindowFocus: false, retry: (count, err) => err?.status !== 404 && count < 1, staleTime: 15_000 },
  },
});

export default function App() {
  const mode = useUiStore((s) => s.themeMode);
  const theme = useMemo(() => buildTheme(mode), [mode]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <QueryClientProvider client={queryClient}>
        <SnackbarProvider maxSnack={3} autoHideDuration={3500} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
          <ConfirmProvider>
            <RouterProvider router={router} />
          </ConfirmProvider>
        </SnackbarProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
