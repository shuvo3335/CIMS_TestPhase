import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const prefersDark = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches;

export const useUiStore = create(
  persist(
    (set) => ({
      themeMode: prefersDark() ? 'dark' : 'light',
      drawerCollapsed: false,
      mobileDrawerOpen: false,
      toggleTheme: () => set((s) => ({ themeMode: s.themeMode === 'dark' ? 'light' : 'dark' })),
      toggleDrawer: () => set((s) => ({ drawerCollapsed: !s.drawerCollapsed })),
      setMobileDrawer: (open) => set({ mobileDrawerOpen: open }),
    }),
    {
      name: 'cims:ui',
      partialize: (s) => ({ themeMode: s.themeMode, drawerCollapsed: s.drawerCollapsed }),
    },
  ),
);
