import { useCan } from '@/store/authStore';

/** Renders children only if the signed-in user holds the permission: `<Can module="lc" action="edit">…</Can>` */
export default function Can({ module, action = 'view', children }) {
  const can = useCan();
  return can(module, action) ? children : null;
}
