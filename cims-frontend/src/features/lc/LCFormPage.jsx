import { useEffect, useMemo } from 'react';
import { useForm, FormProvider, useWatch, useFieldArray, useFormContext } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Stack, Button, Box, Typography, Alert, IconButton, Tooltip, LinearProgress, Chip, Card, CardContent } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AccountBalanceOutlinedIcon from '@mui/icons-material/AccountBalanceOutlined';
import PageHeader from '@/components/PageHeader';
import { SectionCard, FormGrid, Span, DetailGrid } from '@/components/Common';
import { RHFText, RHFAutocomplete } from '@/components/form/RHFFields';
import { RHFFileUploader } from '@/components/FileUploader';
import { FormSkeleton, ErrorState, EmptyState } from '@/components/States';
import { contractHooks, piHooks, lcHooks, useLookups } from '@/hooks/useApi';
import { useSubmit } from '@/hooks/useSubmit';
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges';
import { fmtQty, fmtMoney } from '@/utils/format';
import { toNum } from '@/utils/calc';
import { LC_TYPES } from '@/utils/constants';
import { FormActions } from '@/features/contracts/ContractFormPage';
import AmendmentSection from './AmendmentSection';
import { lcSchema, lcDefaults, emptyLc, toFormValues } from './schema';

export default function LCFormPage() {
  const { id } = useParams();
  const isEdit = !!id;
  const [search] = useSearchParams();
  const navigate = useNavigate();

  const { data: contracts = [], isLoading: lc1 } = contractHooks.useList();
  const { data: pis = [], isLoading: lc2 } = piHooks.useList();
  const { data: lookups } = useLookups();
  const existing = lcHooks.useOne(id);
  const createMany = lcHooks.useCreateMany();
  const update = lcHooks.useUpdate();

  const methods = useForm({
    resolver: zodResolver(lcSchema),
    defaultValues: { ...lcDefaults, contractId: search.get('contract') || '' },
    mode: 'onTouched',
  });
  const { control, reset, setValue, setError, formState, clearErrors } = methods;
  const { fields, append, remove } = useFieldArray({ control, name: 'lcs', keyName: 'key' });
  const submit = useSubmit(setError);
  const release = useUnsavedChanges(formState.isDirty && !formState.isSubmitSuccessful);

  useEffect(() => {
    if (existing.data) reset(toFormValues(existing.data));
  }, [existing.data, reset]);

  const [lcType, contractId, lcs] = useWatch({ control, name: ['lcType', 'contractId', 'lcs'] });
  const contract = contracts.find((c) => c.id === contractId);
  const pi = pis.find((p) => p.contractId === contractId);

  useEffect(() => {
    if (!lcType) setValue('paymentDurationDays', '');
    else clearErrors('paymentDurationDays');
  }, [lcType, setValue, clearErrors]);

  const contractOptions = useMemo(
    () =>
      contracts
        .filter((c) => c.piId)
        .map((c) => {
          const p = pis.find((x) => x.id === c.piId);
          const pending = p ? p.spis.length - p.lcCount : 0;
          return {
            value: c.id,
            label: `${c.contractNo} · ${c.commodity}`,
            disabled: !isEdit && pending === 0,
            render: (
              <Box>
                <Typography variant="body2" fontWeight={650}>
                  {c.contractNo}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {c.commodity} · {pending === 0 ? 'all SPIs have LCs' : `${pending} SPI(s) awaiting LC`}
                </Typography>
              </Box>
            ),
          };
        }),
    [contracts, pis, isEdit],
  );

  // SPIs already used by other LCs (excluding the LC being edited).
  const takenSpiIds = useMemo(
    () => new Set((pi?.spis || []).filter((s) => s.lcId && s.lcId !== id).map((s) => s.id)),
    [pi, id],
  );
  const openedCount = pi ? pi.lcCount + (isEdit ? 0 : fields.length) : 0;
  const totalSpis = pi?.spis.length ?? 0;
  const availableForNew = (pi?.spis || []).filter((s) => !takenSpiIds.has(s.id)).length - (isEdit ? 0 : fields.length);

  const onContractChange = () => {
    if (!isEdit) setValue('lcs', [], { shouldDirty: true });
  };

  const onSubmit = methods.handleSubmit((values) => {
    const header = { lcType: values.lcType, paymentDurationDays: values.paymentDurationDays, bank: values.bank, contractId: values.contractId };
    return submit(
      () => (isEdit ? update.mutateAsync({ id, header, item: values.lcs[0] }) : createMany.mutateAsync({ header, items: values.lcs })),
      {
        success: isEdit ? 'LC updated' : `${values.lcs.length} LC(s) opened`,
        onSuccess: (saved) => {
          release();
          navigate(isEdit ? `/lc/${id}` : saved.length === 1 ? `/lc/${saved[0].id}` : '/lc');
        },
      },
    );
  });

  if (isEdit && existing.isError) return <ErrorState error={existing.error} onRetry={existing.refetch} />;
  const loading = (isEdit && existing.isLoading) || lc1 || lc2;

  return (
    <>
      <PageHeader
        title={isEdit ? `Edit LC ${existing.data?.lcNo ?? ''}` : 'Open Letter of Credit'}
        subtitle="One LC per SPI. Select the LC type, bank and contract, then open an LC for each SPI."
        breadcrumbs={[{ label: 'Letter of Credit', to: '/lc' }, { label: isEdit ? 'Edit' : 'New' }]}
      />
      {loading ? (
        <FormSkeleton sections={2} />
      ) : (
        <FormProvider {...methods}>
          <Stack component="form" spacing={3} onSubmit={onSubmit} noValidate>
            <SectionCard title="LC Header" icon={<AccountBalanceOutlinedIcon />}>
              <Stack spacing={2}>
                <FormGrid columns={4}>
                  <RHFText name="lcType" label="LC Type" options={LC_TYPES} required />
                  <RHFText
                    name="paymentDurationDays"
                    label="Payment Duration"
                    type="number"
                    endAdornment="days"
                    disabled={!lcType}
                    required={lcType === 'UPAS'}
                    helperText={!lcType ? 'Select LC type first' : lcType === 'SIGHT' ? 'Optional for Sight LC' : undefined}
                  />
                  <RHFAutocomplete name="bank" label="Bank Name" options={lookups?.banks ?? []} required />
                  <RHFAutocomplete
                    name="contractId"
                    label="Sales Contract No"
                    options={contractOptions}
                    getOptionDisabled={(o) => o.disabled}
                    required
                    disabled={isEdit}
                    onValueChange={onContractChange}
                  />
                </FormGrid>
                {contract && (
                  <DetailGrid
                    columns={4}
                    items={[
                      { label: 'Buyer', value: contract.buyer },
                      { label: 'Seller', value: contract.seller },
                      { label: 'Commodity', value: contract.commodity },
                      { label: 'PI No', value: pi?.piNo },
                    ]}
                  />
                )}
                {contract && pi && (
                  <Box>
                    <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                      <Typography variant="body2" fontWeight={600}>
                        LCs opened {openedCount} / {totalSpis} SPIs
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {totalSpis - openedCount} remaining
                      </Typography>
                    </Stack>
                    <LinearProgress variant="determinate" color="secondary" value={totalSpis ? (openedCount / totalSpis) * 100 : 0} sx={{ height: 6, borderRadius: 3 }} />
                  </Box>
                )}
              </Stack>
            </SectionCard>

            {contract && (
              <Stack spacing={2}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="h6">LC Details {fields.length > 0 && `(${fields.length})`}</Typography>
                  {!isEdit && (
                    <Button variant="contained" color="secondary" startIcon={<AddIcon />} disabled={availableForNew <= 0} onClick={() => append(emptyLc(contract.currency))}>
                      Add / Open LC
                    </Button>
                  )}
                </Stack>
                {fields.length === 0 && (
                  <Card>
                    <CardContent>
                      <EmptyState
                        compact
                        title={availableForNew > 0 ? 'No LC added yet' : 'All SPIs already have LCs'}
                        message={availableForNew > 0 ? 'Click "Add / Open LC" to open an LC against an SPI.' : 'Every SPI under this contract already has its LC.'}
                      />
                    </CardContent>
                  </Card>
                )}
                {formState.errors.lcs?.root?.message && <Alert severity="error">{formState.errors.lcs.root.message}</Alert>}
                {fields.map((f, i) => (
                  <LcCard
                    key={f.key}
                    index={i}
                    pi={pi}
                    takenSpiIds={takenSpiIds}
                    usedInForm={lcs.filter((_, j) => j !== i).map((l) => l.spiId)}
                    currencies={lookups?.currencies ?? ['USD']}
                    unit={contract.unit}
                    onRemove={isEdit ? undefined : () => remove(i)}
                  />
                ))}
              </Stack>
            )}

            <FormActions submitting={formState.isSubmitting} onCancel={() => navigate(-1)} label={isEdit ? 'Update LC' : `Save ${fields.length || ''} LC(s)`} />
          </Stack>
        </FormProvider>
      )}
    </>
  );
}

function LcCard({ index, pi, takenSpiIds, usedInForm, currencies, unit, onRemove }) {
  const { control, setValue, getValues } = useFormContext();
  const base = `lcs.${index}`;
  const [spiId, currency] = useWatch({ control, name: [`${base}.spiId`, `${base}.currency`] });
  const spi = pi?.spis.find((s) => s.id === spiId);
  const doneQty = useWatch({ control, name: `${base}.doneQty` });

  const spiOptions = (pi?.spis || [])
    .filter((s) => !takenSpiIds.has(s.id) && !usedInForm.includes(s.id))
    .map((s) => ({ value: s.id, label: `${s.spiNo} · ${fmtQty(s.qty, unit)}` }));

  const onSpiChange = (val) => {
    const s = pi?.spis.find((x) => x.id === val);
    if (!s) return;
    if (!getValues(`${base}.doneQty`)) setValue(`${base}.doneQty`, String(s.qty), { shouldValidate: true });
    if (!getValues(`${base}.amount`)) setValue(`${base}.amount`, String(s.amount), { shouldValidate: true });
  };

  const overQty = spi && toNum(doneQty) > toNum(spi.qty);

  return (
    <SectionCard
      title={
        <Stack direction="row" spacing={1} alignItems="center">
          <span>LC #{index + 1}</span>
          {spi && <Chip size="small" variant="outlined" color="secondary" label={spi.spiNo} />}
        </Stack>
      }
      action={
        onRemove && (
          <Tooltip title="Remove this LC">
            <IconButton color="error" size="small" onClick={onRemove}>
              <DeleteOutlineIcon />
            </IconButton>
          </Tooltip>
        )
      }
    >
      <FormGrid columns={4}>
        <RHFText
          name={`${base}.spiId`}
          label="Select SPI"
          required
          options={spiOptions.length ? spiOptions : [{ value: '', label: 'No SPI available', disabled: true }]}
          onValueChange={onSpiChange}
          helperText={spi ? `SPI amount ${fmtMoney(spi.amount, currency)}` : undefined}
        />
        <RHFText name={`${base}.lcNo`} label="LC Number" required />
        <RHFText name={`${base}.issueDate`} label="LC Issue Date" type="date" required />
        <RHFText name={`${base}.expiryDate`} label="LC Expiry Date" type="date" required />
        <RHFText
          name={`${base}.doneQty`}
          label="LC Done Qty"
          type="number"
          required
          endAdornment={unit}
          helperText={overQty ? `⚠ Exceeds SPI qty (${fmtQty(spi.qty)})` : spi ? `SPI qty ${fmtQty(spi.qty, unit)}` : undefined}
          slotProps={overQty ? { formHelperText: { sx: { color: 'warning.main' } } } : undefined}
        />
        <RHFText name={`${base}.amount`} label="LC Amount / Value" type="number" required />
        <RHFText name={`${base}.currency`} label="LC Currency" options={currencies} required />
        <RHFText name={`${base}.insuranceCoverNoteNo`} label="Insurance Cover Note No" required />
        <Span>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            LC Documents
          </Typography>
          <RHFFileUploader name={`${base}.files`} compact />
        </Span>
      </FormGrid>
      <AmendmentSection lcIndex={index} currency={currency} />
    </SectionCard>
  );
}
