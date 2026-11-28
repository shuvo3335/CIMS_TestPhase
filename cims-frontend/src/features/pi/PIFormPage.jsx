import { useEffect, useMemo } from 'react';
import { useForm, FormProvider, useWatch, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Stack, Button, Table, TableHead, TableRow, TableCell, TableBody, TableFooter, IconButton, Tooltip, Typography, Alert, Box, Chip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AutoFixHighOutlinedIcon from '@mui/icons-material/AutoFixHighOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import TuneOutlinedIcon from '@mui/icons-material/TuneOutlined';
import ViewListOutlinedIcon from '@mui/icons-material/ViewListOutlined';
import AttachFileOutlinedIcon from '@mui/icons-material/AttachFileOutlined';
import PageHeader from '@/components/PageHeader';
import { SectionCard, FormGrid, DetailGrid } from '@/components/Common';
import { RHFText, RHFAutocomplete } from '@/components/form/RHFFields';
import { RHFFileUploader } from '@/components/FileUploader';
import QtySummaryBar from '@/components/QtySummaryBar';
import { FormSkeleton, ErrorState, EmptyState } from '@/components/States';
import { useConfirm } from '@/components/ConfirmProvider';
import { useSnackbar } from 'notistack';
import { contractHooks, piHooks, useLookups, useUpdateLookups } from '@/hooks/useApi';
import { useSubmit } from '@/hooks/useSubmit';
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges';
import { checkSpiTotal, calcSpiAmount, sumBy, toNum, round2 } from '@/utils/calc';
import { fmtQty, fmtMoney, fmtDateRange } from '@/utils/format';
import { FormActions } from '@/features/contracts/ContractFormPage';
import { piSchema, piDefaults, toFormValues } from './schema';

export default function PIFormPage() {
  const { id } = useParams();
  const isEdit = !!id;
  const [search] = useSearchParams();
  const navigate = useNavigate();
  const confirm = useConfirm();

  const { data: contracts = [], isLoading: loadingContracts } = contractHooks.useList();
  const { data: lookups } = useLookups();
  const updateLookups = useUpdateLookups();
  const { enqueueSnackbar } = useSnackbar();
  const existing = piHooks.useOne(id);

  // Save a newly typed port into the shared port list so it can be picked in future PIs.
  const addPort = async (name) => {
    const port = name.trim();
    const ports = lookups?.ports ?? [];
    if (ports.some((p) => p.toLowerCase() === port.toLowerCase())) return;
    try {
      await updateLookups.mutateAsync({ ...lookups, ports: [...ports, port] });
      enqueueSnackbar(`Port "${port}" added to the list`, { variant: 'success' });
    } catch (e) {
      enqueueSnackbar(e.message || 'Could not add port', { variant: 'error' });
      throw e;
    }
  };
  const create = piHooks.useCreate();
  const update = piHooks.useUpdate();

  const methods = useForm({
    resolver: zodResolver(piSchema),
    defaultValues: { ...piDefaults, contractId: search.get('contract') || '' },
    mode: 'onTouched',
  });
  const { control, reset, setValue, getValues, setError, formState } = methods;
  const { fields, append, remove } = useFieldArray({ control, name: 'spis', keyName: 'key' });
  const submit = useSubmit(setError);
  const release = useUnsavedChanges(formState.isDirty && !formState.isSubmitSuccessful);

  useEffect(() => {
    if (existing.data) reset(toFormValues(existing.data));
  }, [existing.data, reset]);

  const [contractId, unitPrice, spis, piNo] = useWatch({ control, name: ['contractId', 'unitPrice', 'spis', 'piNo'] });
  const contract = contracts.find((c) => c.id === contractId);
  // SPI total tolerance is defined on the sales contract.
  const tolerance = toNum(contract?.tolerance);

  // Pre-fill unit price from the contract for a new PI.
  useEffect(() => {
    if (!isEdit && contract && !getValues('unitPrice')) setValue('unitPrice', String(contract.unitPrice));
  }, [contract, isEdit, getValues, setValue]);

  const contractOptions = useMemo(
    () =>
      contracts
        .filter((c) => (isEdit ? c.id === existing.data?.contractId : c.status === 'ACTIVE' && !c.piId))
        .map((c) => ({ value: c.id, label: `${c.contractNo} · ${c.commodity}`, render: <ContractOption c={c} /> })),
    [contracts, isEdit, existing.data],
  );

  const check = checkSpiTotal(spis, contract?.totalQty, tolerance);
  const remaining = round2(toNum(contract?.totalQty) - check.total);
  const hasLcs = (existing.data?.lcCount ?? 0) > 0;

  const addSpi = () => append({ spiNo: piNo ? `${piNo}/${fields.length + 1}` : '', qty: '' });
  const fillRemaining = () => {
    const idx = spis.length - 1;
    const current = toNum(spis[idx]?.qty);
    setValue(`spis.${idx}.qty`, String(round2(current + remaining)), { shouldDirty: true, shouldValidate: true });
  };

  const onSubmit = methods.handleSubmit(async (values) => {
    const chk = checkSpiTotal(values.spis, contract?.totalQty, tolerance);
    if (!chk.ok) {
      await confirm({
        title: 'SPI quantity mismatch',
        message:
          `The total of all SPI quantities must equal the sales contract quantity${tolerance ? ` (±${tolerance}% tolerance)` : ''}.\n\n` +
          `Contract qty: ${fmtQty(chk.contractQty, contract?.unit)}\n` +
          `SPI total: ${fmtQty(chk.total, contract?.unit)}\n` +
          `Difference: ${fmtQty(chk.diff, contract?.unit)}\n\nPlease adjust the SPI quantities before saving.`,
        alertOnly: true,
        danger: true,
      });
      return;
    }
    await submit(() => (isEdit ? update.mutateAsync({ id, data: values }) : create.mutateAsync(values)), {
      success: isEdit ? 'PI updated' : `PI saved with ${values.spis.length} SPI(s)`,
      onSuccess: (saved) => {
        release();
        navigate(`/pi/${saved.id}`);
      },
    });
  });

  if (isEdit && existing.isError) return <ErrorState error={existing.error} onRetry={existing.refetch} />;
  const loading = (isEdit && existing.isLoading) || loadingContracts;

  return (
    <>
      <PageHeader
        title={isEdit ? `Edit PI ${existing.data?.piNo ?? ''}` : 'New Proforma Invoice (PI / SPI)'}
        subtitle="Open one PI per sales contract and split it into SPIs. The SPI total must match the contract quantity."
        breadcrumbs={[{ label: 'Proforma Invoice', to: '/pi' }, { label: isEdit ? 'Edit' : 'New' }]}
      />
      {loading ? (
        <FormSkeleton sections={3} />
      ) : (
        <FormProvider {...methods}>
          <Stack component="form" spacing={3} onSubmit={onSubmit} noValidate>
            <SectionCard title="Sales Contract" subtitle="Only active contracts without a PI are listed" icon={<DescriptionOutlinedIcon />}>
              <Stack spacing={2}>
                <Box sx={{ maxWidth: { md: 520 } }}>
                  <RHFAutocomplete name="contractId" label="Sales Contract No" options={contractOptions} required disabled={isEdit} />
                </Box>
                {!isEdit && contractOptions.length === 0 && (
                  <Alert severity="warning">There are no active sales contracts without a PI. Create a sales contract first.</Alert>
                )}
                {contract && (
                  <DetailGrid
                    columns={4}
                    items={[
                      { label: 'Buyer', value: contract.buyer },
                      { label: 'Seller', value: contract.seller },
                      { label: 'Commodity', value: contract.commodity, emphasize: true },
                      { label: 'Origin', value: contract.origin },
                      { label: 'Total Qty', value: fmtQty(contract.totalQty, contract.unit), emphasize: true },
                      { label: 'Per Unit Price', value: fmtMoney(contract.unitPrice, contract.currency) },
                      { label: 'Incoterms', value: contract.incoterms },
                      { label: 'Shipment Period', value: fmtDateRange(contract.shipmentFrom, contract.shipmentTo) },
                    ]}
                  />
                )}
              </Stack>
            </SectionCard>

            <SectionCard title="Common SPI Details" subtitle="These apply to every SPI under this PI" icon={<TuneOutlinedIcon />}>
              <FormGrid columns={4}>
                <RHFText name="piNo" label="PI No" required />
                <RHFText name="spiDate" label="PI Date" type="date" required />
                <RHFText name="spiValidity" label="PI Validity" type="date" required />
                <RHFText name="unitPrice" label="PI Unit Price" type="number" required endAdornment={contract?.currency} />
                <RHFAutocomplete name="pol" label="Port of Loading (PoL)" options={lookups?.ports ?? []} onCreate={addPort} helperText="Not listed? Type the port name and choose “Add”." required />
                <RHFAutocomplete name="pod" label="Port of Discharge (PoD)" options={lookups?.ports ?? []} onCreate={addPort} required />
              </FormGrid>
            </SectionCard>

            {contract && (
              <QtySummaryBar contractQty={contract.totalQty} allocated={check.total} unit={contract.unit} tolerancePct={tolerance} ok={check.ok} />
            )}

            <SectionCard
              title={`SPI Breakdown (${fields.length})`}
              subtitle="Split the PI into SPIs. Each SPI will get its own LC, insurance cover note, BL and CI."
              icon={<ViewListOutlinedIcon />}
              action={
                <Stack direction="row" spacing={1}>
                  {contract && remaining !== 0 && spis.length > 0 && (
                    <Tooltip title="Put the remaining quantity on the last SPI">
                      <Button size="small" startIcon={<AutoFixHighOutlinedIcon />} onClick={fillRemaining}>
                        Fill remaining
                      </Button>
                    </Tooltip>
                  )}
                  <Button size="small" variant="outlined" color="secondary" startIcon={<AddIcon />} onClick={addSpi}>
                    Add SPI
                  </Button>
                </Stack>
              }
              contentSx={{ p: 0, '&:last-child': { pb: 0 } }}
            >
              {fields.length === 0 ? (
                <EmptyState compact title="No SPIs" message="Add at least one SPI." />
              ) : (
                <Box sx={{ overflowX: 'auto' }}>
                  <Table size="small" sx={{ minWidth: 640 }}>
                    <TableHead>
                      <TableRow>
                        <TableCell width={56}>#</TableCell>
                        <TableCell>SPI No *</TableCell>
                        <TableCell width={220}>SPI Qty * {contract ? `(${contract.unit})` : ''}</TableCell>
                        <TableCell width={220} align="right">
                          SPI Amount (Qty × Unit Price)
                        </TableCell>
                        <TableCell width={64} />
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {fields.map((f, i) => {
                        const locked = !!f.lcId;
                        return (
                          <TableRow key={f.key} hover>
                            <TableCell>{i + 1}</TableCell>
                            <TableCell sx={{ py: 1 }}>
                              <Stack direction="row" spacing={1} alignItems="center">
                                <RHFText name={`spis.${i}.spiNo`} placeholder="SPI No" />
                                {locked && <Chip size="small" color="secondary" variant="outlined" label="LC opened" />}
                              </Stack>
                            </TableCell>
                            <TableCell sx={{ py: 1 }}>
                              <RHFText name={`spis.${i}.qty`} type="number" placeholder="0.00" />
                            </TableCell>
                            <TableCell align="right">
                              <Typography fontWeight={600}>{fmtMoney(calcSpiAmount(spis[i]?.qty, unitPrice), contract?.currency)}</Typography>
                            </TableCell>
                            <TableCell>
                              <Tooltip title={locked ? 'An LC is opened against this SPI' : 'Remove SPI'}>
                                <span>
                                  <IconButton size="small" color="error" disabled={locked || fields.length === 1} onClick={() => remove(i)}>
                                    <DeleteOutlineIcon fontSize="small" />
                                  </IconButton>
                                </span>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                    <TableFooter>
                      <TableRow>
                        <TableCell colSpan={2}>
                          <Typography fontWeight={700}>Total</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography fontWeight={700} color={check.ok ? 'success.main' : 'error.main'}>
                            {fmtQty(check.total, contract?.unit)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography fontWeight={700}>
                            {fmtMoney(sumBy(spis, (s) => calcSpiAmount(s.qty, unitPrice)), contract?.currency)}
                          </Typography>
                        </TableCell>
                        <TableCell />
                      </TableRow>
                    </TableFooter>
                  </Table>
                </Box>
              )}
              {formState.errors.spis?.root?.message && (
                <Alert severity="error" sx={{ m: 2 }}>
                  {formState.errors.spis.root.message}
                </Alert>
              )}
              {hasLcs && (
                <Alert severity="info" sx={{ m: 2 }}>
                  SPIs that already have an LC can't be removed, but you can still change their quantity.
                </Alert>
              )}
            </SectionCard>

            <SectionCard title="PI Documents" subtitle="Upload all PI / SPI documents" icon={<AttachFileOutlinedIcon />}>
              <RHFFileUploader name="files" />
            </SectionCard>

            <FormActions submitting={formState.isSubmitting} onCancel={() => navigate(-1)} label={isEdit ? 'Update PI' : 'Save PI'} />
          </Stack>
        </FormProvider>
      )}
    </>
  );
}

function ContractOption({ c }) {
  return (
    <Box>
      <Typography variant="body2" fontWeight={650}>
        {c.contractNo}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {c.commodity} · {fmtQty(c.totalQty, c.unit)} · {c.seller}
      </Typography>
    </Box>
  );
}
