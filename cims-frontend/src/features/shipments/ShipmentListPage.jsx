import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import PageHeader from '@/components/PageHeader';
import DataGrid, { numCol, dateCol } from '@/components/DataGrid';
import { StatusChip } from '@/components/Common';
import { shipmentHooks } from '@/hooks/useApi';
import Can from '@/components/Can';
import { useCan } from '@/store/authStore';

export default function ShipmentListPage() {
  const navigate = useNavigate();
  const can = useCan();
  const { data = [], isLoading } = shipmentHooks.useList();
  const remove = shipmentHooks.useRemove();

  const columns = useMemo(
    () => [
      { field: 'vesselName', headerName: 'Vessel Name', pinned: 'left', minWidth: 170 },
      { field: 'vesselType', headerName: 'Vessel Type' },
      { field: 'imoNo', headerName: 'IMO No', maxWidth: 120 },
      { field: 'flag', headerName: 'Flag' },
      { field: 'portOfRegistry', headerName: 'Port of Registry', minWidth: 150 },
      { field: 'holdHatch', headerName: 'Hold/Hatch', maxWidth: 120 },
      { field: 'status', headerName: 'Vessel Status', minWidth: 160, cellRenderer: (p) => <StatusChip value={p.value} /> },
      dateCol('etc', 'ETC'),
      dateCol('spd', 'Shipping Date'),
      dateCol('sld', 'Sailing Date'),
      dateCol('eta', 'ETA'),
      { field: 'contractNos', headerName: 'Contracts', minWidth: 200, valueFormatter: (p) => p.value?.join(', ') },
      { field: 'commodities', headerName: 'Commodity', minWidth: 180, valueFormatter: (p) => p.value?.join(', ') },
      numCol('totalBlQty', 'Total BL Qty'),
      numCol('demurrageRate', 'Demurrage Rate'),
    ],
    [],
  );

  return (
    <>
      <PageHeader
        title="Shipment List"
        subtitle="All vessels with the contracts they carry"
        breadcrumbs={[{ label: 'Shipment' }, { label: 'List' }]}
        actions={
          <Can module="shipment" action="create"><Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/shipments/new')}>
            New Shipment
          </Button></Can>
        }
      />
      <DataGrid
        rowData={data}
        loading={isLoading}
        columnDefs={columns}
        exportFileName="shipments"
        emptyText="No shipments yet"
        onView={(r) => navigate(`/shipments/${r.id}`)}
        onEdit={can('shipment', 'edit') ? (r) => navigate(`/shipments/${r.id}/edit`) : undefined}
        onDelete={can('shipment', 'delete') ? (r) => remove.mutateAsync(r.id) : undefined}
        deleteMessage={(r) => `Shipment for ${r.vesselName} and its BL / CI records will be permanently deleted. The contracts will become unassigned.`}
      />
    </>
  );
}
