import { useNavigate, useParams, Link as RouterLink } from 'react-router-dom';
import { Button, Stack, Link, Stepper, Step, StepLabel, StepContent, Typography, Box } from '@mui/material';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import PageHeader from '@/components/PageHeader';
import { SectionCard, DetailGrid, StatusChip } from '@/components/Common';
import { FileList } from '@/components/FileUploader';
import { FormSkeleton, ErrorState, EmptyState } from '@/components/States';
import DirectionsBoatOutlinedIcon from '@mui/icons-material/DirectionsBoatOutlined';
import { lcHooks, contractHooks } from '@/hooks/useApi';
import { fmtDate, fmtQty, fmtMoney, ordinal } from '@/utils/format';
import { latestLcValue, lcStatus } from '@/utils/calc';
import { labelOf, LC_TYPES } from '@/utils/constants';
import Can from '@/components/Can';

const STATUS_LABEL = { ACTIVE: 'Active', EXPIRING: 'Expiring soon', EXPIRED: 'Expired' };

export default function LCViewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: lc, isLoading, isError, error, refetch } = lcHooks.useOne(id);
  const { data: contracts = [] } = contractHooks.useList();

  if (isError) return <ErrorState error={error} onRetry={refetch} />;
  if (isLoading) return <FormSkeleton />;
  const status = lcStatus(lc);
  const shipmentId = contracts.find((c) => c.id === lc.contractId)?.shipmentId;

  return (
    <>
      <PageHeader
        title={`${lc.lcNo}`}
        subtitle={`${lc.bank} · SPI ${lc.spiNo}`}
        breadcrumbs={[{ label: 'Letter of Credit', to: '/lc' }, { label: lc.lcNo }]}
        actions={
          <>
            {shipmentId ? (
              <Can module="shipment" action="view"><Button variant="outlined" startIcon={<DirectionsBoatOutlinedIcon />} onClick={() => navigate(`/shipments/${shipmentId}`)}>
                View Shipment
              </Button></Can>
            ) : (
              <Can module="shipment" action="create"><Button variant="outlined" color="secondary" startIcon={<DirectionsBoatOutlinedIcon />} onClick={() => navigate(`/shipments/new?contract=${lc.contractId}`)}>
                Create Shipment
              </Button></Can>
            )}
            <Can module="lc" action="edit"><Button variant="contained" startIcon={<EditOutlinedIcon />} onClick={() => navigate(`/lc/${id}/edit`)}>
              Edit
            </Button></Can>
          </>
        }
      />
      <Stack spacing={3}>
        <SectionCard title="LC Details" action={<StatusChip value={status} label={STATUS_LABEL[status]} />}>
          <DetailGrid
            columns={4}
            items={[
              { label: 'LC No', value: lc.lcNo, emphasize: true },
              { label: 'LC Type', value: labelOf(LC_TYPES, lc.lcType) },
              { label: 'Payment Duration', value: lc.paymentDurationDays ? `${lc.paymentDurationDays} days` : '—' },
              { label: 'Bank', value: lc.bank },
              { label: 'Contract No', value: <Link component={RouterLink} to={`/contracts/${lc.contractId}`}>{lc.contractNo}</Link> },
              { label: 'PI / SPI', value: <Link component={RouterLink} to={`/pi/${lc.piId}`}>{lc.spiNo}</Link> },
              { label: 'Buyer', value: lc.buyer },
              { label: 'Seller', value: lc.seller },
              { label: 'Issue Date', value: fmtDate(lc.issueDate) },
              { label: 'Expiry Date', value: fmtDate(lc.expiryDate) },
              { label: 'LC Done Qty', value: `${fmtQty(lc.doneQty, lc.unit)} of ${fmtQty(lc.spiQty, lc.unit)}` },
              { label: 'Insurance Cover Note', value: lc.insuranceCoverNoteNo },
              { label: 'Original LC Amount', value: fmtMoney(lc.amount, lc.currency) },
              { label: 'Current Value', value: fmtMoney(latestLcValue(lc), lc.currency), emphasize: true },
            ]}
          />
        </SectionCard>

        <SectionCard title={`Amendment History (${lc.amendments?.length ?? 0})`}>
          {lc.amendments?.length ? (
            <Stepper orientation="vertical" activeStep={-1} nonLinear>
              <Step completed>
                <StepLabel optional={<Typography variant="caption">{fmtDate(lc.issueDate)}</Typography>}>
                  Original LC: {fmtMoney(lc.amount, lc.currency)}
                </StepLabel>
              </Step>
              {lc.amendments.map((a) => (
                <Step key={a.seq} completed expanded>
                  <StepLabel optional={<Typography variant="caption">{fmtDate(a.date)}</Typography>}>
                    {ordinal(a.seq)} Amendment: {fmtMoney(a.value, lc.currency)}
                  </StepLabel>
                  <StepContent>
                    {a.remarks && (
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        {a.remarks}
                      </Typography>
                    )}
                    <Box sx={{ maxWidth: 520 }}>
                      <FileList files={a.files} dense />
                    </Box>
                  </StepContent>
                </Step>
              ))}
            </Stepper>
          ) : (
            <EmptyState compact title="No amendments" message="This LC has not been amended." />
          )}
        </SectionCard>

        <SectionCard title="LC Documents">
          <FileList files={lc.files} />
        </SectionCard>
      </Stack>
    </>
  );
}
