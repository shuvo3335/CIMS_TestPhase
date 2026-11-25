import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm, FormProvider, useWatch, useFieldArray, useFormContext } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Stack, Button, Fab, Portal, Box, Typography, Alert, IconButton, Tooltip, LinearProgress, Chip, Card, CardContent } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import { useSnackbar } from 'notistack';
import { useConfirm } from '@/components/ConfirmProvider';
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
import { fmtQty, fmtMoney, fmtDate } from '@/utils/format';
import { toNum, round2, latestLcValue, maxWithTolerance, calcSpiAmount } from '@/utils/calc';
import { LC_TYPES, labelOf } from '@/utils/constants';
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
  const { data: allLcs = [] } = lcHooks.useList();
  const removeLc = lcHooks.useRemove();
  const confirm = useConfirm();
  const { enqueueSnackbar } = useSnackbar();

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
    // Read the live form value: right after reset() on edit, the watched lcType can still be stale (empty)
    // and would wipe the saved payment duration.
    if (!methods.getValues('lcType')) setValue('paymentDurationDays', '');
    else clearErrors('paymentDurationDays');
  }, [lcType, setValue, clearErrors, methods]);

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

  // Header "Open LC" button: make sure there is an LC form to fill, then scroll to it.
  const lcFieldsRef = useRef(null);
  const goToLcFields = () => {
    if (!contract) return;
    if (fields.length === 0 && availableForNew > 0) append(emptyLc(contract.currency));
    setTimeout(() => lcFieldsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };

  // LCs already saved for this contract (the one being edited lives in the form, so it is excluded here).
  const savedLcs = useMemo(() => allLcs.filter((l) => l.contractId === contractId && l.id !== id), [allLcs, contractId, id]);
  const savedValue = round2(savedLcs.reduce((a, l) => a + toNum(latestLcValue(l)), 0));
  const draftValue = round2((lcs || []).reduce((a, l) => a + toNum(l?.amount), 0));
  const contractValue = toNum(contract?.totalPrice);
  const remainingValue = round2(contractValue - savedValue - draftValue);

  const onDeleteLc = async (lc) => {
    const ok = await confirm({
      title: `Delete LC ${lc.lcNo}?`,
      message: `LC ${lc.lcNo} (SPI ${lc.spiNo}) and its amendments will be permanently deleted.`,
      confirmText: 'Delete',
      danger: true,
    });
    if (!ok) return;
    try {
      await removeLc.mutateAsync(lc.id);
      enqueueSnackbar(`LC ${lc.lcNo} deleted`, { variant: 'success' });
    } catch (e) {
      await confirm({ title: 'Could not delete', message: e.message, alertOnly: true, danger: true });
    }
  };

  const onContractChange = () => {
    if (!isEdit) setValue('lcs', [], { shouldDirty: true });
  };

  const tolerance = toNum(contract?.tolerance);

  const onSubmit = methods.handleSubmit((values) => {
    // LC qty / amount may exceed the SPI figures only within the contract tolerance.
    let outOfRange = false;
    values.lcs.forEach((l, i) => {
      const s = pi?.spis.find((x) => x.id === l.spiId);
      if (!s) return;
      const maxQty = maxWithTolerance(s.qty, tolerance);
      const maxAmount = maxWithTolerance(s.amount, tolerance);
      if (toNum(l.doneQty) > maxQty) {
        setError(`lcs.${i}.doneQty`, { type: 'custom', message: `Max allowed ${fmtQty(maxQty, contract.unit)} (SPI qty + ${tolerance}% tolerance)` });
        outOfRange = true;
      }
      if (toNum(l.amount) > maxAmount) {
        setError(`lcs.${i}.amount`, { type: 'custom', message: `Max allowed ${fmtMoney(maxAmount, l.currency)} (SPI amount + ${tolerance}% tolerance)` });
        outOfRange = true;
      }
    });
    if (outOfRange) return undefined;
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
        actions={
          isEdit && pi && totalSpis - openedCount > 0 ? (
            <Button variant="outlined" color="secondary" startIcon={<AddIcon />} onClick={() => navigate(`/lc/new?contract=${pi.contractId}`)}>
              Open LC ({totalSpis - openedCount} pending)
            </Button>
          ) : !isEdit ? (
            <Tooltip title={contract ? '' : 'Select a sales contract first'}>
              <span>
                <Button variant="contained" color="secondary" startIcon={<AddIcon />} disabled={!contract} onClick={goToLcFields}>
                  Open LC
                </Button>
              </span>
            </Tooltip>
          ) : undefined
        }
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
                {contract && (
                  <DetailGrid
                    columns={4}
                    items={[
                      { label: 'Contract Value', value: fmtMoney(contractValue, contract.currency) },
                      { label: 'LC Value Opened', value: fmtMoney(round2(savedValue + draftValue), contract.currency) },
                      { label: 'Remaining LC Value', value: fmtMoney(remainingValue, contract.currency), emphasize: true },
                      { label: 'Opened LCs', value: savedLcs.length + (lcs?.length || 0) },
                    ]}
                  />
                )}
                {contract && remainingValue < 0 && (
                  <Alert severity="warning">LC value exceeds the contract value by {fmtMoney(Math.abs(remainingValue), contract.currency)}.</Alert>
                )}
              </Stack>
            </SectionCard>

            {contract && savedLcs.length > 0 && (
              <Stack spacing={2}>
                <Typography variant="h6">Previously Opened LCs ({savedLcs.length})</Typography>
                {savedLcs.map((l) => (
                  <SectionCard
                    key={l.id}
                    title={
                      <Stack direction="row" spacing={1} alignItems="center">
                        <span>{l.lcNo}</span>
                        <Chip size="small" variant="outlined" color="secondary" label={l.spiNo} />
                      </Stack>
                    }
                    action={
                      <Stack direction="row" spacing={0.5}>
                        <Tooltip title="Edit this LC">
                          <IconButton size="small" onClick={() => navigate(`/lc/${l.id}/edit`)}>
                            <EditOutlinedIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete this LC">
                          <IconButton size="small" color="error" onClick={() => onDeleteLc(l)}>
                            <DeleteOutlineIcon />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    }
                  >
                    <DetailGrid
                      columns={4}
                      items={[
                        { label: 'LC Type', value: labelOf(LC_TYPES, l.lcType) },
                        { label: 'Payment Duration', value: l.paymentDurationDays ? `${l.paymentDurationDays} days` : '—' },
                        { label: 'Bank', value: l.bank },
                        { label: 'Insurance Cover Note', value: l.insuranceCoverNoteNo },
                        { label: 'Issue Date', value: fmtDate(l.issueDate) },
                        { label: 'Expiry Date', value: fmtDate(l.expiryDate) },
                        { label: 'LC Done Qty', value: fmtQty(l.doneQty, l.unit) },
                        { label: 'LC Amount', value: fmtMoney(l.amount, l.currency) },
                        { label: 'Amendments', value: l.amendments?.length ?? 0 },
                        { label: 'Current Value', value: fmtMoney(latestLcValue(l), l.currency), emphasize: true },
                      ]}
                    />
                  </SectionCard>
                ))}
              </Stack>
            )}

            {contract && (
              <Stack spacing={2} ref={lcFieldsRef} sx={{ scrollMarginTop: 16 }}>
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
                    tolerance={tolerance}
                    unitPrice={pi?.unitPrice}
                    onRemove={isEdit ? undefined : () => remove(i)}
                  />
                ))}
              </Stack>
            )}

            <FormActions submitting={formState.isSubmitting} onCancel={() => navigate(-1)} label={isEdit ? 'Update LC' : `Save ${fields.length || ''} LC(s)`} />
          </Stack>
        </FormProvider>
      )}
      {!loading && isEdit && (
        <DraggableFab
          title={pi && totalSpis - openedCount > 0 ? `Open LC (${totalSpis - openedCount} SPI(s) pending) · drag to move` : 'Open a new LC · drag to move'}
          onClick={() => navigate(pi && totalSpis - openedCount > 0 ? `/lc/new?contract=${pi.contractId}` : '/lc/new')}
        />
      )}
    </>
  );
}

const FAB_SIZE = 56;
const FAB_KEY = 'cims.lcFabPos';
const clampPos = (x, y) => ({
  x: Math.min(Math.max(8, x), window.innerWidth - FAB_SIZE - 8),
  y: Math.min(Math.max(8, y), window.innerHeight - FAB_SIZE - 8),
});

/** Round, icon-only floating button that can be dragged anywhere; its position is remembered. Rendered in a portal so no parent layout can hide it. */
function DraggableFab({ title, onClick }) {
  const [pos, setPos] = useState(() => {
    try {
      const p = JSON.parse(localStorage.getItem(FAB_KEY));
      return p && Number.isFinite(p.x) && Number.isFinite(p.y) ? clampPos(p.x, p.y) : null;
    } catch {
      return null;
    }
  });
  const drag = useRef(null);
  const wasDragged = useRef(false);

  const onPointerDown = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    drag.current = { dx: e.clientX - r.left, dy: e.clientY - r.top, sx: e.clientX, sy: e.clientY, moved: false };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e) => {
    const d = drag.current;
    if (!d) return;
    if (!d.moved && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) < 5) return;
    d.moved = true;
    setPos(clampPos(e.clientX - d.dx, e.clientY - d.dy));
  };
  const onPointerUp = (e) => {
    const d = drag.current;
    drag.current = null;
    if (!d?.moved) return;
    wasDragged.current = true;
    const p = clampPos(e.clientX - d.dx, e.clientY - d.dy);
    try {
      localStorage.setItem(FAB_KEY, JSON.stringify(p));
    } catch {
      /* position just won't be remembered */
    }
  };

  return (
    <Portal>
      <Tooltip title={title} placement="left">
        <Fab
          color="secondary"
          aria-label="Open LC"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onClick={() => {
            if (wasDragged.current) {
              wasDragged.current = false;
              return;
            }
            onClick();
          }}
          sx={{
            position: 'fixed',
            ...(pos ? { left: pos.x, top: pos.y } : { right: 32, bottom: 104 }),
            width: FAB_SIZE,
            height: FAB_SIZE,
            zIndex: (t) => t.zIndex.modal - 1,
            touchAction: 'none',
            cursor: 'grab',
            '&:active': { cursor: 'grabbing' },
          }}
        >
          <AddIcon />
        </Fab>
      </Tooltip>
    </Portal>
  );
}

function LcCard({ index, pi, takenSpiIds, usedInForm, currencies, unit, tolerance, unitPrice, onRemove }) {
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
    setValue(`${base}.amount`, String(calcSpiAmount(getValues(`${base}.doneQty`), unitPrice)), { shouldValidate: true });
  };

  // LC amount = LC qty × PI unit price
  const onQtyChange = (val) => setValue(`${base}.amount`, String(calcSpiAmount(val, unitPrice)), { shouldValidate: true, shouldDirty: true });

  const amount = useWatch({ control, name: `${base}.amount` });
  const maxQty = spi ? maxWithTolerance(spi.qty, tolerance) : 0;
  const maxAmount = spi ? maxWithTolerance(spi.amount, tolerance) : 0;
  const tolNote = tolerance ? ` (+${tolerance}% tolerance)` : '';
  const overQty = spi && toNum(doneQty) > maxQty;
  const overAmount = spi && toNum(amount) > maxAmount;
  const warnSx = { formHelperText: { sx: { color: 'warning.main' } } };

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
          onValueChange={onQtyChange}
          endAdornment={unit}
          helperText={
            overQty
              ? `⚠ Exceeds max ${fmtQty(maxQty, unit)}${tolNote}`
              : spi
                ? `SPI qty ${fmtQty(spi.qty, unit)}${tolerance ? ` · max ${fmtQty(maxQty, unit)}${tolNote}` : ''}`
                : undefined
          }
          slotProps={overQty ? warnSx : undefined}
        />
        <RHFText
          name={`${base}.amount`}
          label="LC Amount / Value"
          type="number"
          required
          helperText={
            overAmount
              ? `⚠ Exceeds max ${fmtMoney(maxAmount, currency)}${tolNote}`
              : `Auto: LC qty × PI unit price${unitPrice ? ` (${fmtMoney(unitPrice, currency)})` : ''}`
          }
          slotProps={{ ...(overAmount ? warnSx : {}), htmlInput: { readOnly: true } }}
        />
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
