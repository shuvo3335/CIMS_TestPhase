import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import PageHeader from '@/components/PageHeader';
import DataGrid, { numCol, dateCol } from '@/components/DataGrid';
import { StatusChip } from '@/components/Common';
import { contractHooks } from '@/hooks/useApi';
import { labelOf, PACKAGING } from '@/utils/constants';
import Can from '@/components/Can';
import { useCan } from '@/store/authStore';

export default function ContractListPage() {
  const navigate = useNavigate();
  const can = useCan();
  const { data = [], isLoading } = contractHooks.useList();
  const remove = contractHooks.useRemove();

  const columns = useMemo(
    () => [
      { field: 'contractNo', headerName: 'Contract No', pinned: 'left', minWidth: 170 },
      dateCol('date', 'Date'),
      { field: 'buyer', headerName: 'Buyer', minWidth: 160 },
      { field: 'seller', headerName: 'Seller', minWidth: 180 },
      { field: 'commodity', headerName: 'Commodity', minWidth: 180 },
      { field: 'origin', headerName: 'Origin' },
      { field: 'incoterms', headerName: 'Incoterms', maxWidth: 120 },
      { field: 'tolerance', headerName: 'Tolerance', maxWidth: 120, valueFormatter: (p) => (p.value == null || p.value === '' ? '' : `${p.value}%`) },
      numCol('totalQty', 'Total Qty'),
      { field: 'unit', headerName: 'Unit', maxWidth: 90 },
      numCol('unitPrice', 'Unit Price'),
      numCol('totalPrice', 'Total Price', { minWidth: 140 }),
      { field: 'currency', headerName: 'Cur.', maxWidth: 90 },
      { field: 'packaging', headerName: 'Packaging', valueFormatter: (p) => labelOf(PACKAGING, p.value) },
      dateCol('shipmentFrom', 'Shipment From'),
      dateCol('shipmentTo', 'Shipment To'),
      { field: 'piNo', headerName: 'PI No', valueFormatter: (p) => p.value || 'Not opened' },
      { field: 'vesselName', headerName: 'Vessel', valueFormatter: (p) => p.value || '—' },
      { field: 'status', headerName: 'Status', maxWidth: 130, cellRenderer: (p) => <StatusChip value={p.value} label={p.value === 'ACTIVE' ? 'Active' : 'Closed'} /> },
    ],
    [],
  );

  return (
    <>
      <PageHeader
        title="Sales Contract List"
        subtitle="All sales contracts entered in the system"
        breadcrumbs={[{ label: 'Sales Contract' }, { label: 'List' }]}
        actions={
          <Can module="sales_contract" action="create"><Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/contracts/new')}>
            New Contract
          </Button></Can>
        }
      />
      <DataGrid
        rowData={data}
        loading={isLoading}
        columnDefs={columns}
        exportFileName="sales-contracts"
        emptyText="No sales contracts yet"
        onView={(r) => navigate(`/contracts/${r.id}`)}
        onEdit={can('sales_contract', 'edit') ? (r) => navigate(`/contracts/${r.id}/edit`) : undefined}
        onDelete={can('sales_contract', 'delete') ? (r) => remove.mutateAsync(r.id) : undefined}
        deleteMessage={(r) => `Sales contract ${r.contractNo} and its attachments will be permanently deleted.`}
      />
    </>
  );
}
