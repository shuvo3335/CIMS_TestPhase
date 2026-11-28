import { useEffect, useState } from 'react';
import {
  Box, Stack, Chip, TextField, Button, Typography, Alert, IconButton, Tooltip,
  Table, TableHead, TableBody, TableRow, TableCell,
} from '@mui/material';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AddIcon from '@mui/icons-material/Add';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import { useSnackbar } from 'notistack';
import { useQueryClient } from '@tanstack/react-query';
import PageHeader from '@/components/PageHeader';
import { SectionCard } from '@/components/Common';
import { FormSkeleton } from '@/components/States';
import { useConfirm } from '@/components/ConfirmProvider';
import { useLookups, useUpdateLookups } from '@/hooks/useApi';
import { resetDemoData } from '@/services/api';
import { useCan, useIsSystemAdmin } from '@/store/authStore';

const GROUPS = [
  { key: 'currencies', label: 'Currencies', hint: 'Used for contract price and LC currency' },
  { key: 'incoterms', label: 'Incoterms' },
  { key: 'banks', label: 'Banks', hint: 'LC issuing banks' },
  { key: 'ports', label: 'Ports', hint: 'Port of loading / discharge' },
  { key: 'vesselTypes', label: 'Vessel Types' },
  { key: 'vesselStatuses', label: 'Vessel Statuses', hint: 'Order here is the order shown in dropdowns' },
];

function LookupEditor({ label, hint, values, onChange, readOnly }) {
  const [draft, setDraft] = useState('');
  const add = () => {
    const v = draft.trim();
    if (!v || values.some((x) => x.toLowerCase() === v.toLowerCase())) return;
    onChange([...values, v]);
    setDraft('');
  };
  return (
    <SectionCard title={label} subtitle={hint}>
      {!readOnly && (
      <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
        <TextField
          placeholder={`Add ${label.toLowerCase()}…`}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
        />
        <Button variant="outlined" onClick={add} startIcon={<AddIcon />}>
          Add
        </Button>
      </Stack>
      )}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        {values.map((v) => (
          <Chip key={v} label={v} onDelete={readOnly ? undefined : () => onChange(values.filter((x) => x !== v))} variant="outlined" />
        ))}
      </Box>
    </SectionCard>
  );
}

const EMPTY_BUYER = { name: '', ircNo: '', tinNo: '', binNo: '' };

function BuyerEditor({ values, onChange, readOnly }) {
  const [form, setForm] = useState(EMPTY_BUYER);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const reset = () => {
    setForm(EMPTY_BUYER);
    setEditingId(null);
    setError('');
  };

  const submit = () => {
    const name = form.name.trim();
    if (!name) return setError('Buyer name is required');
    if (values.some((b) => b.id !== editingId && b.name.toLowerCase() === name.toLowerCase())) {
      return setError('A buyer with this name already exists');
    }
    const clean = { name, ircNo: form.ircNo.trim(), tinNo: form.tinNo.trim(), binNo: form.binNo.trim() };
    if (editingId) onChange(values.map((b) => (b.id === editingId ? { ...b, ...clean } : b)));
    else onChange([...values, { id: `b_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, ...clean }]);
    reset();
  };

  const startEdit = (b) => {
    setForm({ name: b.name, ircNo: b.ircNo || '', tinNo: b.tinNo || '', binNo: b.binNo || '' });
    setEditingId(b.id);
    setError('');
  };

  return (
    <SectionCard title="Buyers" subtitle="Buyer master with registration numbers">
      {!readOnly && (
        <Stack spacing={2} sx={{ mb: 2 }}>
          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '2fr 1fr 1fr 1fr' } }}>
            <TextField label="Buyer Name" required value={form.name} onChange={set('name')} error={!!error} helperText={error || ' '} />
            <TextField label="IRC No" value={form.ircNo} onChange={set('ircNo')} helperText=" " />
            <TextField label="TIN No" value={form.tinNo} onChange={set('tinNo')} helperText=" " />
            <TextField label="BIN No" value={form.binNo} onChange={set('binNo')} helperText=" " />
          </Box>
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" onClick={submit} startIcon={editingId ? <SaveOutlinedIcon /> : <AddIcon />}>
              {editingId ? 'Update Buyer' : 'Add Buyer'}
            </Button>
            {editingId && <Button onClick={reset}>Cancel</Button>}
          </Stack>
        </Stack>
      )}
      <Box sx={{ overflowX: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Buyer Name</TableCell>
              <TableCell>IRC No</TableCell>
              <TableCell>TIN No</TableCell>
              <TableCell>BIN No</TableCell>
              {!readOnly && <TableCell align="right">Actions</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {values.length === 0 && (
              <TableRow>
                <TableCell colSpan={readOnly ? 4 : 5} align="center" sx={{ color: 'text.secondary' }}>
                  No buyers added yet
                </TableCell>
              </TableRow>
            )}
            {values.map((b) => (
              <TableRow key={b.id} hover>
                <TableCell>{b.name}</TableCell>
                <TableCell>{b.ircNo || '—'}</TableCell>
                <TableCell>{b.tinNo || '—'}</TableCell>
                <TableCell>{b.binNo || '—'}</TableCell>
                {!readOnly && (
                  <TableCell align="right">
                    <Tooltip title="Edit">
                      <IconButton size="small" onClick={() => startEdit(b)}><EditOutlinedIcon fontSize="small" /></IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => {
                          onChange(values.filter((x) => x.id !== b.id));
                          if (editingId === b.id) reset();
                        }}
                      >
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
    </SectionCard>
  );
}

export default function SettingsPage() {
  const { data: lookups, isLoading } = useLookups();
  const saveLookups = useUpdateLookups();
  const canEdit = useCan()('settings', 'edit');
  const isSystemAdmin = useIsSystemAdmin();
  const { enqueueSnackbar } = useSnackbar();
  const confirm = useConfirm();
  const qc = useQueryClient();
  const [draft, setDraft] = useState(null);

  useEffect(() => {
    if (lookups) setDraft(lookups);
  }, [lookups]);

  const save = async () => {
    await saveLookups.mutateAsync(draft);
    enqueueSnackbar('Settings saved', { variant: 'success' });
  };

  // Buyers are persisted immediately so they are available in the contract form without clicking "Save Changes".
  const saveBuyers = async (buyers) => {
    const next = { ...draft, buyers };
    setDraft(next);
    try {
      await saveLookups.mutateAsync(next);
      enqueueSnackbar('Buyers saved', { variant: 'success' });
    } catch (e) {
      enqueueSnackbar(e?.message || 'Could not save buyers', { variant: 'error' });
    }
  };

  const reset = async () => {
    const ok = await confirm({
      title: 'Reset demo data?',
      message: 'This deletes ALL contracts, PIs, LCs, shipments, users and uploaded files stored in this browser, and restores the sample dataset.',
      confirmText: 'Reset everything',
      danger: true,
    });
    if (!ok) return;
    await resetDemoData();
    qc.invalidateQueries();
    enqueueSnackbar('Demo data restored', { variant: 'success' });
  };

  if (isLoading || !draft) return <FormSkeleton />;

  return (
    <>
      <PageHeader
        title="Settings & Lookups"
        subtitle="Manage dropdown lists and buyers"
        breadcrumbs={[{ label: 'Administration' }, { label: 'Settings' }]}
        actions={
          canEdit && (
            <Button variant="contained" startIcon={<SaveOutlinedIcon />} onClick={save}>
              Save Changes
            </Button>
          )
        }
      />
      <Stack spacing={3}>
        <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' } }}>
          {GROUPS.map((g) => (
            <LookupEditor key={g.key} readOnly={!canEdit} label={g.label} hint={g.hint} values={draft[g.key] || []} onChange={(v) => setDraft((d) => ({ ...d, [g.key]: v }))} />
          ))}
        </Box>
        <BuyerEditor readOnly={!canEdit} values={draft.buyers || []} onChange={saveBuyers} />
        {isSystemAdmin && (
        <SectionCard title="Demo Data">
          <Stack spacing={2} alignItems="flex-start">
            <Alert severity="warning" variant="outlined">
              The frontend currently stores data in this browser only. Use this to restore the sample dataset.
            </Alert>
            <Typography variant="body2" color="text.secondary">
              Sample: Bulgarian Wheat 55,000 MT (7 SPIs, 7 LCs, MV OCEAN PRIDE), Canadian Yellow Peas (2 of 3 LCs), Brazilian Soybean (no PI).
            </Typography>
            <Button color="error" variant="outlined" startIcon={<RestartAltIcon />} onClick={reset}>
              Reset demo data
            </Button>
          </Stack>
        </SectionCard>
        )}
      </Stack>
    </>
  );
}
