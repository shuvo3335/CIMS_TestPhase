import { useEffect } from 'react';
import { useForm, FormProvider, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Stack, Alert } from '@mui/material';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import HandshakeOutlinedIcon from '@mui/icons-material/HandshakeOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import AttachFileOutlinedIcon from '@mui/icons-material/AttachFileOutlined';
import PageHeader from '@/components/PageHeader';
import { SectionCard, FormGrid, Span, ReadOnlyField } from '@/components/Common';
import { RHFText, RHFAutocomplete } from '@/components/form/RHFFields';
import { RHFFileUploader } from '@/components/FileUploader';
import { FormSkeleton, ErrorState } from '@/components/States';
import { contractHooks, useLookups } from '@/hooks/useApi';
import { useSubmit } from '@/hooks/useSubmit';
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges';
import { calcTotalPrice } from '@/utils/calc';
import { fmtMoney } from '@/utils/format';
import { PACKAGING, UNITS, CONTRACT_STATUS } from '@/utils/constants';
import { contractSchema, contractDefaults, toFormValues } from './schema';

export default function ContractFormPage() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { data: lookups } = useLookups();
  const existing = contractHooks.useOne(id);
  const create = contractHooks.useCreate();
  const update = contractHooks.useUpdate();

  const methods = useForm({ resolver: zodResolver(contractSchema), defaultValues: contractDefaults, mode: 'onTouched' });
  const { control, reset, setError, formState } = methods;
  const submit = useSubmit(setError);
  const release = useUnsavedChanges(formState.isDirty && !formState.isSubmitSuccessful);

  useEffect(() => {
    if (existing.data) reset(toFormValues(existing.data));
  }, [existing.data, reset]);

  const [qty, price, currency, packaging, buyer] = useWatch({ control, name: ['totalQty', 'unitPrice', 'currency', 'packaging', 'buyer'] });
  const selectedBuyer = (lookups?.buyers ?? []).find((b) => b.name === buyer);
  // Keep a contract's existing buyer selectable even if it isn't in the Settings buyer list.
  const buyerOptions = (() => {
    const names = (lookups?.buyers ?? []).map((b) => b.name);
    return buyer && !names.includes(buyer) ? [buyer, ...names] : names;
  })();
  const totalPrice = calcTotalPrice(qty, price);

  const onSubmit = methods.handleSubmit((values) =>
    submit(() => (isEdit ? update.mutateAsync({ id, data: values }) : create.mutateAsync(values)), {
      success: isEdit ? 'Sales contract updated' : 'Sales contract saved',
      onSuccess: (saved) => {
        release();
        navigate(`/contracts/${saved.id}`);
      },
    }),
  );

  if (isEdit && existing.isError) return <ErrorState error={existing.error} onRetry={existing.refetch} />;

  const crumbs = [{ label: 'Sales Contract', to: '/contracts' }, { label: isEdit ? 'Edit' : 'New' }];
  return (
    <>
      <PageHeader
        title={isEdit ? `Edit Contract ${existing.data?.contractNo ?? ''}` : 'New Sales Contract'}
        subtitle="Enter the sales contract details and attach the signed contract."
        breadcrumbs={crumbs}
      />
      {isEdit && existing.isLoading ? (
        <FormSkeleton sections={3} />
      ) : (
        <FormProvider {...methods}>
          <Stack component="form" spacing={3} onSubmit={onSubmit} noValidate>
            {isEdit && existing.data?.piId && (
              <Alert severity="info">This contract already has a PI ({existing.data.piNo}), so its total quantity is locked.</Alert>
            )}
            <SectionCard title="Contract Information" icon={<HandshakeOutlinedIcon />}>
              <FormGrid columns={4}>
                <RHFText name="contractNo" label="Contract No" required />
                <RHFText name="date" label="Contract Date" type="date" required />
                <RHFText name="status" label="Status" options={CONTRACT_STATUS} required />
                <RHFAutocomplete
                  name="buyer"
                  label="Buyer Name"
                  options={buyerOptions}
                  required
                  helperText={buyerOptions.length === 0 ? 'No buyers yet — add them in Settings' : undefined}
                />
                <ReadOnlyField label="IRC No" value={selectedBuyer?.ircNo || '—'} />
                <ReadOnlyField label="TIN No" value={selectedBuyer?.tinNo || '—'} />
                <ReadOnlyField label="BIN No" value={selectedBuyer?.binNo || '—'} />
                <RHFText name="seller" label="Seller Name" required />
                <RHFText name="tolerance" label="Tolerance (%)" type="number" />
                <RHFAutocomplete name="incoterms" label="Incoterms" options={lookups?.incoterms ?? []} required />
              </FormGrid>
            </SectionCard>

            <SectionCard title="Commodity Information" icon={<Inventory2OutlinedIcon />}>
              <FormGrid>
                <RHFText name="commodity" label="Commodity Name" required placeholder="e.g. BULGARIAN WHEAT" slotProps={{ htmlInput: { style: { textTransform: 'uppercase' } } }} />
                <RHFText name="origin" label="Origin" required />
                <FormGrid columns={2}>
                  <RHFText name="totalQty" label="Total Qty" type="number" required disabled={isEdit && !!existing.data?.piId} />
                  <RHFText name="unit" label="Unit" options={UNITS} required />
                </FormGrid>
                <FormGrid columns={2}>
                  <RHFText name="unitPrice" label="Unit Price" type="number" required />
                  <RHFText name="currency" label="Currency" options={lookups?.currencies ?? ['USD']} required />
                </FormGrid>
                <ReadOnlyField label="Total Price" value={fmtMoney(totalPrice, currency)} emphasize />
                <span />
                <RHFText name="packaging" label="Packaging" options={PACKAGING} required />
                {packaging === 'CONTAINER' && (
                  <RHFText name="perContainerQty" label="Per Container Qty" type="number" required endAdornment={methods.getValues('unit')} />
                )}
              </FormGrid>
            </SectionCard>

            <SectionCard title="Shipment Period" icon={<LocalShippingOutlinedIcon />}>
              <FormGrid>
                <RHFText name="shipmentFrom" label="Shipment From" type="date" required />
                <RHFText name="shipmentTo" label="Shipment To" type="date" required />
                <Span>
                  <RHFText name="remarks" label="Remarks" multiline minRows={2} />
                </Span>
              </FormGrid>
            </SectionCard>

            <SectionCard title="Sales Contract Document" subtitle="Upload the signed sales contract and any annexures" icon={<AttachFileOutlinedIcon />}>
              <RHFFileUploader name="files" />
            </SectionCard>

            <FormActions submitting={formState.isSubmitting} onCancel={() => navigate(-1)} label={isEdit ? 'Update Contract' : 'Save Contract'} />
          </Stack>
        </FormProvider>
      )}
    </>
  );
}

export function FormActions({ submitting, onCancel, label = 'Save' }) {
  return (
    <Stack
      direction="row"
      spacing={1.5}
      justifyContent="flex-end"
      sx={(t) => ({ position: 'sticky', bottom: 0, py: 2, zIndex: 4, bgcolor: t.palette.background.default, borderTop: `1px solid ${t.palette.divider}` })}
    >
      <Button color="inherit" onClick={onCancel}>
        Cancel
      </Button>
      <Button type="submit" variant="contained" size="large" startIcon={<SaveOutlinedIcon />} disabled={submitting}>
        {submitting ? 'Saving…' : label}
      </Button>
    </Stack>
  );
}
