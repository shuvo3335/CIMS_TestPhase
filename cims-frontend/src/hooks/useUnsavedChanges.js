import { useCallback, useEffect, useRef } from 'react';
import { useBlocker } from 'react-router-dom';
import { useConfirm } from '@/components/ConfirmProvider';

/**
 * Warns before leaving a form with unsaved changes (in-app navigation and tab close).
 * Returns `release()` — call it after a successful save so the redirect isn't blocked.
 */
export function useUnsavedChanges(when) {
  const confirm = useConfirm();
  const released = useRef(false);
  const whenRef = useRef(when);
  whenRef.current = when;

  const blocker = useBlocker(
    useCallback(
      ({ currentLocation, nextLocation }) =>
        whenRef.current && !released.current && currentLocation.pathname !== nextLocation.pathname,
      [],
    ),
  );

  useEffect(() => {
    if (blocker.state !== 'blocked') return;
    confirm({
      title: 'Discard unsaved changes?',
      message: 'You have unsaved changes on this form. Leaving now will discard them.',
      confirmText: 'Discard',
      danger: true,
    }).then((ok) => (ok ? blocker.proceed() : blocker.reset()));
  }, [blocker, confirm]);

  useEffect(() => {
    if (!when) return undefined;
    const handler = (e) => {
      if (released.current) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [when]);

  return useCallback(() => {
    released.current = true;
  }, []);
}
