import { useNavigate, useParams } from 'react-router-dom';
import { Button, Stack } from '@mui/material';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import PageHeader from '@/components/PageHeader';
import { SectionCard, DetailGrid, StatusChip } from '@/components/Common';
import { FileList } from '@/components/FileUploader';
import { FormSkeleton, ErrorState } from '@/components/States';
import { contractHooks } from '@/hooks/useApi';
import { fmtDate, fmtQty, fmtMoney } from '@/utils/format';
import { labelOf, PACKAGING } from '@/utils/constants';
import Can from '@/components/Can';

export default function ContractViewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: c, isLoading, isError, error, refetch } = contractHooks.useOne(id);

  if (isError) return <ErrorState error={error} onRetry={refetch} />;
  if (isLoading) return <FormSkeleton />;

  return (
    <>
      <PageHeader
        title={`Contract ${c.contractNo}`}
        subtitle={`${c.commodity} · ${fmtQty(c.totalQty, c.unit)}`}
        breadcrumbs={[{ label: 'Sales Contract', to: '/contracts' }, { label: c.contractNo }]}
        actions={
          <>
            {c.piId ? (
              <Can module="pi" action="view"><Button variant="outlined" startIcon={<ReceiptLongOutlinedIcon />} onClick={() => navigate(`/pi/${c.piId}`)}>
                View PI {c.piNo}
              </Button></Can>
            ) : (
              c.status === 'ACTIVE' && (
                <Can module="pi" action="create"><Button variant="outlined" color="secondary" startIcon={<ReceiptLongOutlinedIcon />} onClick={() => navigate(`/pi/new?contract=${c.id}`)}>
                  Open PI
                </Button></Can>
              )
            )}
            <Can module="sales_contract" action="edit"><Button variant="contained" startIcon={<EditOutlinedIcon />} onClick={() => navigate(`/contracts/${id}/edit`)}>
              Edit
            </Button></Can>
          </>
        }
      />
      <Stack spacing={3}>
        <SectionCard title="Contract Information" action={<StatusChip value={c.status} label={c.status === 'ACTIVE' ? 'Active' : 'Closed'} />}>
          <DetailGrid
            items={[
              { label: 'Contract No', value: c.contractNo, emphasize: true },
              { label: 'Contract Date', value: fmtDate(c.date) },
              { label: 'Incoterms', value: c.incoterms },
              { label: 'Tolerance', value: c.tolerance != null ? `${c.tolerance}%` : '—' },
              { label: 'Buyer', value: c.buyer },
              { label: 'Seller', value: c.seller },
              { label: 'Vessel', value: c.vesselName || 'Not assigned' },
            ]}
          />
        </SectionCard>
        <SectionCard title="Commodity & Price">
          <DetailGrid
            items={[
              { label: 'Commodity', value: c.commodity, emphasize: true },
              { label: 'Origin', value: c.origin },
              { label: 'Total Qty', value: fmtQty(c.totalQty, c.unit) },
              { label: 'Unit Price', value: fmtMoney(c.unitPrice, c.currency) },
              { label: 'Total Price', value: fmtMoney(c.totalPrice, c.currency), emphasize: true },
              { label: 'Packaging', value: labelOf(PACKAGING, c.packaging) },
              c.packaging === 'CONTAINER' && { label: 'Per Container Qty', value: fmtQty(c.perContainerQty, c.unit) },
              c.packaging === 'CONTAINER' && c.perContainerQty > 0 && { label: 'Approx. Containers', value: Math.ceil(c.totalQty / c.perContainerQty) },
              { label: 'Shipment From', value: fmtDate(c.shipmentFrom) },
              { label: 'Shipment To', value: fmtDate(c.shipmentTo) },
              { label: 'PI / SPIs', value: c.piNo ? `${c.piNo} · ${c.spiCount} SPI(s)` : 'Not opened' },
              c.remarks && { label: 'Remarks', value: c.remarks },
            ]}
          />
        </SectionCard>
        <SectionCard title="Documents">
          <FileList files={c.files} />
        </SectionCard>
      </Stack>
    </>
  );
}
