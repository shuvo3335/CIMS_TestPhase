import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { ROLES } from '@/utils/constants';
import { can } from '@/utils/permissions';

export const useAuthStore = create(
  persist(
    (set) => ({
      token: null,
      user: null,
      login: ({ token, user }) => set({ token, user }),
      setUser: (user) => set({ user }),
      logout: () => set({ token: null, user: null }),
    }),
    { name: 'cims:auth', storage: createJSONStorage(() => sessionStorage) },
  ),
);

export const useIsSystemAdmin = () => useAuthStore((s) => s.user?.role === ROLES.SYSTEM_ADMIN);

/** `const can = useCan(); can('sales_contract', 'edit')` */
export function useCan() {
  const user = useAuthStore((s) => s.user);
  return (moduleKey, action = 'view') => can(user, moduleKey, action);
}
