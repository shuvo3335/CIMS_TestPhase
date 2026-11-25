import { useNavigate, useParams, Link as RouterLink } from 'react-router-dom';
import { Button, Stack, Table, TableHead, TableRow, TableCell, TableBody, TableFooter, Link, Box } from '@mui/material';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import AccountBalanceOutlinedIcon from '@mui/icons-material/AccountBalanceOutlined';
import PageHeader from '@/components/PageHeader';
import { SectionCard, DetailGrid, StatusChip } from '@/components/Common';
import { FileList } from '@/components/FileUploader';
import { FormSkeleton, ErrorState } from '@/components/States';
import { piHooks } from '@/hooks/useApi';
import { fmtDate, fmtQty, fmtMoney } from '@/utils/format';
import { labelOf, LC_TYPES } from '@/utils/constants';

export default function PIViewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: pi, isLoading, isError, error, refetch } = piHooks.useOne(id);

  if (isError) return <ErrorState error={error} onRetry={refetch} />;
  if (isLoading) return <FormSkeleton />;
  const pendingLc = pi.spis.length - pi.lcCount;

  return (
    <>
      <PageHeader
        title={`PI ${pi.piNo}`}
        subtitle={`${pi.commodity} · ${pi.spis.length} SPI(s) · ${pi.lcCount} LC(s) opened`}
        breadcrumbs={[{ label: 'Proforma Invoice', to: '/pi' }, { label: pi.piNo }]}
        actions={
          <>
            {pi.lcCount > 0 && (
              <Button variant="outlined" startIcon={<AccountBalanceOutlinedIcon />} onClick={() => navigate(`/lc?contract=${pi.contractId}`)}>
                View LCs ({pi.lcCount})
              </Button>
            )}
            {pendingLc > 0 && (
              <Button variant="outlined" color="secondary" startIcon={<AccountBalanceOutlinedIcon />} onClick={() => navigate(`/lc/new?contract=${pi.contractId}`)}>
                Open LC ({pendingLc} pending)
              </Button>
            )}
            <Button variant="contained" startIcon={<EditOutlinedIcon />} onClick={() => navigate(`/pi/${id}/edit`)}>
              Edit
            </Button>
          </>
        }
      />
      <Stack spacing={3}>
        <SectionCard title="PI Details">
          <DetailGrid
            columns={4}
            items={[
              { label: 'Contract No', value: <Link component={RouterLink} to={`/contracts/${pi.contractId}`}>{pi.contractNo}</Link> },
              { label: 'PI No', value: pi.piNo, emphasize: true },
              { label: 'Buyer', value: pi.buyer },
              { label: 'Seller', value: pi.seller },
              { label: 'Commodity', value: pi.commodity },
              { label: 'Origin', value: pi.origin },
              { label: 'Contract Qty', value: fmtQty(pi.contractQty, pi.unit) },
              { label: 'SPI Unit Price', value: fmtMoney(pi.unitPrice, pi.currency) },
              { label: 'LC Type', value: labelOf(LC_TYPES, pi.lcType) },
              { label: 'SPI Date', value: fmtDate(pi.spiDate) },
              { label: 'SPI Validity', value: fmtDate(pi.spiValidity) },
              { label: 'Total SPI Amount', value: fmtMoney(pi.totalSpiAmount, pi.currency), emphasize: true },
              { label: 'Port of Loading', value: pi.pol },
              { label: 'Port of Discharge', value: pi.pod },
            ]}
          />
        </SectionCard>
        <SectionCard title="SPIs" contentSx={{ p: 0, '&:last-child': { pb: 0 } }}>
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small" sx={{ minWidth: 640 }}>
              <TableHead>
                <TableRow>
                  <TableCell>#</TableCell>
                  <TableCell>SPI No</TableCell>
                  <TableCell align="right">Qty ({pi.unit})</TableCell>
                  <TableCell align="right">Amount ({pi.currency})</TableCell>
                  <TableCell>LC</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {pi.spis.map((s, i) => (
                  <TableRow key={s.id} hover>
                    <TableCell>{i + 1}</TableCell>
                    <TableCell>{s.spiNo}</TableCell>
                    <TableCell align="right">{fmtQty(s.qty)}</TableCell>
                    <TableCell align="right">{fmtMoney(s.amount)}</TableCell>
                    <TableCell>
                      {s.lcId ? (
                        <Link component={RouterLink} to={`/lc/${s.lcId}`} fontWeight={600}>
                          {s.lcNo}
                        </Link>
                      ) : (
                        <StatusChip value="PENDING" label="LC pending" />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={2} sx={{ fontWeight: 700 }}>
                    Total
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>
                    {fmtQty(pi.totalSpiQty)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>
                    {fmtMoney(pi.totalSpiAmount)}
                  </TableCell>
                  <TableCell />
                </TableRow>
              </TableFooter>
            </Table>
          </Box>
        </SectionCard>
        <SectionCard title="Documents">
          <FileList files={pi.files} />
        </SectionCard>
      </Stack>
    </>
  );
}
