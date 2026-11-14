import { useMemo, useState } from 'react';
import { Button } from '@mui/material';
import PersonAddAlt1OutlinedIcon from '@mui/icons-material/PersonAddAlt1Outlined';
import PageHeader from '@/components/PageHeader';
import DataGrid, { dateCol } from '@/components/DataGrid';
import { StatusChip } from '@/components/Common';
import { userHooks } from '@/hooks/useApi';
import { useAuthStore } from '@/store/authStore';
import UserFormDialog from './UserFormDialog';

export default function UserListPage() {
  const { data = [], isLoading } = userHooks.useList();
  const remove = userHooks.useRemove();
  const me = useAuthStore((s) => s.user);
  const [editing, setEditing] = useState(null); // null = closed, {} = new, user = edit

  const columns = useMemo(
    () => [
      { field: 'name', headerName: 'Name', minWidth: 180 },
      { field: 'userId', headerName: 'User ID', minWidth: 140 },
      { field: 'role', headerName: 'Role', maxWidth: 140, cellRenderer: (p) => <StatusChip value={p.value} label={p.value === 'ADMIN' ? 'Admin' : 'User'} /> },
      {
        field: 'active',
        headerName: 'Status',
        maxWidth: 140,
        valueGetter: (p) => (p.data.active ? 'Active' : 'Disabled'),
        cellRenderer: (p) => <StatusChip value={p.value} color={p.value === 'Active' ? 'success' : 'default'} />,
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
      {editing && <UserFormDialog user={editing.id ? editing : null} onClose={() => setEditing(null)} />}
    </>
  );
}
