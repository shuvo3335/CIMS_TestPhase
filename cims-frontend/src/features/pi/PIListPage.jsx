import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import PageHeader from '@/components/PageHeader';
import DataGrid, { numCol, dateCol } from '@/components/DataGrid';
import { StatusChip } from '@/components/Common';
import { piHooks } from '@/hooks/useApi';
import { labelOf, LC_TYPES } from '@/utils/constants';

/** One row per SPI so users can see every split; actions act on the parent PI. */
export default function PIListPage() {
  const navigate = useNavigate();
  const { data = [], isLoading } = piHooks.useList();
  const remove = piHooks.useRemove();

  const rows = useMemo(
    () =>
      data.flatMap((pi) =>
        pi.spis.map((s, i) => ({
          rowId: `${pi.id}:${s.id}`,
          id: pi.id,
          piNo: pi.piNo,
          contractNo: pi.contractNo,
          commodity: pi.commodity,
          seller: pi.seller,
          spiSeq: `${i + 1} / ${pi.spis.length}`,
          spiNo: s.spiNo,
          spiQty: s.qty,
          unit: pi.unit,
          unitPrice: pi.unitPrice,
          amount: s.amount,
          currency: pi.currency,
          lcType: pi.lcType,
          spiDate: pi.spiDate,
          spiValidity: pi.spiValidity,
          pol: pi.pol,
          pod: pi.pod,
          lcNo: s.lcNo,
          lcCount: pi.lcCount,
        })),
      ),
    [data],
  );

  const columns = useMemo(
    () => [
      { field: 'contractNo', headerName: 'Contract No', pinned: 'left', minWidth: 170 },
      { field: 'piNo', headerName: 'PI No', minWidth: 160 },
      { field: 'spiNo', headerName: 'SPI No', minWidth: 180 },
      { field: 'spiSeq', headerName: 'SPI #', maxWidth: 100 },
      { field: 'commodity', headerName: 'Commodity', minWidth: 170 },
      numCol('spiQty', 'SPI Qty'),
      { field: 'unit', headerName: 'Unit', maxWidth: 85 },
      numCol('unitPrice', 'Unit Price'),
      numCol('amount', 'SPI Amount', { minWidth: 140 }),
      { field: 'currency', headerName: 'Cur.', maxWidth: 85 },
      { field: 'lcType', headerName: 'LC Type', valueFormatter: (p) => labelOf(LC_TYPES, p.value) },
      dateCol('spiDate', 'SPI Date'),
      dateCol('spiValidity', 'Validity'),
      { field: 'pol', headerName: 'PoL', minWidth: 160 },
      { field: 'pod', headerName: 'PoD', minWidth: 160 },
      {
        field: 'lcNo',
        headerName: 'LC',
        minWidth: 150,
        cellRenderer: (p) => (p.value ? p.value : <StatusChip value="PENDING" label="LC pending" />),
      },
    ],
    [],
  );

  return (
    <>
      <PageHeader
        title="PI List"
        subtitle="Every SPI under every PI. View, Edit and Delete apply to the whole PI."
        breadcrumbs={[{ label: 'Proforma Invoice' }, { label: 'List' }]}
        actions={
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/pi/new')}>
            New PI
          </Button>
        }
      />
      <DataGrid
        rowData={rows}
        loading={isLoading}
        columnDefs={columns}
        getRowId={(p) => p.data.rowId}
        exportFileName="pi-spi-list"
        emptyText="No PIs yet"
        onView={(r) => navigate(`/pi/${r.id}`)}
        onEdit={(r) => navigate(`/pi/${r.id}/edit`)}
        onDelete={(r) => remove.mutateAsync(r.id)}
        deleteMessage={(r) => `PI ${r.piNo} and all of its SPIs will be permanently deleted.`}
      />
    </>
  );
}
