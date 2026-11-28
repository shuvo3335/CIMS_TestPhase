import { useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import { Button, Card, Box, Typography, Stack, TextField, MenuItem, Table, TableHead, TableBody, TableRow, TableCell, TableFooter } from '@mui/material';
import PrintOutlinedIcon from '@mui/icons-material/PrintOutlined';
import PageHeader from '@/components/PageHeader';
import { StatusChip } from '@/components/Common';
import { FormSkeleton, ErrorState } from '@/components/States';
import { useVesselDetail, shipmentHooks } from '@/hooks/useApi';
import { fmtDate, fmtQty, fmtMoney, fmtDateRange } from '@/utils/format';
import { sumBy } from '@/utils/calc';
import { labelOf, LOI_OPTIONS, DOC_ACCEPTANCE_OPTIONS } from '@/utils/constants';

const PAGE_STYLE = `
  @page { size: A4 landscape; margin: 12mm 10mm 14mm;
    @bottom-right { content: "Page " counter(page) " of " counter(pages); font: 9px Inter, sans-serif; color: #5B6B82; }
  }
  html, body { background: #fff !important; }
  .print-root { color: #16233A !important; font-size: 10.5px; }
  .print-root table { width: 100%; border-collapse: collapse; }
  .print-root th, .print-root td { border: 1px solid #CBD3DF !important; padding: 4px 6px !important; font-size: 10px !important; color: #16233A !important; background: #fff !important; }
  .print-root th { background: #EEF2F7 !important; }
  .print-root .avoid-break { break-inside: avoid; }
`;

export default function VesselDetailPage() {
  const { shipmentId } = useParams();
  const navigate = useNavigate();
  const printRef = useRef(null);
  const { data: shipments = [] } = shipmentHooks.useList();
  const { data, isLoading, isError, error, refetch } = useVesselDetail(shipmentId);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: data ? `Vessel Report - ${data.shipment.vesselName} - ${new Date().toISOString().slice(0, 10)}` : 'Vessel Report',
    pageStyle: PAGE_STYLE,
  });

  return (
    <>
      <PageHeader
        title="Single Vessel Report"
        subtitle="Contract-level summary with the full SPI → LC → BL → CI breakdown"
        breadcrumbs={[{ label: 'Reports' }, { label: 'Vessel Report', to: '/reports/vessels' }, { label: data?.shipment.vesselName ?? '…' }]}
        actions={
          <>
            <TextField select label="Vessel" value={shipments.some((s) => s.id === shipmentId) ? shipmentId : ''} onChange={(e) => navigate(`/reports/vessels/${e.target.value}`)} sx={{ minWidth: 240 }}>
              {shipments.map((s) => (
                <MenuItem key={s.id} value={s.id}>
                  {s.vesselName} · {s.status}
                </MenuItem>
              ))}
            </TextField>
            <Button variant="contained" startIcon={<PrintOutlinedIcon />} onClick={() => handlePrint()} disabled={!data}>
              Print
            </Button>
          </>
        }
      />
      {isError ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : isLoading ? (
        <FormSkeleton />
      ) : (
        <Card sx={{ p: { xs: 2, md: 3 }, overflowX: 'auto' }}>
          <Box ref={printRef} className="print-root" sx={{ minWidth: 960 }}>
            <PrintableReport data={data} />
          </Box>
        </Card>
      )}
    </>
  );
}

/** One "label ........ value" line of the report's information sections. */
const InfoRow = ({ label, value }) => (
  <Box sx={{ display: 'grid', gridTemplateColumns: '42% 1fr', columnGap: 1.5, py: 0.6, borderBottom: '1px dotted', borderColor: 'divider' }}>
    <Typography variant="body2" color="text.secondary">
      {label}
    </Typography>
    <Typography variant="body2" fontWeight={650} sx={{ wordBreak: 'break-word' }}>
      {value || '—'}
    </Typography>
  </Box>
);

const InfoGroup = ({ title, children }) => (
  <Box>
    <Typography variant="overline" color="text.secondary" display="block" sx={{ lineHeight: 1.6, mb: 0.25 }}>
      {title}
    </Typography>
    {children}
  </Box>
);

/** Seller / buyer details for the vessel; one block per distinct seller+buyer pair (a vessel can carry several contracts). */
function PartiesInfo({ rows }) {
  const groups = [];
  rows.forEach((r) => {
    const key = `${r.sellerName}|${r.buyerName}`;
    const g = groups.find((x) => x.key === key);
    if (g) g.contractNos.push(r.contractNo);
    else groups.push({ key, row: r, contractNos: [r.contractNo] });
  });
  return (
    <>
      {groups.map(({ key, row, contractNos }) => (
        <InfoGroup key={key} title={groups.length > 1 ? `Seller & Buyer · ${contractNos.join(', ')}` : 'Seller & Buyer'}>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gridTemplateRows: 'repeat(2, auto)', gridAutoFlow: 'column', columnGap: 4 }}>
            <InfoRow label="Seller Name" value={row.sellerName} />
            <InfoRow label="Buyer Name" value={row.buyerName} />
            <InfoRow label="Buyer IRC No" value={row.buyerIrcNo} />
            <InfoRow label="Buyer TIN No" value={row.buyerTinNo} />
            <InfoRow label="Buyer BIN No" value={row.buyerBinNo} />
          </Box>
        </InfoGroup>
      ))}
    </>
  );
}

function PrintableReport({ data }) {
  const { shipment: s, rows } = data;
  const sum = (f) => sumBy(rows, f);

  return (
    <Stack spacing={2.5}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ borderBottom: 2, borderColor: 'secondary.main', pb: 1.5 }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box component="img" src="/favicon.svg" alt="" sx={{ width: 40, height: 40 }} />
          <Box>
            <Typography variant="h6" lineHeight={1.2}>
              {import.meta.env.VITE_COMPANY_NAME || 'CIMS'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Vessel-wise Import Report
            </Typography>
          </Box>
        </Stack>
        <Box sx={{ textAlign: 'right' }}>
          <Typography variant="caption" color="text.secondary" display="block">
            Generated
          </Typography>
          <Typography variant="body2" fontWeight={600}>
            {new Date().toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}
          </Typography>
        </Box>
      </Stack>

      <Box className="avoid-break">
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ pb: 1, mb: 1.5, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="h5">{s.vesselName}</Typography>
          <StatusChip value={s.status} />
        </Stack>
        <Stack spacing={2}>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', columnGap: 4 }}>
            <InfoGroup title="Vessel Particulars">
              <InfoRow label="Vessel Type" value={s.vesselType} />
              <InfoRow label="IMO No" value={s.imoNo} />
              <InfoRow label="Flag" value={s.flag} />
              <InfoRow label="Port of Registry" value={s.portOfRegistry} />
              <InfoRow label="Hold / Hatch" value={s.holdHatch} />
              <InfoRow label="Demurrage Rate" value={s.demurrageRate != null ? `${fmtMoney(s.demurrageRate, 'USD')}/day` : null} />
            </InfoGroup>
            <InfoGroup title="Voyage Schedule">
              <InfoRow label="ETC" value={fmtDate(s.etc)} />
              {/* <InfoRow label="Shipping Date" value={fmtDate(s.spd)} /> */}
              <InfoRow label="Sailing Date" value={fmtDate(s.sld)} />
              <InfoRow label="ETA / Arrival" value={fmtDate(s.eta)} />
            </InfoGroup>
            <InfoGroup title="Cargo Summary">
              <InfoRow label="Contracts" value={String(rows.length)} />
              <InfoRow label="Total Contract Qty" value={fmtQty(sum('contractQty'))} />
              <InfoRow label="Total BL Qty" value={fmtQty(sum('blQty'))} />
              <InfoRow label="Total LC Pending" value={fmtQty(sum('lcPendingQty'))} />
            </InfoGroup>
          </Box>
          <PartiesInfo rows={rows} />
        </Stack>
      </Box>

      <Box className="avoid-break">
        <Typography variant="subtitle1" sx={{ mb: 1 }}>
          Contract Summary
        </Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              {['Contract No', 'Commodity', 'Shipment Date Range', 'Contract Qty', 'BL Qty', 'LC Done Qty', 'LC Pending Qty', 'LOI', 'Doc Payment Acceptance', 'Duty Paid Qty', 'Discharge Permission Qty', 'Remarks'].map((h) => (
                <TableCell key={h} align={/Qty/.test(h) ? 'right' : 'left'}>
                  {h}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell sx={{ fontWeight: 600 }}>{r.contractNo}</TableCell>
                <TableCell>{r.commodity}</TableCell>
                <TableCell>{fmtDateRange(r.shipmentFrom, r.shipmentTo)}</TableCell>
                <TableCell align="right">{fmtQty(r.contractQty)}</TableCell>
                <TableCell align="right">{fmtQty(r.blQty)}</TableCell>
                <TableCell align="right">{fmtQty(r.lcDoneQty)}</TableCell>
                <TableCell align="right">{fmtQty(r.lcPendingQty)}</TableCell>
                <TableCell>{labelOf(LOI_OPTIONS, r.loi)}{r.loiDate ? ` (${fmtDate(r.loiDate)})` : ''}</TableCell>
                <TableCell>{labelOf(DOC_ACCEPTANCE_OPTIONS, r.docPaymentAcceptance)}{r.docPaymentDate ? ` (${fmtDate(r.docPaymentDate)})` : ''}</TableCell>
                <TableCell align="right">{fmtQty(r.dutyPaidQty)}</TableCell>
                <TableCell align="right">{fmtQty(r.dischargePermissionQty)}</TableCell>
                <TableCell>{r.remarks || '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
          {rows.length > 1 && (
            <TableFooter>
              <TableRow>
                <TableCell colSpan={3} sx={{ fontWeight: 700 }}>
                  Total
                </TableCell>
                {['contractQty', 'blQty', 'lcDoneQty', 'lcPendingQty'].map((f) => (
                  <TableCell key={f} align="right" sx={{ fontWeight: 700 }}>
                    {fmtQty(sum(f))}
                  </TableCell>
                ))}
                <TableCell colSpan={2} />
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  {fmtQty(sum('dutyPaidQty'))}
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  {fmtQty(sum('dischargePermissionQty'))}
                </TableCell>
                <TableCell />
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </Box>

      {rows.map((r) => (
        <Box key={r.id} className="avoid-break">
          <Typography variant="subtitle1" sx={{ mb: 0.5 }}>
            {r.contractNo}: SPI Breakdown
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
            {r.commodity} · Origin {r.origin} · PoL {r.pol || '—'} → PoD {r.pod || '—'}
          </Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                {['SPI No', 'SPI Qty', 'LC No', 'Bank', 'LC Done Qty', 'LC Value', 'Amend.', 'Insurance Cover Note', 'BL No', 'BL Date', 'BL Qty', 'CI No', 'CI Amount'].map((h) => (
                  <TableCell key={h} align={/Qty|Value|Amount|Amend/.test(h) ? 'right' : 'left'}>
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {r.spiRows.map((x) => (
                <TableRow key={x.spiId}>
                  <TableCell>{x.spiNo}</TableCell>
                  <TableCell align="right">{fmtQty(x.spiQty)}</TableCell>
                  <TableCell>{x.lcNo || 'Pending'}</TableCell>
                  <TableCell>{x.lcBank || '—'}</TableCell>
                  <TableCell align="right">{fmtQty(x.lcDoneQty)}</TableCell>
                  <TableCell align="right">{fmtMoney(x.lcValue, x.lcCurrency)}</TableCell>
                  <TableCell align="right">{x.amendments || '—'}</TableCell>
                  <TableCell>{x.insuranceCoverNoteNo || '—'}</TableCell>
                  <TableCell>{x.blNo || '—'}</TableCell>
                  <TableCell>{fmtDate(x.blDate)}</TableCell>
                  <TableCell align="right">{fmtQty(x.blQty)}</TableCell>
                  <TableCell>{x.ciNo || '—'}</TableCell>
                  <TableCell align="right">{fmtMoney(x.ciAmount)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Total</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  {fmtQty(sumBy(r.spiRows, 'spiQty'))}
                </TableCell>
                <TableCell colSpan={2} />
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  {fmtQty(sumBy(r.spiRows, 'lcDoneQty'))}
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  {fmtMoney(sumBy(r.spiRows, 'lcValue'))}
                </TableCell>
                <TableCell colSpan={4} />
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  {fmtQty(sumBy(r.spiRows, 'blQty'))}
                </TableCell>
                <TableCell />
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  {fmtMoney(sumBy(r.spiRows, 'ciAmount'))}
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </Box>
      ))}

      <Typography variant="caption" color="text.secondary" sx={{ pt: 1, borderTop: 1, borderColor: 'divider' }}>
        LC pending qty = contract qty − Σ LC done qty. BL qty is the sum of BL quantities recorded per SPI.
      </Typography>
    </Stack>
  );
}
