import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import PageHeader from '@/components/PageHeader';
import DataGrid, { numCol, dateCol } from '@/components/DataGrid';
import { StatusChip } from '@/components/Common';
import { lcHooks } from '@/hooks/useApi';
import { latestLcValue, lcStatus } from '@/utils/calc';
import { labelOf, LC_TYPES } from '@/utils/constants';

const STATUS_LABEL = { ACTIVE: 'Active', EXPIRING: 'Expiring soon', EXPIRED: 'Expired' };

export default function LCListPage() {
  const navigate = useNavigate();
  const { data = [], isLoading } = lcHooks.useList();
  const remove = lcHooks.useRemove();

  const rows = useMemo(
    () => data.map((lc) => ({ ...lc, amendmentCount: lc.amendments?.length ?? 0, latestValue: latestLcValue(lc), status: lcStatus(lc) })),
    [data],
  );

  const columns = useMemo(
    () => [
      { field: 'lcNo', headerName: 'LC No', pinned: 'left', minWidth: 160 },
      { field: 'contractNo', headerName: 'Contract No', minWidth: 160 },
      { field: 'spiNo', headerName: 'SPI No', minWidth: 170 },
      { field: 'commodity', headerName: 'Commodity', minWidth: 160 },
      { field: 'lcType', headerName: 'LC Type', valueFormatter: (p) => labelOf(LC_TYPES, p.value) },
      { field: 'paymentDurationDays', headerName: 'Payment (days)', type: 'rightAligned', filter: 'agNumberColumnFilter', valueFormatter: (p) => p.value ?? '—' },
      { field: 'bank', headerName: 'Bank', minWidth: 170 },
      dateCol('issueDate', 'Issue Date'),
      dateCol('expiryDate', 'Expiry Date'),
      numCol('doneQty', 'LC Done Qty'),
      numCol('amount', 'LC Amount', { minWidth: 140 }),
      { field: 'currency', headerName: 'Cur.', maxWidth: 85 },
      { field: 'amendmentCount', headerName: 'Amendments', type: 'rightAligned', maxWidth: 135, filter: 'agNumberColumnFilter' },
      numCol('latestValue', 'Current Value', { minWidth: 140 }),
      { field: 'insuranceCoverNoteNo', headerName: 'Insurance Cover Note', minWidth: 170 },
      { field: 'status', headerName: 'Status', minWidth: 140, cellRenderer: (p) => <StatusChip value={p.value} label={STATUS_LABEL[p.value]} />, valueFormatter: (p) => STATUS_LABEL[p.value] },
    ],
    [],
  );

  return (
    <>
      <PageHeader
        title="LC List"
        subtitle="All letters of credit, one per SPI, with amendment history"
        breadcrumbs={[{ label: 'Letter of Credit' }, { label: 'List' }]}
        actions={
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/lc/new')}>
            Open LC
          </Button>
        }
      />
      <DataGrid
        rowData={rows}
        loading={isLoading}
        columnDefs={columns}
        exportFileName="lc-list"
        emptyText="No LCs yet"
        onView={(r) => navigate(`/lc/${r.id}`)}
        onEdit={(r) => navigate(`/lc/${r.id}/edit`)}
        onDelete={(r) => remove.mutateAsync(r.id)}
        deleteMessage={(r) => `LC ${r.lcNo} (SPI ${r.spiNo}) and its amendments will be permanently deleted.`}
      />
    </>
  );
}
