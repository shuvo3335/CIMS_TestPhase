import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { ROLES } from '@/utils/constants';

export const useAuthStore = create(
  persist(
    (set) => ({
      token: null,
      user: null,
      login: ({ token, user }) => set({ token, user }),
      logout: () => set({ token: null, user: null }),
    }),
    { name: 'cims:auth', storage: createJSONStorage(() => sessionStorage) },
  ),
);

export const useIsAdmin = () => useAuthStore((s) => s.user?.role === ROLES.ADMIN);
