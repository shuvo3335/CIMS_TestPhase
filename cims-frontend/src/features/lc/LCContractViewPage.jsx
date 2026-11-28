import { useNavigate, useParams, Link as RouterLink } from 'react-router-dom';
import { Button, Link, Card, Box, Table, TableHead, TableBody, TableRow, TableCell, TableFooter } from '@mui/material';
import DirectionsBoatOutlinedIcon from '@mui/icons-material/DirectionsBoatOutlined';
import AddIcon from '@mui/icons-material/Add';
import PageHeader from '@/components/PageHeader';
import { SectionCard, DetailGrid, StatusChip } from '@/components/Common';
import { FormSkeleton, ErrorState, EmptyState } from '@/components/States';
import Can from '@/components/Can';
import { lcHooks, contractHooks, piHooks } from '@/hooks/useApi';
import { fmtDate, fmtQty, fmtMoney } from '@/utils/format';
import { latestLcValue, lcStatus, sumBy } from '@/utils/calc';
import { labelOf, LC_TYPES } from '@/utils/constants';

const STATUS_LABEL = { ACTIVE: 'Active', EXPIRING: 'Expiring soon', EXPIRED: 'Expired' };

/**
 * All LCs opened against one sales contract: where the user lands after opening LCs,
 * with the next step (create shipment) one click away.
 */
export default function LCContractViewPage() {
  const { contractId } = useParams();
  const navigate = useNavigate();
  const lcQuery = lcHooks.useList();
  const contractQuery = contractHooks.useOne(contractId);
  const { data: pis = [] } = piHooks.useList();

  if (lcQuery.isError || contractQuery.isError) {
    return <ErrorState error={lcQuery.error || contractQuery.error} onRetry={() => { lcQuery.refetch(); contractQuery.refetch(); }} />;
  }
  if (lcQuery.isLoading || contractQuery.isLoading) return <FormSkeleton />;

  const contract = contractQuery.data;
  const lcs = (lcQuery.data ?? []).filter((l) => l.contractId === contractId);
  const pi = pis.find((p) => p.contractId === contractId);
  const totalSpis = pi?.spis?.length ?? 0;
  const remainingSpis = Math.max(totalSpis - lcs.length, 0);
  const shipmentId = contract?.shipmentId;

  return (
    <>
      <PageHeader
        title={`Letters of Credit · ${contract?.contractNo ?? ''}`}
        subtitle={`${lcs.length} LC${lcs.length === 1 ? '' : 's'} opened${totalSpis ? ` of ${totalSpis} SPI${totalSpis === 1 ? '' : 's'}` : ''}`}
        breadcrumbs={[{ label: 'Letter of Credit', to: '/lc' }, { label: contract?.contractNo ?? '…' }]}
        actions={
          <>
            {remainingSpis > 0 && (
              <Can module="lc" action="create">
                <Button variant="outlined" startIcon={<AddIcon />} onClick={() => navigate(`/lc/new?contract=${contractId}`)}>
                  Open Remaining LC ({remainingSpis})
                </Button>
              </Can>
            )}
            {shipmentId ? (
              <Can module="shipment" action="view">
                <Button variant="contained" startIcon={<DirectionsBoatOutlinedIcon />} onClick={() => navigate(`/shipments/${shipmentId}`)}>
                  View Shipment
                </Button>
              </Can>
            ) : (
              <Can module="shipment" action="create">
                <Button variant="contained" color="secondary" startIcon={<DirectionsBoatOutlinedIcon />} onClick={() => navigate(`/shipments/new?contract=${contractId}`)}>
                  Create Shipment
                </Button>
              </Can>
            )}
          </>
        }
      />

      <SectionCard title="Contract & PI">
        <DetailGrid
          columns={4}
          items={[
            { label: 'Contract No', value: <Link component={RouterLink} to={`/contracts/${contractId}`}>{contract?.contractNo}</Link>, emphasize: true },
            { label: 'PI No', value: pi ? <Link component={RouterLink} to={`/pi/${pi.id}`}>{pi.piNo}</Link> : '—' },
            { label: 'Commodity', value: contract?.commodity },
            { label: 'Contract Qty', value: fmtQty(contract?.totalQty, contract?.unit) },
            { label: 'Buyer', value: contract?.buyer },
            { label: 'Seller', value: contract?.seller },
            { label: 'LC Done Qty', value: fmtQty(sumBy(lcs, 'doneQty'), contract?.unit) },
            { label: 'Shipment', value: shipmentId ? 'Created' : 'Not created yet' },
          ]}
        />
      </SectionCard>

      <Box sx={{ mt: 3 }}>
        <SectionCard title={`Opened LCs (${lcs.length})`}>
          {lcs.length === 0 ? (
            <EmptyState compact title="No LC opened yet" message="Open an LC against this contract's PI first." />
          ) : (
            <Card variant="outlined" sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>LC No</TableCell>
                    <TableCell>SPI No</TableCell>
                    <TableCell>LC Type</TableCell>
                    <TableCell>Bank</TableCell>
                    <TableCell align="right">LC Done Qty</TableCell>
                    <TableCell align="right">Current Value</TableCell>
                    <TableCell>Issue Date</TableCell>
                    <TableCell>Expiry Date</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {lcs.map((l) => {
                    const st = lcStatus(l);
                    return (
                      <TableRow key={l.id} hover>
                        <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
                          <Link component={RouterLink} to={`/lc/${l.id}`}>{l.lcNo}</Link>
                        </TableCell>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>{l.spiNo}</TableCell>
                        <TableCell>{labelOf(LC_TYPES, l.lcType)}</TableCell>
                        <TableCell>{l.bank}</TableCell>
                        <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>{fmtQty(l.doneQty, l.unit)}</TableCell>
                        <TableCell align="right" sx={{ whiteSpace: 'nowrap', fontWeight: 600 }}>{fmtMoney(latestLcValue(l), l.currency)}</TableCell>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>{fmtDate(l.issueDate)}</TableCell>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>{fmtDate(l.expiryDate)}</TableCell>
                        <TableCell><StatusChip value={st} label={STATUS_LABEL[st]} /></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
                {lcs.length > 1 && (
                  <TableFooter>
                    <TableRow>
                      <TableCell colSpan={4} sx={{ fontWeight: 700 }}>Total</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>{fmtQty(sumBy(lcs, 'doneQty'), contract?.unit)}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>{fmtMoney(lcs.reduce((a, l) => a + (latestLcValue(l) || 0), 0), contract?.currency)}</TableCell>
                      <TableCell colSpan={3} />
                    </TableRow>
                  </TableFooter>
                )}
              </Table>
            </Card>
          )}
        </SectionCard>
      </Box>
    </>
  );
}
