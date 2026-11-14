import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button, Stack, Box } from '@mui/material';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';

const ConfirmContext = createContext(null);

/**
 * Promise-based confirm/alert dialogs:
 *   const confirm = useConfirm();
 *   if (await confirm({ title, message, confirmText:'Delete', danger:true })) …
 *   await confirm({ title, message, alertOnly:true })
 */
export function ConfirmProvider({ children }) {
  const [opts, setOpts] = useState(null);
  const resolver = useRef();

  const confirm = useCallback(
    (o) =>
      new Promise((resolve) => {
        resolver.current = resolve;
        setOpts(o);
      }),
    [],
  );

  const close = (result) => {
    resolver.current?.(result);
    setOpts(null);
  };

  const danger = opts?.danger;
  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Dialog open={!!opts} onClose={() => close(false)} maxWidth="xs" fullWidth>
        <DialogTitle>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Box sx={{ display: 'flex', color: danger ? 'error.main' : 'warning.main' }}>
              {danger ? <ErrorOutlineRoundedIcon /> : <WarningAmberRoundedIcon />}
            </Box>
            <span>{opts?.title || 'Are you sure?'}</span>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <DialogContentText component="div" sx={{ whiteSpace: 'pre-line' }}>
            {opts?.message}
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          {!opts?.alertOnly && (
            <Button onClick={() => close(false)} color="inherit">
              {opts?.cancelText || 'Cancel'}
            </Button>
          )}
          <Button variant="contained" color={danger ? 'error' : 'primary'} onClick={() => close(true)} autoFocus>
            {opts?.confirmText || (opts?.alertOnly ? 'OK' : 'Confirm')}
          </Button>
        </DialogActions>
      </Dialog>
    </ConfirmContext.Provider>
  );
}

export const useConfirm = () => useContext(ConfirmContext);
