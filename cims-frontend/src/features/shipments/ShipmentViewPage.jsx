import { useNavigate, useParams, Link as RouterLink } from 'react-router-dom';
import { Button, Stack, Link, Table, TableHead, TableRow, TableCell, TableBody, Box } from '@mui/material';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined';
import PageHeader from '@/components/PageHeader';
import { SectionCard, DetailGrid, StatusChip } from '@/components/Common';
import { FileList } from '@/components/FileUploader';
import { FormSkeleton, ErrorState } from '@/components/States';
import { shipmentHooks, piHooks } from '@/hooks/useApi';
import { fmtDate, fmtQty, fmtMoney } from '@/utils/format';
import { sumBy } from '@/utils/calc';
import { labelOf, LOI_OPTIONS, DOC_ACCEPTANCE_OPTIONS } from '@/utils/constants';
import Can from '@/components/Can';

export default function ShipmentViewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: s, isLoading, isError, error, refetch } = shipmentHooks.useOne(id);
  const { data: pis = [] } = piHooks.useList();

  if (isError) return <ErrorState error={error} onRetry={refetch} />;
  if (isLoading) return <FormSkeleton />;

  return (
    <>
      <PageHeader
        title={s.vesselName}
        subtitle={`${s.vesselType} · IMO ${s.imoNo} · ${s.contracts.length} contract(s)`}
        breadcrumbs={[{ label: 'Shipment', to: '/shipments' }, { label: s.vesselName }]}
        actions={
          <>
            <Can module="reports" action="view"><Button variant="outlined" startIcon={<AssessmentOutlinedIcon />} onClick={() => navigate(`/reports/vessels/${id}`)}>
              Vessel Report
            </Button></Can>
            <Can module="shipment" action="edit"><Button variant="contained" startIcon={<EditOutlinedIcon />} onClick={() => navigate(`/shipments/${id}/edit`)}>
              Edit
            </Button></Can>
          </>
        }
      />
      <Stack spacing={3}>
        <SectionCard title="Vessel Details" action={<StatusChip value={s.status} />}>
          <DetailGrid
            columns={4}
            items={[
              { label: 'Vessel Name', value: s.vesselName, emphasize: true },
              { label: 'Vessel Type', value: s.vesselType },
              { label: 'IMO No', value: s.imoNo },
              { label: 'Flag', value: s.flag },
              { label: 'Port of Registry', value: s.portOfRegistry },
              { label: 'Hold / Hatch', value: s.holdHatch },
              { label: 'Demurrage Rate', value: s.demurrageRate != null ? `${fmtMoney(s.demurrageRate, 'USD')} / day` : '—' },
              { label: 'Total BL Qty', value: fmtQty(s.totalBlQty) },
              { label: 'ETC', value: fmtDate(s.etc) },
              { label: 'Shipping Date', value: fmtDate(s.spd) },
              { label: 'Sailing Date', value: fmtDate(s.sld) },
              { label: 'ETA', value: fmtDate(s.eta), emphasize: true },
            ]}
          />
        </SectionCard>

        {s.contracts.map((c) => {
          const pi = pis.find((p) => p.contractId === c.contractId);
          return (
            <SectionCard key={c.contractId} title={`Contract ${c.contractNo}`} subtitle={`${c.commodity} · ${fmtQty(c.contractQty, c.unit)}`}>
              <Stack spacing={2}>
                <DetailGrid
                  columns={4}
                  items={[
                    { label: 'Contract', value: <Link component={RouterLink} to={`/contracts/${c.contractId}`}>{c.contractNo}</Link> },
                    { label: 'PoL', value: pi?.pol },
                    { label: 'PoD', value: pi?.pod },
                    { label: 'Total BL Qty', value: fmtQty(sumBy(c.spiDocs, 'blQty'), c.unit) },
                    { label: 'LOI', value: `${labelOf(LOI_OPTIONS, c.loi)}${c.loiDate ? ` · ${fmtDate(c.loiDate)}` : ''}` },
                    { label: 'Doc Payment Acceptance', value: `${labelOf(DOC_ACCEPTANCE_OPTIONS, c.docPaymentAcceptance)}${c.docPaymentDate ? ` · ${fmtDate(c.docPaymentDate)}` : ''}` },
                    { label: 'Duty Paid Qty', value: fmtQty(c.dutyPaidQty, c.unit) },
                    { label: 'Discharge Permission Qty', value: fmtQty(c.dischargePermissionQty, c.unit) },
                    c.remarks && { label: 'Remarks', value: c.remarks },
                  ]}
                />
                <Box sx={{ overflowX: 'auto', border: 1, borderColor: 'divider', borderRadius: 2 }}>
                  <Table size="small" sx={{ minWidth: 900 }}>
                    <TableHead>
                      <TableRow>
                        <TableCell>SPI</TableCell>
                        <TableCell>LC No</TableCell>
                        <TableCell>BL No</TableCell>
                        <TableCell>BL Date</TableCell>
                        <TableCell align="right">BL Qty</TableCell>
                        <TableCell>CI No</TableCell>
                        <TableCell>CI Date</TableCell>
                        <TableCell align="right">CI Amount</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {c.spiDocs.map((d) => {
                        const spi = pi?.spis.find((x) => x.id === d.spiId);
                        return (
                          <TableRow key={d.spiId} hover>
                            <TableCell>{spi?.spiNo ?? '—'}</TableCell>
                            <TableCell>{spi?.lcNo ?? '—'}</TableCell>
                            <TableCell>{d.blNo || '—'}</TableCell>
                            <TableCell>{fmtDate(d.blDate)}</TableCell>
                            <TableCell align="right">{fmtQty(d.blQty)}</TableCell>
                            <TableCell>{d.ciNo || '—'}</TableCell>
                            <TableCell>{fmtDate(d.ciDate)}</TableCell>
                            <TableCell align="right">{fmtMoney(d.ciAmount)}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </Box>
              </Stack>
            </SectionCard>
          );
        })}

        <SectionCard title="Vessel Nomination">
          <FileList files={s.nominationFiles} />
        </SectionCard>
      </Stack>
    </>
  );
}
