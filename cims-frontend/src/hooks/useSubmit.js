import { useSnackbar } from 'notistack';
import { useConfirm } from '@/components/ConfirmProvider';

/**
 * Wraps a save action: success snackbar, and API errors mapped back onto
 * the form field when the service names one (else shown as an alert).
 */
export function useSubmit(setError) {
  const { enqueueSnackbar } = useSnackbar();
  const confirm = useConfirm();

  return async (action, { success = 'Saved successfully', onSuccess } = {}) => {
    try {
      const result = await action();
      enqueueSnackbar(success, { variant: 'success' });
      onSuccess?.(result);
      return result;
    } catch (e) {
      if (e.field && setError) {
        setError(e.field, { type: 'server', message: e.message });
        enqueueSnackbar(e.message, { variant: 'error' });
      } else {
        await confirm({ title: 'Could not save', message: e.message, alertOnly: true, danger: true });
      }
      return undefined;
    }
  };
}
