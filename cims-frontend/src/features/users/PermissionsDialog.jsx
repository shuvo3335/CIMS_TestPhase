import { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography } from '@mui/material';
import { userHooks } from '@/hooks/useApi';
import { useSubmit } from '@/hooks/useSubmit';
import PermissionGrid from './PermissionGrid';

/** Quick editor for one user's module permissions (opened from the Users list). */
export default function PermissionsDialog({ user, onClose }) {
  const [perms, setPerms] = useState(user.permissions ?? {});
  const update = userHooks.useUpdate();
  const submit = useSubmit();

  const save = () =>
    submit(
      () => update.mutateAsync({ id: user.id, data: { name: user.name, userId: user.userId, role: user.role, active: user.active, permissions: perms } }),
      { success: 'Permissions updated', onSuccess: onClose },
    );

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Permissions: {user.name}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Dashboard is always available. Create, Edit and Delete automatically include View. Changes apply the next time {user.name} loads the app.
        </Typography>
        <PermissionGrid value={perms} onChange={setPerms} />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button variant="contained" onClick={save}>
          Save Permissions
        </Button>
      </DialogActions>
    </Dialog>
  );
}
