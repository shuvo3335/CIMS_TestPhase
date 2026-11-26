import { useMemo, useState } from 'react';
import { Button } from '@mui/material';
import PersonAddAlt1OutlinedIcon from '@mui/icons-material/PersonAddAlt1Outlined';
import PageHeader from '@/components/PageHeader';
import DataGrid, { dateCol } from '@/components/DataGrid';
import { StatusChip } from '@/components/Common';
import { userHooks } from '@/hooks/useApi';
import { useAuthStore } from '@/store/authStore';
import { ROLE_LABELS } from '@/utils/constants';
import UserFormDialog from './UserFormDialog';
import PermissionsDialog from './PermissionsDialog';

export default function UserListPage() {
  const { data = [], isLoading } = userHooks.useList();
  const remove = userHooks.useRemove();
  const me = useAuthStore((s) => s.user);
  const [editing, setEditing] = useState(null); // null = closed, {} = new, user = edit
  const [permUser, setPermUser] = useState(null);

  const columns = useMemo(
    () => [
      { field: 'name', headerName: 'Name', minWidth: 180 },
      { field: 'userId', headerName: 'User ID', minWidth: 140 },
      { field: 'password', headerName: 'Password', minWidth: 140, valueFormatter: (p) => p.value || '—' },
      { field: 'role', headerName: 'Role', minWidth: 190, cellRenderer: (p) => <StatusChip value={p.value} label={ROLE_LABELS[p.value] ?? p.value} /> },
      {
        field: 'active',
        headerName: 'Status',
        maxWidth: 140,
        valueGetter: (p) => (p.data.active ? 'Active' : 'Disabled'),
        cellRenderer: (p) => <StatusChip value={p.value} color={p.value === 'Active' ? 'success' : 'default'} />,
      },
      {
        headerName: 'Permissions',
        colId: 'permissions',
        minWidth: 170,
        sortable: false,
        filter: false,
        cellRenderer: (p) =>
          p.data.role === 'SYSTEM_ADMIN' ? (
            'Full access'
          ) : (
            <Button size="small" variant="outlined" onClick={(e) => { e.stopPropagation(); setPermUser(p.data); }}>
              Permissions
            </Button>
          ),
      },
      dateCol('createdAt', 'Created'),
    ],
    [],
  );

  return (
    <>
      <PageHeader
        title="User Management"
        subtitle="Only administrators can add users. There is no self sign-up."
        breadcrumbs={[{ label: 'Administration' }, { label: 'Users' }]}
        actions={
          <Button variant="contained" startIcon={<PersonAddAlt1OutlinedIcon />} onClick={() => setEditing({})}>
            Add User
          </Button>
        }
      />
      <DataGrid
        rowData={data}
        loading={isLoading}
        columnDefs={columns}
        exportFileName="users"
        onEdit={(row) => setEditing(row)}
        onDelete={(row) => remove.mutateAsync({ id: row.id, currentUserId: me?.id })}
        deleteMessage={(row) => `User "${row.name}" (${row.userId}) will no longer be able to sign in.`}
      />
      {permUser && <PermissionsDialog user={permUser} onClose={() => setPermUser(null)} />}
      {editing && <UserFormDialog user={editing.id ? editing : null} onClose={() => setEditing(null)} />}
    </>
  );
}
