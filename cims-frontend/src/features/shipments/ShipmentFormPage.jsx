import { useEffect, useMemo } from 'react';
import { useForm, FormProvider, useWatch, useFieldArray, useFormContext } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Stack, Button, Box, Typography, Alert, IconButton, Tooltip, Table, TableHead, TableRow, TableCell, TableBody, TableFooter, Chip, Divider,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import DirectionsBoatOutlinedIcon from '@mui/icons-material/DirectionsBoatOutlined';
import AttachFileOutlinedIcon from '@mui/icons-material/AttachFileOutlined';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import PageHeader from '@/components/PageHeader';
import { SectionCard, FormGrid, Span, DetailGrid } from '@/components/Common';
import { RHFText, RHFAutocomplete } from '@/components/form/RHFFields';
import { RHFFileUploader } from '@/components/FileUploader';
import { FormSkeleton, ErrorState, EmptyState } from '@/components/States';
import { contractHooks, piHooks, shipmentHooks, useLookups } from '@/hooks/useApi';
import { useSubmit } from '@/hooks/useSubmit';
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges';
import { fmtQty, fmtMoney, fmtDateRange } from '@/utils/format';
import { sumBy, toNum, calcSpiAmount } from '@/utils/calc';
import { LOI_OPTIONS, DOC_ACCEPTANCE_OPTIONS } from '@/utils/constants';
import { FormActions } from '@/features/contracts/ContractFormPage';
import { shipmentSchema, shipmentDefaults, emptyShipmentContract, alignSpiDocs, toFormValues } from './schema';

export default function ShipmentFormPage() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const presetContractId = search.get('contract');

  const { data: contracts = [], isLoading: l1 } = contractHooks.useList();
  const { data: pis = [], isLoading: l2 } = piHooks.useList();
  const { data: lookups } = useLookups();
  const existing = shipmentHooks.useOne(id);
  const create = shipmentHooks.useCreate();
  const update = shipmentHooks.useUpdate();

  const methods = useForm({ resolver: zodResolver(shipmentSchema), defaultValues: shipmentDefaults, mode: 'onTouched' });
  const { control, reset, setError, formState } = methods;
  const { fields, append, remove } = useFieldArray({ control, name: 'contracts', keyName: 'key' });
  const submit = useSubmit(setError);
  const release = useUnsavedChanges(formState.isDirty && !formState.isSubmitSuccessful);

  useEffect(() => {
    if (existing.data && !l2) reset(toFormValues(existing.data, pis));
    // pis intentionally read once both have loaded
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existing.data, l2, reset]);

  // Opened from a contract / LC page (?contract=…): pre-select that contract and its SPI rows.
  useEffect(() => {
    if (isEdit || !presetContractId || l1 || l2) return;
    const c = contracts.find((x) => x.id === presetContractId);
    if (!c || c.shipmentId) return;
    if (methods.getValues('contracts.0.contractId')) return;
    const p = pis.find((x) => x.contractId === presetContractId);
    methods.setValue('contracts.0', { ...emptyShipmentContract(), contractId: presetContractId, spiDocs: alignSpiDocs(p) });
    // runs once the lists have loaded
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, presetContractId, l1, l2]);

  const selected = useWatch({ control, name: 'contracts' }) || [];
  const assignable = useMemo(() => contracts.filter((c) => !c.shipmentId || c.shipmentId === id), [contracts, id]);

  const onSubmit = methods.handleSubmit((values) =>
    submit(() => (isEdit ? update.mutateAsync({ id, data: values }) : create.mutateAsync(values)), {
      success: isEdit ? 'Shipment updated' : 'Shipment saved',
      onSuccess: (saved) => {
        release();
        navigate(`/shipments/${saved.id}`);
      },
    }),
  );

  if (isEdit && existing.isError) return <ErrorState error={existing.error} onRetry={existing.refetch} />;
  const loading = (isEdit && existing.isLoading) || l1 || l2;
  const unusedCount = assignable.filter((c) => !selected.some((s) => s.contractId === c.id)).length;

  return (
    <>
      <PageHeader
        title={isEdit ? `Edit Shipment: ${existing.data?.vesselName ?? ''}` : 'New Shipment'}
        subtitle="Enter vessel details, add the contracts it carries, and record BL / CI for each SPI."
        breadcrumbs={[{ label: 'Shipment', to: '/shipments' }, { label: isEdit ? 'Edit' : 'New' }]}
      />
      {loading ? (
        <FormSkeleton sections={3} />
      ) : (
        <FormProvider {...methods}>
          <Stack component="form" spacing={3} onSubmit={onSubmit} noValidate>
            <SectionCard title="Vessel Details" icon={<DirectionsBoatOutlinedIcon />}>
              <FormGrid columns={6}>
                <RHFText name="vesselName" label="Vessel Name" required placeholder="MV …" slotProps={{ htmlInput: { style: { textTransform: 'uppercase' } } }} />
                <RHFAutocomplete name="vesselType" label="Vessel Type" options={lookups?.vesselTypes ?? []} required />
                <RHFText name="imoNo" label="IMO No" required slotProps={{ htmlInput: { inputMode: 'numeric', maxLength: 7 } }} />
                <RHFText name="flag" label="Flag" required />
                <RHFText name="portOfRegistry" label="Port of Registry" />
                <RHFText name="holdHatch" label="Hold / Hatch" placeholder="e.g. 5/5" />
                <RHFText name="demurrageRate" label="Demurrage Rate" type="number" endAdornment="USD/day" />
                <RHFText name="status" label="Vessel Status" options={lookups?.vesselStatuses ?? []} required />
                <RHFText name="etc" label="Estimated Completion (ETC)" type="date" />
                <RHFText name="sld" label="Sailing Date" type="date" />
                <RHFText name="eta" label="Estimated Arrival (ETA)" type="date" required />
              </FormGrid>
            </SectionCard>

            <Stack spacing={2}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="h6">Contracts on this Vessel ({fields.length})</Typography>
                  <Typography variant="body2" color="text.secondary">
                    A vessel can carry several contracts. Each contract ships on one vessel only.
                  </Typography>
                </Box>
                <Button variant="contained" color="secondary" startIcon={<AddIcon />} disabled={unusedCount === 0} onClick={() => append(emptyShipmentContract())}>
                  Add Contract
                </Button>
              </Stack>
              {formState.errors.contracts?.root?.message && <Alert severity="error">{formState.errors.contracts.root.message}</Alert>}
              {formState.errors.contracts?.message && <Alert severity="error">{formState.errors.contracts.message}</Alert>}
              {fields.map((f, i) => (
                <ContractBlock
                  key={f.key}
                  index={i}
                  contracts={assignable}
                  pis={pis}
                  usedElsewhere={selected.filter((_, j) => j !== i).map((s) => s.contractId)}
                  onRemove={fields.length > 1 ? () => remove(i) : undefined}
                />
              ))}
            </Stack>

            <SectionCard title="Vessel Nomination" subtitle="Upload the vessel nomination file" icon={<AttachFileOutlinedIcon />}>
              <RHFFileUploader name="nominationFiles" />
            </SectionCard>

            <SectionCard title="Document Checklist" subtitle="Coming in a later release" icon={<FactCheckOutlinedIcon />}>
              <Alert severity="info" variant="outlined">
                A shipping-document checklist (e.g. phytosanitary, certificate of origin, fumigation, weight &amp; quality certificates) with per-document uploads will be added here later.
              </Alert>
            </SectionCard>

            <FormActions submitting={formState.isSubmitting} onCancel={() => navigate(-1)} label={isEdit ? 'Update Shipment' : 'Save Shipment'} />
          </Stack>
        </FormProvider>
      )}
    </>
  );
}

function ContractBlock({ index, contracts, pis, usedElsewhere, onRemove }) {
  const { control, setValue } = useFormContext();
  const base = `contracts.${index}`;
  const contractId = useWatch({ control, name: `${base}.contractId` });
  const spiDocs = useWatch({ control, name: `${base}.spiDocs` }) || [];
  const contract = contracts.find((c) => c.id === contractId);
  const pi = pis.find((p) => p.contractId === contractId);

  const options = contracts
    .filter((c) => !usedElsewhere.includes(c.id))
    .map((c) => ({
      value: c.id,
      label: `${c.contractNo} · ${c.commodity}`,
      render: (
        <Box>
          <Typography variant="body2" fontWeight={650}>
            {c.contractNo}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {c.commodity} · {fmtQty(c.totalQty, c.unit)} {c.piId ? `· ${c.spiCount} SPI(s)` : '· no PI yet'}
          </Typography>
        </Box>
      ),
    }));

  const onContractChange = (val) => {
    const p = pis.find((x) => x.contractId === val);
    setValue(`${base}.spiDocs`, alignSpiDocs(p), { shouldDirty: true });
  };

  const blTotal = sumBy(spiDocs, 'blQty');
  const ciTotal = sumBy(spiDocs, 'ciAmount');

  return (
    <SectionCard
      icon={<DescriptionOutlinedIcon />}
      title={
        <Stack direction="row" spacing={1} alignItems="center">
          <span>Contract #{index + 1}</span>
          {contract && <Chip size="small" variant="outlined" color="secondary" label={contract.contractNo} />}
        </Stack>
      }
      action={
        onRemove && (
          <Tooltip title="Remove contract from vessel">
            <IconButton color="error" size="small" onClick={onRemove}>
              <DeleteOutlineIcon />
            </IconButton>
          </Tooltip>
        )
      }
    >
      <Stack spacing={2.5}>
        <Box sx={{ maxWidth: { md: 520 } }}>
          <RHFAutocomplete name={`${base}.contractId`} label="Sales Contract No" options={options} required onValueChange={onContractChange} />
        </Box>
        {contract && (
          <DetailGrid
            columns={4}
            items={[
              { label: 'Commodity Name', value: contract.commodity, emphasize: true },
              { label: 'Contract Qty', value: fmtQty(contract.totalQty, contract.unit), emphasize: true },
              { label: 'Port of Loading (PoL)', value: pi?.pol },
              { label: 'Port of Discharge (PoD)', value: pi?.pod },
              { label: 'Seller', value: contract.seller },
              { label: 'Shipment Period', value: fmtDateRange(contract.shipmentFrom, contract.shipmentTo) },
              { label: 'PI No', value: pi?.piNo || 'Not opened' },
              { label: 'LCs', value: pi ? `${pi.lcCount} / ${pi.spis.length} opened` : '—' },
            ]}
          />
        )}

        {contract && !pi && <Alert severity="warning">This contract has no PI yet, so there are no SPIs to record BL / CI against.</Alert>}

        {contract && pi && (
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              BL &amp; Commercial Invoice per SPI
            </Typography>
            <Box sx={{ overflowX: 'auto', border: 1, borderColor: 'divider', borderRadius: 2 }}>
              <Table size="small" sx={{ minWidth: 1100, '& td': { py: 0.75, verticalAlign: 'top' } }}>
                <TableHead>
                  <TableRow>
                    <TableCell>SPI</TableCell>
                    <TableCell>LC No</TableCell>
                    <TableCell>BL No</TableCell>
                    <TableCell width={150}>BL Date</TableCell>
                    <TableCell width={140}>BL Qty ({contract.unit})</TableCell>
                    <TableCell>CI No</TableCell>
                    <TableCell width={150}>CI Date</TableCell>
                    <TableCell width={150}>CI Amount ({contract.currency})</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {spiDocs.map((d, j) => {
                    const spi = pi.spis.find((s) => s.id === d.spiId);
                    const over = spi && toNum(d.blQty) > toNum(spi.qty);
                    const p = `${base}.spiDocs.${j}`;
                    return (
                      <TableRow key={d.spiId}>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>
                          <Typography variant="body2" fontWeight={600}>
                            {spi?.spiNo}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {fmtQty(spi?.qty, contract.unit)}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>{spi?.lcNo || <Typography variant="caption" color="warning.main">LC pending</Typography>}</TableCell>
                        <TableCell>
                          <RHFText name={`${p}.blNo`} placeholder="BL No" />
                        </TableCell>
                        <TableCell>
                          <RHFText name={`${p}.blDate`} type="date" />
                        </TableCell>
                        <TableCell>
                          <RHFText
                            name={`${p}.blQty`}
                            type="number"
                            placeholder="0.00"
                            onValueChange={(v) => setValue(`${p}.ciAmount`, String(calcSpiAmount(v, pi.unitPrice)), { shouldDirty: true })}
                          />
                          {over && (
                            <Stack direction="row" spacing={0.5} alignItems="center" sx={{ color: 'warning.main', mt: 0.5 }}>
                              <WarningAmberRoundedIcon sx={{ fontSize: 14 }} />
                              <Typography variant="caption">Above SPI qty</Typography>
                            </Stack>
                          )}
                        </TableCell>
                        <TableCell>
                          <RHFText name={`${p}.ciNo`} placeholder="CI No" />
                        </TableCell>
                        <TableCell>
                          <RHFText name={`${p}.ciDate`} type="date" />
                        </TableCell>
                        <TableCell>
                          <RHFText name={`${p}.ciAmount`} type="number" placeholder="0.00" slotProps={{ input: { readOnly: true } }} />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={4} sx={{ fontWeight: 700 }}>
                      Total
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>{fmtQty(blTotal)}</TableCell>
                    <TableCell colSpan={2} />
                    <TableCell sx={{ fontWeight: 700 }}>{fmtMoney(ciTotal)}</TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </Box>
          </Box>
        )}

        {contract && (
          <>
            <Divider />
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
                Import Status (shown in Vessel Report)
              </Typography>
              <FormGrid columns={4}>
                <RHFText name={`${base}.loi`} label="LOI" options={LOI_OPTIONS} />
                <RHFText name={`${base}.loiDate`} label="LOI Date" type="date" />
                <RHFText name={`${base}.docPaymentAcceptance`} label="Doc Payment Acceptance" options={DOC_ACCEPTANCE_OPTIONS} />
                <RHFText name={`${base}.docPaymentDate`} label="Acceptance Date" type="date" />
                <RHFText name={`${base}.dutyPaidQty`} label="Duty Paid Qty" type="number" endAdornment={contract.unit} helperText={`Max ${fmtQty(blTotal)} (total BL qty)`} />
                <RHFText name={`${base}.dischargePermissionQty`} label="Discharge Permission Qty" type="number" endAdornment={contract.unit} />
                <Span cols={2}>
                  <RHFText name={`${base}.remarks`} label="Remarks" />
                </Span>
              </FormGrid>
            </Box>
          </>
        )}
        {!contract && <EmptyState compact title="Select a contract" message="Pick a sales contract carried by this vessel." />}
      </Stack>
    </SectionCard>
  );
}
