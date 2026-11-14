import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TextField, MenuItem, Button } from '@mui/material';
import FilterAltOffOutlinedIcon from '@mui/icons-material/FilterAltOffOutlined';
import PrintOutlinedIcon from '@mui/icons-material/PrintOutlined';
import PageHeader from '@/components/PageHeader';
import DataGrid, { numCol, dateCol } from '@/components/DataGrid';
import { StatusChip } from '@/components/Common';
import { useVesselReport, useLookups } from '@/hooks/useApi';
import { sumBy } from '@/utils/calc';
import { fmtDateRange, fmtDate } from '@/utils/format';
import { labelOf, LOI_OPTIONS, DOC_ACCEPTANCE_OPTIONS } from '@/utils/constants';

/** Columns shared by the grid and CSV export, in the order the business asked for. */
export const reportColumns = [
  { field: 'vesselName', headerName: 'Vessel Name', pinned: 'left', minWidth: 170 },
  { field: 'contractNo', headerName: 'Contract No', minWidth: 160 },
  { field: 'commodity', headerName: 'Commodity Name', minWidth: 180 },
  { field: 'vesselStatus', headerName: 'Vessel Status', minWidth: 150, cellRenderer: (p) => (p.data?.__total ? '' : <StatusChip value={p.value} />) },
  {
    colId: 'shipmentRange',
    headerName: 'Shipment Date Range',
    minWidth: 220,
    valueGetter: (p) => (p.data?.__total ? '' : fmtDateRange(p.data.shipmentFrom, p.data.shipmentTo)),
  },
  dateCol('eta', 'ETA / Arrival'),
  numCol('contractQty', 'Contract Qty', { minWidth: 130 }),
  numCol('blQty', 'BL Qty'),
  numCol('lcDoneQty', 'LC Done Qty', { minWidth: 130 }),
  numCol('lcPendingQty', 'LC Pending Qty', {
    minWidth: 140,
    cellStyle: (p) => (p.value > 0 ? { color: 'var(--ag-pending-color, #E69A1A)', fontWeight: 650 } : null),
  }),
  {
    field: 'loi',
    headerName: 'LOI',
    minWidth: 120,
    valueFormatter: (p) => (p.data?.__total ? '' : `${labelOf(LOI_OPTIONS, p.value)}${p.data?.loiDate ? ` (${fmtDate(p.data.loiDate)})` : ''}`),
  },
  {
    field: 'docPaymentAcceptance',
    headerName: 'Doc Payment Acceptance',
    minWidth: 190,
    valueFormatter: (p) => (p.data?.__total ? '' : `${labelOf(DOC_ACCEPTANCE_OPTIONS, p.value)}${p.data?.docPaymentDate ? ` (${fmtDate(p.data.docPaymentDate)})` : ''}`),
  },
  numCol('dutyPaidQty', 'Duty Paid Qty', { minWidth: 130 }),
  numCol('dischargePermissionQty', 'Discharge Permission Qty', { minWidth: 190 }),
  { field: 'remarks', headerName: 'Remarks', minWidth: 220, tooltipField: 'remarks' },
];

const QTY_FIELDS = ['contractQty', 'blQty', 'lcDoneQty', 'lcPendingQty', 'dutyPaidQty', 'dischargePermissionQty'];

export default function VesselReportPage() {
  const navigate = useNavigate();
  const { data = [], isLoading } = useVesselReport();
  const { data: lookups } = useLookups();
  const [status, setStatus] = useState('');
  const [commodity, setCommodity] = useState('');
  const [etaFrom, setEtaFrom] = useState('');
  const [etaTo, setEtaTo] = useState('');

  const commodities = useMemo(() => [...new Set(data.map((r) => r.commodity).filter(Boolean))].sort(), [data]);

  const rows = useMemo(
    () =>
      data.filter(
        (r) =>
          (!status || r.vesselStatus === status) &&
          (!commodity || r.commodity === commodity) &&
          (!etaFrom || (r.eta && r.eta >= etaFrom)) &&
          (!etaTo || (r.eta && r.eta <= etaTo)),
      ),
    [data, status, commodity, etaFrom, etaTo],
  );

  const totals = useMemo(
    () => (rows.length ? [{ __total: true, vesselName: `Total (${rows.length})`, ...Object.fromEntries(QTY_FIELDS.map((f) => [f, sumBy(rows, f)])) }] : undefined),
    [rows],
  );

  const filtered = status || commodity || etaFrom || etaTo;

  return (
    <>
      <PageHeader
        title="Vessel-wise Import Report"
        subtitle="One row per vessel and contract. Click a row to open the single-vessel report and print it."
        breadcrumbs={[{ label: 'Reports' }, { label: 'Vessel Report' }]}
        actions={
          rows[0] && (
            <Button variant="outlined" startIcon={<PrintOutlinedIcon />} onClick={() => navigate(`/reports/vessels/${rows[0].shipmentId}`)}>
              Single Vessel View
            </Button>
          )
        }
      />
      <DataGrid
        rowData={rows}
        loading={isLoading}
        columnDefs={reportColumns}
        pinnedBottomRowData={totals}
        exportFileName={`vessel-report-${new Date().toISOString().slice(0, 10)}`}
        emptyText="No vessels in the report"
        onRowClicked={(r) => navigate(`/reports/vessels/${r.shipmentId}`)}
        onView={(r) => navigate(`/reports/vessels/${r.shipmentId}`)}
        getRowId={(p) => p.data.id}
        toolbar={
          <>
            <TextField select label="Vessel Status" value={status} onChange={(e) => setStatus(e.target.value)} sx={{ width: 180 }}>
              <MenuItem value="">All</MenuItem>
              {(lookups?.vesselStatuses ?? []).map((s) => (
                <MenuItem key={s} value={s}>
                  {s}
                </MenuItem>
              ))}
            </TextField>
            <TextField select label="Commodity" value={commodity} onChange={(e) => setCommodity(e.target.value)} sx={{ width: 200 }}>
              <MenuItem value="">All</MenuItem>
              {commodities.map((c) => (
                <MenuItem key={c} value={c}>
                  {c}
                </MenuItem>
              ))}
            </TextField>
            <TextField type="date" label="ETA from" value={etaFrom} onChange={(e) => setEtaFrom(e.target.value)} sx={{ width: 160 }} slotProps={{ inputLabel: { shrink: true } }} />
            <TextField type="date" label="ETA to" value={etaTo} onChange={(e) => setEtaTo(e.target.value)} sx={{ width: 160 }} slotProps={{ inputLabel: { shrink: true } }} />
            {filtered && (
              <Button
                size="small"
                color="inherit"
                startIcon={<FilterAltOffOutlinedIcon />}
                onClick={() => {
                  setStatus('');
                  setCommodity('');
                  setEtaFrom('');
                  setEtaTo('');
                }}
              >
                Clear
              </Button>
            )}
          </>
        }
      />
    </>
  );
}
