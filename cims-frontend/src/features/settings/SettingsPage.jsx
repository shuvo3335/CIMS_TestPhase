import { useEffect, useState } from 'react';
import { Box, Stack, Chip, TextField, Button, Typography, InputAdornment, Alert } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import { useSnackbar } from 'notistack';
import { useQueryClient } from '@tanstack/react-query';
import PageHeader from '@/components/PageHeader';
import { SectionCard } from '@/components/Common';
import { FormSkeleton } from '@/components/States';
import { useConfirm } from '@/components/ConfirmProvider';
import { useLookups, useUpdateLookups, useSettings, useUpdateSettings } from '@/hooks/useApi';
import { resetDemoData } from '@/services/api';

const GROUPS = [
  { key: 'currencies', label: 'Currencies', hint: 'Used for contract price and LC currency' },
  { key: 'incoterms', label: 'Incoterms' },
  { key: 'banks', label: 'Banks', hint: 'LC issuing banks' },
  { key: 'ports', label: 'Ports', hint: 'Port of loading / discharge' },
  { key: 'vesselTypes', label: 'Vessel Types' },
  { key: 'vesselStatuses', label: 'Vessel Statuses', hint: 'Order here is the order shown in dropdowns' },
];

function LookupEditor({ label, hint, values, onChange }) {
  const [draft, setDraft] = useState('');
  const add = () => {
    const v = draft.trim();
    if (!v || values.some((x) => x.toLowerCase() === v.toLowerCase())) return;
    onChange([...values, v]);
    setDraft('');
  };
  return (
    <SectionCard title={label} subtitle={hint}>
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
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        {values.map((v) => (
          <Chip key={v} label={v} onDelete={() => onChange(values.filter((x) => x !== v))} variant="outlined" />
        ))}
      </Box>
    </SectionCard>
  );
}

export default function SettingsPage() {
  const { data: lookups, isLoading } = useLookups();
  const { data: settings } = useSettings();
  const saveLookups = useUpdateLookups();
  const saveSettings = useUpdateSettings();
  const { enqueueSnackbar } = useSnackbar();
  const confirm = useConfirm();
  const qc = useQueryClient();
  const [draft, setDraft] = useState(null);
  const [tolerance, setTolerance] = useState('0');

  useEffect(() => {
    if (lookups) setDraft(lookups);
  }, [lookups]);
  useEffect(() => {
    if (settings) setTolerance(String(settings.spiTolerancePct ?? 0));
  }, [settings]);

  const save = async () => {
    const t = Number(tolerance);
    if (!Number.isFinite(t) || t < 0 || t > 10) {
      enqueueSnackbar('Tolerance must be between 0 and 10%', { variant: 'error' });
      return;
    }
    await Promise.all([saveLookups.mutateAsync(draft), saveSettings.mutateAsync({ ...settings, spiTolerancePct: t })]);
    enqueueSnackbar('Settings saved', { variant: 'success' });
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
        subtitle="Manage dropdown lists and business rules"
        breadcrumbs={[{ label: 'Administration' }, { label: 'Settings' }]}
        actions={
          <Button variant="contained" startIcon={<SaveOutlinedIcon />} onClick={save}>
            Save Changes
          </Button>
        }
      />
      <Stack spacing={3}>
        <SectionCard title="Business Rules">
          <Stack spacing={2} sx={{ maxWidth: 520 }}>
            <TextField
              label="SPI quantity tolerance"
              type="number"
              value={tolerance}
              onChange={(e) => setTolerance(e.target.value)}
              helperText="Allowed ± difference between Σ SPI qty and contract qty. 0 = must match exactly."
              slotProps={{ input: { endAdornment: <InputAdornment position="end">%</InputAdornment> }, htmlInput: { min: 0, max: 10, step: 0.1 } }}
            />
          </Stack>
        </SectionCard>
        <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' } }}>
          {GROUPS.map((g) => (
            <LookupEditor key={g.key} label={g.label} hint={g.hint} values={draft[g.key] || []} onChange={(v) => setDraft((d) => ({ ...d, [g.key]: v }))} />
          ))}
        </Box>
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
      </Stack>
    </>
  );
}
