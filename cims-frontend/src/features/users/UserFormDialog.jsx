import { useForm, FormProvider, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Stack, FormControlLabel, Switch } from '@mui/material';
import { RHFText } from '@/components/form/RHFFields';
import { userHooks } from '@/hooks/useApi';
import { useSubmit } from '@/hooks/useSubmit';
import { ROLES } from '@/utils/constants';
import { Typography } from '@mui/material';
import PermissionGrid from './PermissionGrid';

const makeSchema = (isEdit) =>
  z.object({
    name: z.string().trim().min(2, 'Name is required'),
    userId: z
      .string()
      .trim()
      .min(3, 'At least 3 characters')
      .regex(/^[a-zA-Z0-9._-]+$/, 'Letters, numbers, dot, dash or underscore only'),
    password: isEdit
      ? z.string().refine((v) => !v || v.length >= 6, 'At least 6 characters')
      : z.string().min(6, 'At least 6 characters'),
    role: z.enum([ROLES.SYSTEM_ADMIN, ROLES.ADMIN, ROLES.USER]),
    active: z.boolean(),
    permissions: z.any(),
  });

export default function UserFormDialog({ user, onClose }) {
  const isEdit = !!user;
  const methods = useForm({
    resolver: zodResolver(makeSchema(isEdit)),
    defaultValues: { name: user?.name ?? '', userId: user?.userId ?? '', password: '', role: user?.role ?? ROLES.USER, active: user?.active ?? true, permissions: user?.permissions ?? {} },
  });
  const create = userHooks.useCreate();
  const update = userHooks.useUpdate();
  const submit = useSubmit(methods.setError);

  const onSubmit = methods.handleSubmit((values) =>
    submit(() => (isEdit ? update.mutateAsync({ id: user.id, data: values }) : create.mutateAsync(values)), {
      success: isEdit ? 'User updated' : 'User created',
      onSuccess: onClose,
    }),
  );

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <FormProvider {...methods}>
        <form onSubmit={onSubmit} noValidate>
          <DialogTitle>{isEdit ? 'Edit User' : 'Add New User'}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
              <RHFText name="name" label="User Name" required autoFocus />
              <RHFText name="userId" label="User ID (for login)" required />
              <RHFText
                name="password"
                label={isEdit ? 'New Password' : 'Password'}
                type="password"
                required={!isEdit}
                helperText={isEdit ? 'Leave blank to keep the current password' : undefined}
                autoComplete="new-password"
              />
              <RHFText
                name="role"
                label="Role"
                required
                options={[
                  { value: ROLES.SYSTEM_ADMIN, label: 'System Administrator: full control, creates Admins and Users' },
                  { value: ROLES.ADMIN, label: 'Admin: access set by the System Administrator' },
                  { value: ROLES.USER, label: 'User: access set by the System Administrator' },
                ]}
              />
              {methods.watch('role') !== ROLES.SYSTEM_ADMIN && (
                <Stack spacing={1}>
                  <Typography variant="subtitle2">Module permissions</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Dashboard is always available. Create, Edit and Delete automatically include View.
                  </Typography>
                  <Controller name="permissions" control={methods.control} render={({ field }) => <PermissionGrid value={field.value} onChange={field.onChange} />} />
                </Stack>
              )}
              <Controller
                name="active"
                control={methods.control}
                render={({ field }) => (
                  <FormControlLabel control={<Switch checked={field.value} onChange={(e) => field.onChange(e.target.checked)} color="secondary" />} label="Active (can sign in)" />
                )}
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={onClose} color="inherit">
              Cancel
            </Button>
            <Button type="submit" variant="contained" disabled={methods.formState.isSubmitting}>
              {isEdit ? 'Save Changes' : 'Create User'}
            </Button>
          </DialogActions>
        </form>
      </FormProvider>
    </Dialog>
  );
}
